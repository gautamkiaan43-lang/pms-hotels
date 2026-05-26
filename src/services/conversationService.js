const prisma = require('../config/prisma');

/**
 * Conversation Service
 * Handles persistence of messages and conversation states
 */
class ConversationService {
  async findOrCreateConversation(guestId) {
    let conversation = await prisma.conversation.findFirst({
      where: { 
        guestId,
        status: { in: ['active', 'escalated'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { guestId }
      });
    }

    return conversation;
  }

  async addMessage(conversationId, senderType, content, channel = 'WhatsApp') {
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderType,
        content,
        channel
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: content }
    });

    return message;
  }

  async updateStatus(conversationId, status, confidenceScore = 1.0) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { status, confidenceScore }
    });
  }

  async logActivity(conversationId, actionType, actionDetails) {
    return prisma.activityLog.create({
      data: {
        conversationId,
        actionType,
        actionDetails
      }
    });
  }
}

module.exports = new ConversationService();
