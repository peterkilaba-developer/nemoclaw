const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const logger = require('firebase-functions/logger');

// Fallback to ensure we have the db properly
let firestore;
try {
  firestore = getFirestore();
} catch (_e) {
  // Ignore
}

async function processBulkGeneration() {
    if (!firestore) firestore = getFirestore();
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (!nvidiaKey) {
      logger.error('NVIDIA_API_KEY missing - cannot run bulk AIO generation');
      return;
    }

    logger.info('Starting daily bulk AIO generation (20 Posts, 20 FAQs)');

    async function getDynamicTopics(prompt, count) {
      try {
        const heliconeKey = process.env.HELICONE_API_KEY;
        const targetUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
        const url = heliconeKey ? 'https://gateway.helicone.ai/v1/chat/completions' : targetUrl;
        
        const headers = {
          Authorization: `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json'
        };

        if (heliconeKey) {
          headers['Helicone-Auth'] = `Bearer ${heliconeKey}`;
          headers['Helicone-Target-Url'] = 'https://integrate.api.nvidia.com';
        }

        const res = await axios.post(
          url,
          {
            model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
            messages: [{ role: 'system', content: "You output only a raw JSON array of strings." }, { role: 'user', content: prompt }],
            temperature: 0.9,
            max_tokens: 1000
          },
          { headers }
        );
        let content = res.data?.choices?.[0]?.message?.content?.trim() || '[]';
        // Improved JSON extraction
        const match = content.match(/\[([\s\S]*?)\]/);
        if (match) content = match[0];
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed.slice(0, count) : [];
      } catch (err) {
        logger.error('Failed to generate dynamic topics', err.message);
        return [];
      }
    }

    const blogTopics = await getDynamicTopics('Generate 1 unique, highly professional legal tech blog post title specifically targeting the tangible BUSINESS RESULTS and FINANCIAL ROI a law firm achieves by deploying a Human-in-the-Loop Agentic OS. Do not focus on the AI technology itself, but on the outcomes for the firm. Return JSON array of strings ONLY.', 1);
    const faqTopics = await getDynamicTopics('Generate 1 unique, highly practical FAQ question that a Law Firm Managing Partner would ask regarding the real-world operational impact and business results of upgrading to a Human-in-the-Loop Agentic OS. Do not focus on the underlying AI tech. Return JSON array of strings ONLY.', 1);

    if (blogTopics.length === 0 && faqTopics.length === 0) {
      logger.error('Failed to fetch dynamic topics. Aborting daily generation to prevent empty dumps.');
      return;
    }

    async function generateContent(type, topic) {
      let systemPrompt = "";
      let userPrompt = "";

      if (type === 'blog') {
        systemPrompt = "You are NemoC LAW AI Expert Network. Write a robust, business-focused 4-paragraph thought-leadership blog post for law firms. CRITICAL: Focus exclusively on the operational results, financial ROI, and competitive advantages of deploying the Human-in-the-Loop (HITL) Agentic OS. Do NOT dwell on the underlying AI technology or LLMs. Emphasize how attorneys are upgraded to drive more revenue. MUST USE these precise phrases: 'Agentic OS', 'Agentic HITL', 'Born Agentic', and 'Agentic as a Service (AgaaS)'. Use markdown headers. NO EMOJIS ALLOWED.";
        userPrompt = `Write a deep-dive blog post on: ${topic}`;
      } else {
        systemPrompt = "You are NemoC LAW AI Expert Network. Answer the following question for a Law Firm Managing Partner in 3 paragraphs. CRITICAL: Focus strictly on business outcomes, operational efficiency, and tangible results of the HITL Agentic OS. Do not get bogged down in the AI technology itself. MUST USE these precise phrases: 'Agentic OS', 'Agentic HITL', 'Born Agentic', and 'Agentic as a Service (AgaaS)'. NO EMOJIS ALLOWED.";
        userPrompt = `Question: ${topic}`;
      }

      try {
        const heliconeKey = process.env.HELICONE_API_KEY;
        const targetUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
        const url = heliconeKey ? 'https://gateway.helicone.ai/v1/chat/completions' : targetUrl;
        
        const headers = {
          Authorization: `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json'
        };

        if (heliconeKey) {
          headers['Helicone-Auth'] = `Bearer ${heliconeKey}`;
          headers['Helicone-Target-Url'] = 'https://integrate.api.nvidia.com';
        }

        const res = await axios.post(
          url,
          {
            model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            temperature: 0.7,
            max_tokens: 800
          },
          { headers }
        );
        return res.data?.choices?.[0]?.message?.content?.trim();
      } catch (err) {
        logger.error(`Generation failed for ${type} - ${topic}`, err.message);
        return null;
      }
    }

    // Process in batches of 4 to respect rate limits
    const batchSize = 4;
    
    // 1. Generate Blogs
    for (let i = 0; i < blogTopics.length; i += batchSize) {
      const batch = blogTopics.slice(i, i + batchSize);
      await Promise.all(batch.map(async (topic) => {
        const content = await generateContent('blog', topic);
        if (content) {
          // ensure slug uniqueness by appending date string
          const dateStr = new Date().toISOString().split('T')[0];
          const baseSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40);
          const slug = `${baseSlug}-${dateStr}-${Math.floor(Math.random() * 1000)}`;
          await firestore.collection('_publishedPosts').doc(slug).set({
            title: topic,
            description: content.substring(0, 150) + "...",
            content: content,
            slug: slug,
            status: "published",
            publishedAt: FieldValue.serverTimestamp()
          });
        }
      }));
      await new Promise(r => setTimeout(r, 2000)); // sleep 2s between batches
    }

    // 2. Generate FAQs
    for (let i = 0; i < faqTopics.length; i += batchSize) {
      const batch = faqTopics.slice(i, i + batchSize);
      await Promise.all(batch.map(async (topic) => {
        const content = await generateContent('faq', topic);
        if (content) {
          const dateStr = new Date().toISOString().split('T')[0];
          const baseSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40);
          const slug = `${baseSlug}-${dateStr}-${Math.floor(Math.random() * 1000)}`;
          await firestore.collection('_publicQnA').doc(slug).set({
            question: topic,
            answer: content,
            slug: slug,
            category: "Platform Economics",
            createdAt: FieldValue.serverTimestamp()
          });
        }
      }));
      await new Promise(r => setTimeout(r, 2000));
    }

    // 3. Drop excerpts into _linkedinQueue for X/LinkedIn reuse
    try {
       if (blogTopics.length > 0) {
           await firestore.collection('_linkedinQueue').add({
               status: 'queued',
               text: `New thought leadership post:\n\n${blogTopics[0]}\n\nRead the full breakdown on our insights page. #HITL #AgenticAI #LegalTech`,
               createdAt: FieldValue.serverTimestamp()
           });
       }

       if (faqTopics.length > 0) {
           await firestore.collection('_linkedinQueue').add({
               status: 'queued',
               text: `Most asked question of the week:\n\nQ: ${faqTopics[0]}\n\nRead more in our answers knowledge base. #NemoC LAW AI #OpenClaw`,
               createdAt: FieldValue.serverTimestamp()
           });
       }
    } catch(err) {
       logger.error('Failed to enqueue AIO outputs to linkedin queue', err);
    }

    logger.info('✅ Successfully finished bulk AIO content generation');
}

exports.aioBulkContentCron = onSchedule(
  {
    schedule: '0 * * * *',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (_event) => {
    await processBulkGeneration();
  }
);
exports.processBulkGeneration = processBulkGeneration;
