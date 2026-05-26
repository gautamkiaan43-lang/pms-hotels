const prisma = require('../config/prisma');
const conversationService = require('../services/conversationService');

// GET /api/conversations?status=escalated
// Returns escalated conversations with guest info and latest message
async function getEscalatedConversations(req, res) {
  try {
    // Accept optional status query param; default to 'escalated' (lowercase) and compare case‑sensitively (stored values are lowercase)
    const rawStatus = (req.query.status || 'escalated').toLowerCase();
    const conversations = await prisma.conversation.findMany({
      where: { status: rawStatus },
      include: {
        guest: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        activityLogs: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const data = conversations.map(c => ({
      id: c.id,
      guestName: c.guest.name,
      roomNumber: c.guest.roomNumber,
      reservationId: c.guest.pmsGuestId || 'N/A',
      loyaltyTier: c.guest.loyaltyTier || 'Standard',
      // Determine channel from the most recent message if present
      channel: c.messages[0]?.content?.includes('WhatsApp') ? 'WhatsApp' : 'Email',
      escalationReason: c.activityLogs.find(a => a.actionType === 'Escalation')?.actionDetails || 'N/A',
      waitingDuration: `${Math.floor((new Date() - c.updatedAt) / 60000)}m`,
      status: c.status,
      balance: '$0.00', // placeholder, can be extended later
      checkoutDate: 'Today', // placeholder
      aiSuggestion: '' // optional field for future use
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/conversations/:id/messages
async function getConversationMessages(req, res) {
  try {
    const { id } = req.params;
    const messages = await prisma.message.findMany({
      where: { conversationId: Number(id) },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/conversations/:id/human-reply
async function postHumanReply(req, res) {
  try {
    const { id } = req.params;
    const { text, operatorName } = req.body;
    const message = await prisma.message.create({
      data: {
        conversationId: Number(id),
        senderType: 'human',
        content: text,
        channel: 'WhatsApp', // adjust based on actual channel
      },
    });
    // Update conversation lastMessage and status
    await prisma.conversation.update({
      where: { id: Number(id) },
      data: { lastMessage: text, status: 'In Progress' },
    });
    // TODO: trigger external notification if needed
    res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PUT /api/conversations/:id/return-to-ai
async function putReturnToAI(req, res) {
  try {
    const { id } = req.params;
    await prisma.conversation.update({
      where: { id: Number(id) },
      data: { status: 'active' },
    });
    res.json({ success: true, message: 'Returned to AI automation' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PUT /api/conversations/:id/resolve
async function putResolveConversation(req, res) {
  try {
    const { id } = req.params;
    await prisma.conversation.update({
      where: { id: Number(id) },
      data: { status: 'resolved' },
    });
    await prisma.activityLog.create({
      data: {
        conversationId: Number(id),
        actionType: 'Resolution',
        actionDetails: 'Operator resolved the conversation',
      },
    });
    res.json({ success: true, message: 'Conversation resolved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  getEscalatedConversations,
  getConversationMessages,
  postHumanReply,
  putReturnToAI,
  putResolveConversation,
};
