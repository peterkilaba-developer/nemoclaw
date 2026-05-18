import fs from 'fs';
import path from 'path';

const outPath = path.join(process.cwd(), '..', 'src', 'data', 'qna_seed.json');

// We need NVIDIA API Key
// Read NVIDIA API Key manually from .env
const envPath = path.join(process.cwd(), '.env');
let NVIDIA_KEY = '';
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/NVIDIA_API_KEY=(.*)/);
  if (match) NVIDIA_KEY = match[1].trim();
} catch (e) {
  console.log("Could not read .env");
}

const topics = [
  "How does NVIDIA NemoClaw improve low-latency deterministic outputs in legal AI workflows?",
  "What is the difference between openclaw and openshell in the context of legal data sandboxing?",
  "Why is fully autonomous AI considered a malpractice risk in law firms compared to HITL architecture?",
  "How does a Born Agentic OS eliminate the need for traditional legal practice management software?",
  "What is the role of an Agentic Predictive Ledger in law firm financial forecasting?"
];

async function generateQnA() {
  console.log("Starting bulk QnA Gen...");
  const results = [];
  for (const topic of topics) {
    try {
      console.log(`Generating QnA for: ${topic}`);
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NVIDIA_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
          messages: [
            {
              role: 'system',
              content: 'You are NemoC LAW AI Expert Network. Answer the following technical question about Legal AI architecture. Emphasize NemoC LAW AI, NVIDIA NemoClaw, openclaw, openshell, and HITL (Human-in-the-Loop) where applicable. Provide a highly authoritative, technical 3-paragraph answer. Use Markdown bullet points if needed. Do not use conversational filler.'
            },
            {
              role: 'user',
              content: topic
            }
          ],
          temperature: 0.6,
          max_tokens: 800
        })
      });

      if (!res.ok) {
         console.error(`API Error: ${res.statusText}`);
         continue;
      }
      const data = await res.json();
      const answer = data?.choices?.[0]?.message?.content;
      if (!answer) throw new Error("No content generated");

      const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').substring(0, 50);

      results.push({
        id: slug,
        slug,
        question: topic,
        answer: answer.trim(),
        category: topic.includes('NemoC LAW AI') || topic.includes('openclaw') ? 'Architecture & Infrastructure' : 'Agentic HITL Strategy'
      });

      console.log(`✅ Saved: ${slug}`);
      
      // Wait 1 second to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`❌ Failed on topic: ${topic}`, err.message);
    }
  }
  
  const targetDir = path.dirname(outPath);
  if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log("Finished generating 5 foundational QnAs to src/data/qna_seed.json!");
}

generateQnA();
