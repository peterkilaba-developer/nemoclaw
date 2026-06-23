import { collection, doc, getDocs, limit, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { NEMOCLAW_ENDPOINT, NEMOCLAW_MODEL_ID } from './nemoclawConfig';

async function callSniperInference(messages, maxTokens = 500) {
  const res = await fetch(NEMOCLAW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: NEMOCLAW_MODEL_ID,
      messages,
      max_tokens: maxTokens,
      temperature: 0.5,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Sniper inference failed (${res.status}).`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Sniper inference returned no assistant content.');
  return content.replace(/```json/g, '').replace(/```/g, '').trim();
}

export async function analyzeProspect(prospectData, objective = 'contradict') {
  const objectivePrompt = objective === 'contradict'
    ? 'A concise, firm but professional comment that challenges the premise and points back to human-in-the-loop legal AI risk controls.'
    : 'A concise, supportive comment that adds a human-in-the-loop legal AI perspective without overstating claims.';

  const systemPrompt = `You are the Chief Marketing Agent for NemoC LAW AI.
Use only the target prospect data supplied by the user.
Do not invent employment history, recent posts, firm facts, metrics, client names, or platform activity.

OUTPUT A JSON OBJECT EXACTLY LIKE THIS:
{
  "connectionDraft": "A 2-sentence connection request grounded only in the supplied prospect data.",
  "sniperComment": "${objectivePrompt}"
}

Return raw JSON only.`;

  const content = await callSniperInference([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prospectData },
  ], 320);

  return JSON.parse(content);
}

export async function analyzeInboundComment(originalPost, commentText, platform) {
  const systemPrompt = `You are the Inbound Defense Agent for NemoC LAW AI.
Analyze the supplied inbound engagement from ${platform}.
Use only the supplied original post and comment. Do not invent context or infer private motives.

OUTPUT A JSON OBJECT EXACTLY LIKE THIS:
{
  "sentiment": "Supportive" or "Antagonistic" or "Unclear",
  "recommendedStrategy": "Amplify" or "Contradict" or "Clarify",
  "draftReply": "A professional draft reply under 280 characters."
}

Return raw JSON only.`;

  const content = await callSniperInference([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `ORIGINAL POST:\n${originalPost}\n\nCOMMENT:\n${commentText}` },
  ], 500);

  return JSON.parse(content);
}

export async function fetchInboundEngagements() {
  const q = query(
    collection(db, '_socialEngagements'),
    where('status', '==', 'pending'),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || Date.parse(a.timestamp || '') || 0;
      const bTime = b.timestamp?.toMillis?.() || Date.parse(b.timestamp || '') || 0;
      return bTime - aTime;
    });
}

export async function markInboundEngagementReady(engagementId, draftedReply) {
  if (!engagementId) throw new Error('Missing engagement id.');
  await updateDoc(doc(db, '_socialEngagements', engagementId), {
    status: 'ready_to_post',
    draftedReply,
    draftedAt: serverTimestamp(),
  });
}
