const prisma = require('../config/prisma');
const conversationService = require('../services/conversationService');
const automationEngine = require('../services/AutomationEngine');

// POST /api/guest-conversations
// Creates a conversation for a guest (guestId optional)
async function createConversation(req, res) {
  try {
    const { guestId, name, phone, email } = req.body;
    let guest;
    if (guestId) {
      guest = await prisma.guest.findUnique({ where: { id: Number(guestId) } });
    }
    if (!guest) {
      // create a temporary guest if not provided
      guest = await prisma.guest.create({
        data: {
          name: name || 'Anonymous Guest',
          phone: phone || 'unknown',
          email: email || null,
        },
      });
    }
    const conversation = await conversationService.findOrCreateConversation(guest.id);
    res.json({ success: true, conversationId: conversation.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/guest-conversations/:id
async function getConversation(req, res) {
  try {
    const { id } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id: Number(id) },
      include: { guest: true, messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) return res.status(404).json({ success: false, message: 'Not found' });
    const data = {
      id: conversation.id,
      status: conversation.status,
      guestName: conversation.guest.name,
      roomNumber: conversation.guest.roomNumber,
      messages: conversation.messages.map(m => ({
        id: m.id,
        sender: m.senderType,
        text: m.content,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })),
    };
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/guest-conversations/:id/message
// body: { text, sender } where sender = 'guest' | 'ai'
async function postMessage(req, res) {
  try {
    const { id } = req.params;
    const { text, sender } = req.body;
    const senderType = sender === 'guest' ? 'guest' : 'ai';
    const message = await prisma.message.create({
      data: {
        conversationId: Number(id),
        senderType,
        content: text,
        channel: 'WhatsApp', // default channel
      },
    });
    // update lastMessage for quick reference
    await prisma.conversation.update({
      where: { id: Number(id) },
      data: { lastMessage: text },
    });
    res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/guest-conversations/:id/ai-reply
// Triggers the AutomationEngine to generate an AI response based on the latest guest message
async function invokeAI(req, res) {
  try {
    const { id } = req.params;
    // fetch conversation and latest guest message
    const conv = await prisma.conversation.findUnique({
      where: { id: Number(id) },
      include: { guest: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const lastGuestMsg = conv.messages.find(m => m.senderType === 'guest');
    if (!lastGuestMsg) return res.status(400).json({ success: false, message: 'No guest message to reply to' });
    // Use the same automation decision logic as the main engine
    const result = await automationEngine.handleIncomingMessage(conv.guest.phone, lastGuestMsg.content);
    if (result.success && result.automated) {
      // AI reply already stored by engine; fetch the new message to return
      const updated = await prisma.message.findMany({
        where: { conversationId: Number(id), senderType: 'ai' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      return res.json({ success: true, aiMessage: updated[0] });
    } else {
      return res.json({ success: false, message: result.message || 'AI could not reply' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/webhooks/email
// Simulates or receives inbound emails (e.g. from tembox or SendGrid parse)
async function handleInboundEmailWebhook(req, res) {
  try {
    console.log("[Webhook] Received inbound email event:", req.body);
    // Support various common inbound webhook formats (SendGrid, Mailgun, or simple custom test payload)
    const sender = req.body.sender || req.body.from || req.body.envelope?.from || "unknown@tembox.xyz";
    const text = req.body.text || req.body.body || req.body["body-plain"] || "No text content";
    
    // Create or find guest
    let guest = await prisma.guest.findFirst({ where: { email: sender } });
    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          name: sender.split('@')[0],
          email: sender,
          phone: sender, // use email as identifier for AutomationEngine
          status: 'Active',
        }
      });
    } else if (!guest.phone || guest.phone === 'unknown') {
      // update phone to email to act as identifier
      await prisma.guest.update({ where: { id: guest.id }, data: { phone: sender } });
      guest.phone = sender;
    }

    // Hand off to AutomationEngine
    const result = await automationEngine.handleIncomingMessage(guest.phone, text, "Email");
    
    res.json({ success: true, processed: true, result });
  } catch (err) {
    console.error("Email Webhook Error:", err);
    res.status(500).json({ success: false, message: 'Server error processing email webhook' });
  }
}

module.exports = {
  createConversation,
  getConversation,
  postMessage,
  invokeAI,
  handleInboundEmailWebhook,
};
