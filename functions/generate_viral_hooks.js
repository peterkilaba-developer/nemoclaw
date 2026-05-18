const axios = require('axios');
const fs = require('fs');
const path = require('path');

try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
  });
} catch(e) {}

async function generateViralContent() {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) {
    console.error('Missing NVIDIA_API_KEY. Exiting.');
    return;
  }

  const systemPrompt = `You are an authoritative, thought-leading ghostwriter for NemoC LAW AI (an Agentic Operating System for Law Firms).
Your goal is to write 5 wildly engaging, thought-provoking, and "viral" short-form posts (suitable for LinkedIn and X) that cement the "Human-In-The-Loop" (HITL) model as the only future for legal tech.

CRITICAL RULES:
1. CHAMPION THE HUMAN: Always defend attorneys and paralegals. Our platform is built to give them superpowers ("Upgraded, not replaced"). DO NOT vilify associates or paralegals. 
2. ATTACK FULL AUTONOMY: The real enemy is "Fully Autonomous Legal AI" (like ChatGPT or other "black box" AIs) which causes hallucinations and malpractice. Emphasize that NemoC LAW AI uses NVIDIA NemoClaw to keep humans securely in control.
3. MAKE IT VIRAL BUT PROFESSIONAL: Attack the outdated "billable hour" model and attack "reckless AI companies trying to replace lawyers". 
4. DO NOT use hashtags in every post. Keep them raw and authentic.
5. Output ONLY a valid JSON array of strings, where each string is a separate post (under 280 characters if possible, max 500 characters).`;

  const userPrompt = "Generate 5 viral posts right now. Return JSON array only.";

  console.log("Generating viral content with NVIDIA Nemotron...");
  try {
    const res = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.9,
        max_tokens: 1500
      },
      { headers: { Authorization: `Bearer ${nvidiaKey}`, 'Content-Type': 'application/json' } }
    );

    let content = res.data?.choices?.[0]?.message?.content?.trim();
    if (content.startsWith('```json')) content = content.substring(7);
    if (content.endsWith('```')) content = content.slice(0, -3);
    
    console.log("---GENERATED_START---");
    console.log(content);
    console.log("---GENERATED_END---");
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

generateViralContent().then(() => process.exit(0));
