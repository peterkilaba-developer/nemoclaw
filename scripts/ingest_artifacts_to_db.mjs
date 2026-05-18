import { initializeApp } from 'firebase/app';
import { getFirestore, collection, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Load env
const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && key.trim() && !key.startsWith('#')) {
    env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'nemoc-law-ai.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'nemoc-law-ai',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CONVERSATION_DIR = 'C:\\Users\\Nemo CLAW\\.gemini\\antigravity\\brain\\92696432-61f3-4674-b278-5ae6825ce351';

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  
  const yamlLines = match[1].split('\n');
  const frontmatter = {};
  yamlLines.forEach(line => {
    const split = line.split(':');
    if (split.length > 1) {
      const key = split[0].trim();
      let value = split.slice(1).join(':').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
      if (value.startsWith('[') && value.endsWith(']')) {
         value = value.substring(1, value.length - 1).split(',').map(s => s.trim().replace(/"/g, ''));
      }
      frontmatter[key] = value;
    }
  });
  return { frontmatter, body: match[2].trim() };
}

async function run() {
  const files = readdirSync(CONVERSATION_DIR);
  let ingested = 0;
  
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    // Skip internal artifacts
    if (file === 'implementation_plan.md' || file === 'task.md' || file === 'walkthrough.md' || file === 'stripe_verification.md') continue;
    if (file.startsWith('programmatic_template_')) continue; // Skip templates
    if (file === 'cmo_authority_content_plan.md') continue; // Skip internal plan

    const fullPath = join(CONVERSATION_DIR, file);
    const content = readFileSync(fullPath, 'utf8');
    const { frontmatter, body } = extractFrontmatter(content);
    
    if (!frontmatter.title) {
       console.log(`Skipping ${file}: No title found in frontmatter`);
       continue;
    }

    const slug = frontmatter.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    const postData = {
      slug,
      title: frontmatter.title,
      description: frontmatter.description || '',
      author: frontmatter.author || 'NemoC LAW AI',
      tags: frontmatter.seo_keywords || frontmatter.tags || [],
      content: body,
      status: 'published',
      publishedAt: serverTimestamp(),
    };

    console.log(`Ingesting: ${frontmatter.title} (Slug: ${slug})`);
    
    // We use setDoc with a specific slug-driven ID so we can re-run safely
    await setDoc(doc(db, 'published_content', slug), postData);
    ingested++;
  }
  
  console.log(`✅ Ingested ${ingested} SEO articles to Firestore!`);
  process.exit(0);
}

run().catch(console.error);
