const { onRequest, onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const twilio = require('twilio');

if (!admin.apps.length) admin.initializeApp();
const firestore = admin.firestore();
const NEMOCLAW_DEFAULT_MODEL = process.env.NVIDIA_MODEL_ID || 'nvidia/nemotron-3-super-120b-a12b';

const REDACTION_RULES = [
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED-SSN]' },
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: '[REDACTED-EMAIL]' },
  { regex: /\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g, replacement: '[REDACTED-PHONE]' },
  { regex: /\b(?:routing|account|iolta|trust\s+account|swift|iban)[\s:#-]*[A-Z0-9]{8,34}\b/gi, replacement: '[REDACTED-BANKING-DATA]' },
];

function redactSensitiveText(text) {
  return REDACTION_RULES.reduce((safeText, rule) => safeText.replace(rule.regex, rule.replacement), text || '');
}

function getTwilioClient() {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  if (!twilioSid || !twilioAuth) return null;
  return twilio(twilioSid, twilioAuth);
}

/**
 * 1. Provision Dedicated Firm Number (Multi-Tenant Auto-Provisioning)
 * Finds an available number and purchases it for a specific firm's Agentic Workspace.
 */
exports.provisionFirmNumber = onCall({ maxInstances: 10 }, async (request) => {
  const { firmId, areaCode } = request.data;
  const auth = request.auth;

  if (!auth) throw new Error('Unauthenticated user.');
  if (!firmId) throw new Error('firmId required to provision a number.');

  const client = getTwilioClient();
  if (!client) throw new Error('Platform Twilio Client not configured in environment.');

  try {
    const listConfig = { limit: 1 };
    if (areaCode) listConfig.areaCode = parseInt(areaCode, 10);
    
    logger.info(`Searching for available Twilio numbers in area code ${areaCode || 'any'}`);
    const available = await client.availablePhoneNumbers('US').local.list(listConfig);
    
    if (!available || available.length === 0) {
      throw new Error('No phone numbers available in that area code.');
    }
    
    const numberToBuy = available[0].phoneNumber;

    logger.info(`Purchasing ${numberToBuy} for firm ${firmId}...`);
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: numberToBuy
      // Future scope: Configure the SMS Webhook URL via API dynamically here,
      // or map via a global Twilio Messaging Service in the Twistio console.
    });

    // Update the Firm profile with its newly assigned AI Number
    await firestore.collection('firms').doc(firmId).update({
      dedicatedNumber: purchased.phoneNumber,
      twilioSid: purchased.sid
    });

    logger.info(`✅ Successfully assigned ${purchased.phoneNumber} to firm ${firmId}.`);
    return { success: true, phoneNumber: purchased.phoneNumber };
  } catch (error) {
    logger.error('Failed to provision Twilio number:', error);
    throw new Error(error.message);
  }
});

/**
 * 2. Twilio Webhook (HTTP POST) — Multi-Tenant Entry Point
 * Acts as the centralized receiver for 100% of SMS traffics. Routes precisely
 * down to the individual law firm workspace based on the `payload.To` property.
 */
exports.twilioWebhook = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const payload = req.body;
  const fromNumber = payload.From; 
  const toNumber = payload.To; // <--- The Dedicated Firm Number dialed
  const smsBody = payload.Body;

  logger.info(`📞 Webhook: SMS from ${fromNumber} to ${toNumber}: ${smsBody}`);

  try {
    // Multi-Tenant Lookup: Find exact firm attached to the dialed number
    const firmsQuery = await firestore.collection('firms')
      .where('dedicatedNumber', '==', toNumber)
      .limit(1)
      .get();

    let targetFirmId = null;
    let fallbackToEnv = false;

    if (!firmsQuery.empty) {
      targetFirmId = firmsQuery.docs[0].id;
    } else if (toNumber === process.env.TWILIO_PHONE_NUMBER) {
      // Global fallback for unassigned/testing numbers mapped in .env
      fallbackToEnv = true;
    }

    if (!targetFirmId && !fallbackToEnv) {
      logger.warn(`No firm found for number ${toNumber}. Dropping unsupported message.`);
      return res.status(200).send('<Response></Response>'); 
    }

    // Queue text for autonomous agent evaluation, locking it to the firm context
    await firestore.collection('_inboundSms').add({
      from: fromNumber,
      to: toNumber,
      body: smsBody,
      firmId: targetFirmId,
      mediaUrl: payload.MediaUrl0 || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      twilioMessageId: payload.MessageSid
    });

    // Silent 200 Ack via TwiML to satisfy Twilio limits
    const MessagingResponse = require('twilio').twiml.MessagingResponse;
    res.type('text/xml');
    res.status(200).send(new MessagingResponse().toString());
  } catch (error) {
    logger.error('Twilio webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * 3. Autonomous AI Auto-Reply (Firestore Trigger)
 * Acts immediately and asynchronously upon a new client text. Binds the message 
 * strictly to the Firm's NIM context and replies transparently using their unique number.
 */
exports.processInboundSms = onDocumentCreated('_inboundSms/{msgId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  if (data.status !== 'pending') return;

  const _msgId = event.params.msgId;
  const { firmId, from: clientPhone, body: text, to: firmNumber } = data;

  const apiKey = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY;
  if (!apiKey) {
    console.warn("Attempted to auto-reply SMS but NVIDIA_API_KEY is missing.");
    return;
  }

  try {
    const systemPrompt = `You are a specialized AI Intake & Communications SDR for a prominent Law Firm.
    RULES: Keep responses short and conversational. Highly professional legal empathy. 
    Never provide legal advice (UPL Guard). Offer to schedule consultations or pass to an attorney.`;

    const requestBody = {
      model: NEMOCLAW_DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: redactSensitiveText(text) }
      ],
      temperature: 0.3,
      max_tokens: 150
    };

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`NIM Gateway Error ${response.status}`);
    const aiData = await response.json();
    const aiResponseText = aiData.choices?.[0]?.message?.content || "Message received! We will route this to an attorney and advise shortly.";

    // Multi-tenant transparency: Dispatch outbound SMS showing the firm's real dedicated number
    const client = getTwilioClient();
    if (client) {
      await client.messages.create({
          body: aiResponseText,
          from: firmNumber, // <-- Strictly binding sender ID back to firm context
          to: clientPhone
      });
      logger.info(`🤖 Agent [Firm: ${firmId || 'GLOBAL'}]: Auto-replied to client ${clientPhone}`);
    }

    await snap.ref.update({ status: 'replied', aiGeneratedReply: aiResponseText, processedAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch (error) {
    logger.error('System failed to process and auto-reply inbound SMS:', error);
    await snap.ref.update({ status: 'error', error: error.message });
  }
});

/**
 * 4. Dispatch Outbound SMS (Cross-Platform Sub-Agent Action)
 * Used by React dashboards or other backend elements to text clients manually or via sub-agent logic.
 */
exports.dispatchSms = onCall({ maxInstances: 10 }, async (request) => {
  const { to, body, firmId, context } = request.data;
  const auth = request.auth;

  if (!auth) throw new Error('Unauthenticated endpoint violation.');
  if (!to || !body || !firmId) throw new Error('Missing "to", "body", or "firmId".');

  const twilioClient = getTwilioClient();
  if (!twilioClient) throw new Error('Backend SMS Gateway not configured.');

  try {
    // Authenticate Firm Entity & Load their specific sending context (Sender ID)
    const firmDoc = await firestore.collection('firms').doc(firmId).get();
    if (!firmDoc.exists) throw new Error('Provided firmId not found in global namespace.');
    
    // Strict fallback protection
    const dedicatedNumber = firmDoc.data().dedicatedNumber || process.env.TWILIO_PHONE_NUMBER;
    if (!dedicatedNumber) throw new Error('This firm does not have a provisioned phone number yet.');

    const message = await twilioClient.messages.create({
      body: body,
      from: dedicatedNumber, // Ensuring exact brand matching outbound
      to: to
    });

    logger.info(`Outbound System SMS Dispatched on behalf of Firm ${firmId} to ${to} (SID: ${message.sid})`);

    // Audit Trail logging
    await firestore.collection('_outboundSms').add({
      to,
      body,
      from: dedicatedNumber,
      firmId,
      context: context || 'automated_proactive_dispatch',
      senderUid: auth.uid,
      sid: message.sid,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, sid: message.sid, from: dedicatedNumber };
  } catch (error) {
    logger.error('Twilio dispatch rejection:', error);
    throw new Error(`Platform failed to dispatch SMS: ${error.message}`);
  }
});
