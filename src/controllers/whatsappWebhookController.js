const prisma = require('../config/prisma');
const automationEngine = require('../services/AutomationEngine');
const whatsappService = require('../services/WhatsAppService');

/**
 * WhatsApp Webhook Controller
 * Handles Meta Cloud API GET verification handshakes and POST guest message webhooks.
 */

// GET /api/webhooks/whatsapp
// Verifies Meta's subscription endpoint registration handshake
async function verifyWebhook(req, res) {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify token matching (environment variable or default sandbox token)
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'autopilot_verify_token_2026';

    if (mode && token) {
      if (mode === 'subscribe' && token === expectedToken) {
        console.log('[WhatsApp Webhook] Handshake verified successfully with Meta Cloud!');
        return res.status(200).send(challenge);
      } else {
        console.warn(`[WhatsApp Webhook] Handshake failed: Token mismatch. Received: "${token}"`);
        return res.sendStatus(403);
      }
    }
    return res.sendStatus(400);
  } catch (err) {
    console.error('[WhatsApp Webhook] Verification error:', err);
    return res.sendStatus(500);
  }
}

// POST /api/webhooks/whatsapp
// Ingests real-time events, parses messages, routes to hotel tenant, and triggers AI reply
async function handleWebhookEvent(req, res) {
  try {
    const body = req.body;

    // Validate Meta Cloud API messaging event structure
    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const changeValue = body.entry?.[0]?.changes?.[0]?.value;
    if (!changeValue || !changeValue.messages) {
      // Return 200 OK immediately for status updates/read receipts so Meta doesn't retry
      return res.sendStatus(200);
    }

    const rawMessage = changeValue.messages[0];
    const fromPhone = rawMessage.from; // Guest WhatsApp ID / Phone number
    const messageId = rawMessage.id;
    const timestamp = rawMessage.timestamp;
    const metadata = changeValue.metadata;
    const destinationPhoneId = metadata?.phone_number_id; // Unique ID representing the receiving WhatsApp business number

    // Extract text safely based on message type
    let textBody = '';
    if (rawMessage.type === 'text') {
      textBody = rawMessage.text?.body || '';
    } else if (rawMessage.type === 'interactive') {
      const interactiveType = rawMessage.interactive?.type;
      if (interactiveType === 'button_reply') {
        textBody = rawMessage.interactive.button_reply?.title || '';
      } else if (interactiveType === 'list_reply') {
        textBody = rawMessage.interactive.list_reply?.title || '';
      }
    } else if (rawMessage.type === 'button') {
      textBody = rawMessage.button?.text || '';
    }

    if (!textBody.trim()) {
      console.log(`[WhatsApp Webhook] Ingested message of type "${rawMessage.type}" lacks text content. Ignoring.`);
      return res.sendStatus(200);
    }

    console.log(`[WhatsApp Webhook] Inbound message received from: ${fromPhone} | Content: "${textBody}" | Phone ID: ${destinationPhoneId}`);

    // 1. Identify Hotel Tenant
    let hotel = null;
    if (destinationPhoneId) {
      hotel = await prisma.hotel.findFirst({
        where: { whatsappPhoneId: destinationPhoneId }
      });
    }

    // Fallback: For demo environment robustness, route to first hotel if unmapped or sandbox phone ID is used
    if (!hotel) {
      hotel = await prisma.hotel.findFirst();
      if (!hotel) {
        console.error('[WhatsApp Webhook] Critical Error: No hotels seeded in database. Cannot route webhook event.');
        return res.sendStatus(200);
      }
      console.log(`[WhatsApp Webhook] Destination ID ${destinationPhoneId} not explicitly registered. Falling back to default hotel: "${hotel.hotelName}" (ID: ${hotel.id})`);
    }

    // 2. Log incoming payload event to Database
    await prisma.activityLog.create({
      data: {
        actionType: 'Webhook Ingested',
        actionDetails: `WhatsApp Message ID: ${messageId} | Tenant: ${hotel.hotelName} | Body: "${textBody}"`
      }
    });

    // 3. Trigger core AutomationEngine pipelines (intent, Mews check, Groq reply/escalate)
    // Note: handleIncomingMessage maps the identity, starts conversation, updates DB messages
    const result = await automationEngine.handleIncomingMessage(fromPhone, textBody, 'WhatsApp');

    // 4. Send live WhatsApp reply back to guest if engine successfully auto-responded
    if (result.success && result.automated) {
      console.log(`[WhatsApp Webhook] AutomationEngine generated AI reply: "${result.response}". Sending outbound.`);
      await whatsappService.sendMessage(hotel.id, fromPhone, result.response);
    } else {
      console.log(`[WhatsApp Webhook] Conversation escalated or auto-reply skipped: ${result.message || 'AI could not respond'}`);
    }

    // Return 200 OK to Meta to confirm receipt
    return res.sendStatus(200);

  } catch (err) {
    console.error('[WhatsApp Webhook] Event processing crashed:', err);
    // Return 200 to acknowledge so Meta doesn't flood server with retries, but log the crash
    return res.sendStatus(200);
  }
}

module.exports = {
  verifyWebhook,
  handleWebhookEvent
};
