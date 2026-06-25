import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const checks = [];

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function pass(name) {
  checks.push({ name, ok: true });
  console.log(`PASS ${name}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
}

function expect(name, condition, detail = '') {
  if (condition) pass(name);
  else fail(name, detail);
}

function expectContains(name, file, pattern) {
  expect(name, pattern.test(file), `missing ${pattern}`);
}

function expectNotContains(name, file, pattern) {
  expect(name, !pattern.test(file), `unexpected ${pattern}`);
}

function run(name, command, args, cwd = process.cwd()) {
  try {
    execFileSync(command, args, { cwd, stdio: 'pipe', encoding: 'utf8' });
    pass(name);
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}`.trim();
    fail(name, output.split('\n').slice(-12).join('\n'));
  }
}

const app = read('src/App.jsx');
const rules = read('firestore.rules');
const functionsIndex = read('functions/index.js');
const agentApi = read('src/lib/agentAPI.js');
const intakeCanvas = read('src/components/canvas/IntakeCanvas.jsx');
const signaturePortal = read('src/pages/ClientSignaturePortal.jsx');
const clientPortal = read('src/pages/ClientPortal.jsx');
const mattersPage = read('src/pages/Matters.jsx');
const service = read('src/lib/lawFirmOSService.js');
const firebaseJson = read('firebase.json');
const indexes = read('firestore.indexes.json');

for (const [name, pattern] of [
  ['route exists /dashboard/matters', /<Route path="matters" element=\{<Matters \/>/],
  ['route exists /dashboard/matters/:matterId', /<Route path="matters\/:matterId" element=\{<MatterWorkspace \/>/],
  ['route exists /dashboard/client-portal', /<Route path="client-portal" element=\{<ClientPortal \/>/],
  ['route exists /dashboard/crm', /<Route path="crm" element=\{<ClientCRM \/>/],
  ['route exists /dashboard/billing', /<Route path="billing" element=\{<BillingUsage \/>/],
  ['route exists /dashboard/security', /<Route path="security" element=\{<SecurityAudit \/>/],
  ['route exists /signature/:token', /<Route path="\/signature\/:token" element=\{<ClientSignaturePortal \/>/],
]) {
  expect(name, pattern.test(app));
}

expectContains('rules include matter access helper', rules, /function canAccessMatterData/);
expectContains('rules include assignment helper', rules, /function hasMatterAssignment/);
expectContains('rules protect trust ledgers', rules, /match \/trustLedgers\/\{ledgerId\}/);
expectContains('rules protect conflict checks', rules, /match \/conflictChecks\/\{checkId\}/);
expectContains('rules protect drafts', rules, /match \/drafts\/\{draftId\}/);
expectContains('rules protect document bundles', rules, /match \/documentBundles\/\{bundleId\}/);
expectContains('rules protect court forms', rules, /match \/courtForms\/\{formId\}/);
expectContains('rules protect signature requests', rules, /match \/signatureRequests\/\{requestId\}/);
expectContains('rules deny client conflict check writes', rules, /match \/conflictChecks\/\{checkId\}[\s\S]*allow create: if false/);
expectContains('rules allow assigned legal secretary access', rules, /isPracticeDivision\(\)[\s\S]*secretary/);
expectNotContains('rules no public writes', rules, /allow\s+(write|create|update|delete):\s+if\s+true/);
expectNotContains('published content writes are not public', rules, /published_content[\s\S]{0,120}allow write: if true/);
expectNotContains('telemetry writes are authenticated', rules, /_telemetryLogs[\s\S]{0,120}allow create: if true/);
expectNotContains('security writes are authenticated', rules, /_securityLogs[\s\S]{0,120}allow create: if true/);

expectContains('conflict function exported', functionsIndex, /exports\.runConflictCheck/);
expectContains('signature read function exported', functionsIndex, /exports\.getSignatureRequest/);
expectContains('signature sign function exported', functionsIndex, /exports\.signSignatureRequest/);
expectContains('functions verify Firebase ID tokens', functionsIndex, /verifyIdToken/);
expectContains('signature lookup uses collection group', functionsIndex, /collectionGroup\('signatureRequests'\)/);
expectContains('signature token removed after signing', functionsIndex, /token:\s*admin\.firestore\.FieldValue\.delete\(\)/);
expectContains('signature tokenHash collection group index exists', indexes, /"collectionGroup": "signatureRequests"[\s\S]*"fieldPath": "tokenHash"[\s\S]*"queryScope": "COLLECTION_GROUP"/);
expectContains('legacy signature token collection group index exists', indexes, /"collectionGroup": "signatureRequests"[\s\S]*"fieldPath": "token"[\s\S]*"queryScope": "COLLECTION_GROUP"/);
expectContains('hosting rewrites conflict check API', firebaseJson, /"source": "\/api\/runConflictCheck"[\s\S]*"function": "runConflictCheck"/);
expectContains('hosting rewrites signature read API', firebaseJson, /"source": "\/api\/getSignatureRequest"[\s\S]*"function": "getSignatureRequest"/);
expectContains('hosting rewrites signature sign API', firebaseJson, /"source": "\/api\/signSignatureRequest"[\s\S]*"function": "signSignatureRequest"/);

expectContains('law OS service sends auth token', service, /Authorization:\s*`Bearer \$\{token\}`/);
expectContains('law OS service exposes conflict check', service, /export async function runConflictCheck/);
expectContains('law OS service exposes signature signing', service, /export async function signSignatureRequest/);

expectContains('agent API limits matter overview by assignment', agentApi, /array-contains', assignedEmail/);
expectContains('agent API blocks unauthorized matter context', agentApi, /ETHICAL_WALL_BLOCK/);
expectContains('agent API recognizes full-access roles', agentApi, /FULL_MATTER_ACCESS_ROLES/);
expectNotContains('agent API no all-matter query for every role', agentApi, /getDocs\(query\(collection\(db, 'firms', firmId, 'matters'\), where\('status', '==', 'Active'\)\)\);\s*activeMattersList = mattersSnap\.docs\.map\(d => d\.data\(\)\)/);

expectContains('intake uses server conflict check', intakeCanvas, /runConflictCheck/);
expectNotContains('intake does not randomize conflicts', intakeCanvas, /Math\.random\(\)\s*>\s*0\.9/);
expectContains('signature portal uses server read', signaturePortal, /getSignatureRequest/);
expectContains('signature portal uses server sign', signaturePortal, /signSignatureRequest/);
expectNotContains('signature portal no client collectionGroup', signaturePortal, /collectionGroup/);
expectNotContains('signature portal no client updateDoc', signaturePortal, /updateDoc/);
expectNotContains('client portal no uid firm fallback', clientPortal, /firm\?\.id \|\| user\?\.uid/);
expectContains('matter creation records assigned UIDs', mattersPage, /assignedUserIds/);
expectContains('matter creation records assigned emails', mattersPage, /assignedEmails/);

run('functions syntax check', process.execPath, ['--check', 'functions/index.js']);
run('law OS script syntax check', process.execPath, ['--check', 'scripts/law_os_readiness.mjs']);
run('production build', process.execPath, ['node_modules/vite/bin/vite.js', 'build']);

const failed = checks.filter(check => !check.ok);
if (failed.length > 0) {
  console.error(`\nLaw firm OS readiness failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nLaw firm OS readiness loop passed: ${checks.length}/${checks.length} checks green.`);
