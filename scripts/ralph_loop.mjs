import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { spawnSync } from 'child_process';
import {
  INTERNAL_AGENT_REGISTRY,
  RALPH_REQUIRED_AGENT_COUNT,
  resolveInternalAgentId,
} from '../src/lib/internalAgentRegistry.js';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const failures = [];

function read(path) {
  return readFileSync(join(root, path), 'utf-8');
}

function check(name, pass, detail = '') {
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} ${name}${detail ? ` - ${detail}` : ''}`);
  if (!pass) failures.push({ name, detail });
}

function walk(dir, files = []) {
  const skip = new Set(['.git', 'node_modules', 'dist', '.firebase']);
  for (const item of readdirSync(dir)) {
    if (skip.has(item)) continue;
    const path = join(dir, item);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
    } else {
      files.push(path);
    }
  }
  return files;
}

function run(name, command, args, options = {}) {
  console.log(`RUN ${name}: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf-8',
    stdio: options.stdio || 'pipe',
  });

  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  check(name, result.status === 0, result.status === 0 ? '' : `exit ${result.status}`);
}

console.log('\nRALPH loop: Repair, Audit, Loop, Prove, Harden\n');

const agentIds = INTERNAL_AGENT_REGISTRY.map(agent => agent.id);
const uniqueAgentIds = new Set(agentIds);
check('canonical 13-agent registry', INTERNAL_AGENT_REGISTRY.length === RALPH_REQUIRED_AGENT_COUNT, `${INTERNAL_AGENT_REGISTRY.length}/${RALPH_REQUIRED_AGENT_COUNT}`);
check('agent ids are unique', uniqueAgentIds.size === INTERNAL_AGENT_REGISTRY.length);
check('legacy SDR alias resolves to C.R.A.', resolveInternalAgentId('sdr') === 'cra');
check('legacy marketing alias resolves to C.M.A.', resolveInternalAgentId('marketing') === 'cma');
check('legacy sandbox alias resolves to C.I.A.', resolveInternalAgentId('sandbox-provisioner') === 'cia');

check('AdminDashboard uses canonical registry', read('src/pages/AdminDashboard.jsx').includes('INTERNAL_AGENT_REGISTRY'));
check('internalAgentAPI uses canonical registry', read('src/lib/internalAgentAPI.js').includes('./internalAgentRegistry'));
check('seed script uses canonical registry', read('scripts/seedInternalAgents.mjs').includes('INTERNAL_AGENT_REGISTRY'));
check('local daemon uses canonical registry', read('scripts/activate_platform_agents.mjs').includes('INTERNAL_AGENT_REGISTRY'));
check('local daemon uses rules-compatible daemon id', read('scripts/activate_platform_agents.mjs').includes('nemoclaw-system-daemon-xyz'));
check('prospect service exports runSDRBlitz', /export\s+async\s+function\s+runSDRBlitz/.test(read('src/lib/prospectService.js')));

const sourceFiles = walk(join(root, 'src')).filter(path => /\.(js|jsx|ts|tsx)$/.test(path));
const snapshotTypos = sourceFiles.filter(path => readFileSync(path, 'utf-8').includes('snap.doc.map'));
check('no Firestore snap.doc.map typo remains', snapshotTypos.length === 0, snapshotTypos.map(path => relative(root, path)).join(', '));

const frontendSecretRefs = ['VITE_NVIDIA_API_KEY', 'VITE_HUNTER_API_KEY', 'VITE_APOLLO_API_KEY', 'VITE_BLAND_API_KEY'];
const frontendFiles = [...sourceFiles, join(root, 'vite.config.js')];
const frontendSecretHits = [];
for (const file of frontendFiles) {
  const content = readFileSync(file, 'utf-8');
  for (const ref of frontendSecretRefs) {
    if (content.includes(ref)) frontendSecretHits.push(`${relative(root, file)}:${ref}`);
  }
}
check('frontend has no provider-secret env references', frontendSecretHits.length === 0, frontendSecretHits.join(', '));

const firebaseJson = read('firebase.json');
for (const endpoint of [
  'nvidiaInference',
  'scrapeWebsite',
  'forceSdrAgentCron',
  'forceAgaasOrchestrator',
  'forceForgeHealing',
  'enrichProspectEmail',
  'placeBlandCall',
  'getBlandCallStatus',
]) {
  check(`hosting rewrite for ${endpoint}`, firebaseJson.includes(`"function": "${endpoint}"`));
}

const functionsIndex = read('functions/index.js');
const forceEndpointNames = [
  'forceAgaasOrchestrator',
  'forceBulkGeneration',
  'forceLinkedInCron',
  'forceFlushResearched',
  'forceForgeHealing',
  'forceSdrAgentCron',
];
for (const endpoint of forceEndpointNames) {
  const pattern = new RegExp(`exports\\.${endpoint}[\\s\\S]{0,300}_requireAdminPost`);
  check(`${endpoint} requires admin POST auth`, pattern.test(functionsIndex));
}

const embeddedSecretPatterns = [
  /nvapi-[A-Za-z0-9_-]{20,}/,
  /SG\.[A-Za-z0-9_-]{10,}/,
  /AIzaSy[A-Za-z0-9_-]{20,}/,
  /VITE_HUNTER_API_KEY\s*\|\|\s*['"]/,
  /VITE_APOLLO_API_KEY\s*\|\|\s*['"]/,
  /VITE_GOOGLE_MAPS_API_KEY\s*\|\|\s*['"]/,
];
const embeddedHits = embeddedSecretPatterns
  .filter(pattern => pattern.test(functionsIndex))
  .map(pattern => pattern.toString());
check('functions/index.js has no embedded vendor secret fallbacks', embeddedHits.length === 0, embeddedHits.join(', '));

run('functions/index.js syntax', 'node', ['--check', 'functions/index.js']);
if (existsSync(join(root, 'functions/twilio.js'))) {
  run('functions/twilio.js syntax', 'node', ['--check', 'functions/twilio.js']);
}
if (existsSync(join(root, 'functions/aioBulk.js'))) {
  run('functions/aioBulk.js syntax', 'node', ['--check', 'functions/aioBulk.js']);
}
run('production build', 'node', ['node_modules/vite/bin/vite.js', 'build'], { stdio: 'pipe' });

if (failures.length > 0) {
  console.error(`\nRALPH loop failed ${failures.length} check(s).`);
  process.exit(1);
}

console.log('\nRALPH loop passed. The local autonomy wiring is internally consistent.');
