import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getAuth } from 'firebase/auth';

/* ═══════════════════════════════════════════════
   AI VOICE OUTBOUND CALLING SERVICE
   Uses Bland AI (https://bland.ai) for autonomous phone calls
   ═══════════════════════════════════════════════ */

const PLACE_CALL_ENDPOINT = '/api/placeBlandCall';
const CALL_STATUS_ENDPOINT = '/api/getBlandCallStatus';

async function getServerAuthHeaders() {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Generate the call script / task prompt for the AI voice agent.
 * Optimized for EMAIL COLLECTION and launch permission.
 */
export function generateCallScript(prospect) {
  const firmName = prospect.firmName || 'your firm';
  const city = prospect.city || '';
  const state = prospect.state || '';
  const location = [city, state].filter(Boolean).join(', ');

  return {
    task: `You are Alex, a friendly and professional business development representative for NemoC LAW AI — the first Agentic-as-a-Service OS built specifically for solo and small law firms.

You are calling ${firmName}${location ? ` in ${location}` : ''}.

YOUR PRIMARY GOALS (in order of priority):
1. Introduce NemoC LAW AI in 60-90 seconds
2. Collect their EMAIL ADDRESS so we can send them more info and get them set up
3. Get verbal permission to send them a follow-up
4. If they decline email, ask if it's OK to call back when we go live

IMPORTANT RULES:
- NEVER be pushy or aggressive. You are a trusted advisor, not a telemarketer.
- If they say they're busy, offer to call back at a better time and ask when.
- If they say "not interested," thank them politely and end the call.
- If you reach voicemail, leave a brief 20-second message and end the call.
- Keep the total call under 3 minutes.
- Be conversational, not scripted. Adapt to their responses naturally.

CONVERSATION FLOW:

1. GREETING (warm, brief):
   "Hi, this is Alex calling from NemoC LAW AI. I'm reaching out because we've built something specifically for law firms like yours — do you have about 60 seconds?"

2. IF THEY SAY YES — PITCH (pick 3 key points, don't dump all info):
   - "We've built the first Agentic OS purpose-built for solo and small law firms"
   - "It's 10 autonomous AI agents that handle legal research, contract review, client intake, document drafting, and more"
   - "Unlike ChatGPT or other generic tools, these agents actually DO the work — they research case law, redline contracts, screen new clients"
   - "Everything runs inside an NVIDIA NemoClaw security sandbox, so your client data never leaks"
   - "We're accepting founding firms right now — the first 100 firms per state lock in at $297 per month for life. After that, the price goes up permanently"

3. COLLECT EMAIL (this is your #1 conversion goal):
   "We're inviting a small group of founding firms to lock in lifetime pricing. The best way to get started is for me to send you a quick overview. What's the best email address to send that to?"

   If they give an email:
   - Spell it back to confirm: "Great, so that's [spell it out]@[domain], correct?"
   - Say: "Perfect, I'll send that right over. You'll get a link to lock in your founding price — no credit card needed, just a 2-minute form."

   If they don't want to give email:
   - "Totally understand. Would it be alright if we give you a call back? The founding pricing window is filling up and I'd hate for you to miss it."
   - If yes: "Great, we'll reach out when it's live. Thanks so much for your time."
   - If no: "No problem at all. If you ever want to check it out, just search NemoC LAW AI. Thanks for your time!"

4. CLOSING:
   "Thanks so much for your time. Keep an eye out for that email — and feel free to reply to it anytime if you have questions. Have a great day!"

VOICEMAIL SCRIPT (if you reach voicemail):
"Hi, this is Alex from NemoC LAW AI. We've built the first AI agent platform specifically for law firms like yours — 10 autonomous agents that handle legal research, contracts, client intake, and more. Founding firms can lock in at $297 a month for life — but spots are limited. Visit nemoc-law-ai.web.app or I can try you again. Have a great day!"

INFORMATION YOU MUST COLLECT (if possible):
- Email address (primary goal)
- Whether they give permission to be contacted again
- Their level of interest (interested, maybe later, not interested)
- Any specific practice areas they mention
- Any concerns they raise (price, security, AI skepticism)`,

    firstSentence: `Hi, this is Alex calling from NemoC LAW AI. I'm reaching out to ${firmName} because we've built something specifically for law firms like yours — do you have about 60 seconds?`,

    voice: 'maya',
    maxDuration: 5,
    waitForGreeting: true,
    temperature: 0.7,
    interruptionThreshold: 100,
  };
}

/**
 * Try to extract an email address from a call transcript.
 * Useful for auto-capturing emails the prospect gave during the call.
 */
export function extractEmailFromTranscript(transcript) {
  if (!transcript) return null;
  // Common email patterns spoken in calls
  const emailRegex = /[a-zA-Z0-9._%+-]+\s*(?:@|at)\s*[a-zA-Z0-9.-]+\s*(?:\.|dot)\s*[a-zA-Z]{2,}/gi;
  const matches = transcript.match(emailRegex);
  if (!matches) return null;
  // Clean up spoken email: "john at firmname dot com" → "john@firmname.com"
  return matches[0]
    .replace(/\s*(?:at)\s*/gi, '@')
    .replace(/\s*(?:dot)\s*/gi, '.')
    .replace(/\s+/g, '')
    .toLowerCase();
}


/**
 * Initiate an outbound AI voice call to a prospect via Bland AI.
 */
export async function makeOutboundCall(prospect) {
  if (!prospect.phone) {
    throw new Error('No phone number available for this prospect.');
  }

  const script = generateCallScript(prospect);

  const response = await fetch(PLACE_CALL_ENDPOINT, {
    method: 'POST',
    headers: await getServerAuthHeaders(),
    body: JSON.stringify({
      prospect,
      script,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Call failed with status ${response.status}`);
  }

  const data = await response.json();
  const callId = data.callId || data.call_id;

  // Update prospect status
  if (prospect.id) {
    await updateDoc(doc(db, 'prospects', prospect.id), {
      lastCallId: callId,
      lastCallAt: serverTimestamp(),
      callCount: (prospect.callCount || 0) + 1,
      status: prospect.status === 'researched' ? 'outreach_sent' : prospect.status,
      updatedAt: serverTimestamp(),
    });
  }

  return { callId, status: 'initiated' };
}

/**
 * Check the status of an active call.
 */
export async function getCallStatus(callId) {
  const response = await fetch(CALL_STATUS_ENDPOINT, {
    method: 'POST',
    headers: await getServerAuthHeaders(),
    body: JSON.stringify({ callId }),
  });

  if (!response.ok) throw new Error('Failed to fetch call status');

  const data = await response.json();
  const transcript = data.concatenated_transcript || '';
  const collectedEmail = extractEmailFromTranscript(transcript);

  return {
    callId,
    status: data.status, // 'queued', 'in-progress', 'completed', 'failed', 'no-answer'
    duration: data.call_length,
    transcript,
    summary: data.summary || '',
    answeredBy: data.answered_by, // 'human', 'voicemail', 'unknown'
    recordingUrl: data.recording_url || null,
    completedAt: data.end_at,
    collectedEmail, // auto-extracted from transcript
  };
}

/**
 * Make calls to multiple prospects (bulk).
 */
export async function makeBulkCalls(prospects) {
  const results = [];
  // Stagger calls by 2 seconds to avoid rate limits
  for (let i = 0; i < prospects.length; i++) {
    try {
      const result = await makeOutboundCall(prospects[i]);
      results.push({ phone: prospects[i].phone, firmName: prospects[i].firmName, success: true, ...result });
    } catch (err) {
      results.push({ phone: prospects[i].phone, firmName: prospects[i].firmName, success: false, error: err.message });
    }
    if (i < prospects.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return results;
}
