const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedEscalation() {
  console.log('Seeding escalated conversation for Human Assistance Queue...');

  // 1. Create a guest
  const guest = await prisma.guest.create({
    data: {
      name: 'Oliver Martinez',
      phone: '+14155552671',
      email: 'oliver.martinez@example.com',
      roomNumber: '304',
      loyaltyTier: 'Gold Member',
      pmsGuestId: 'mews-guest-oliver',
      status: 'VIP',
      spent: 450.00,
      visits: 3
    }
  });

  // 2. Create a conversation with status 'escalated'
  const conversation = await prisma.conversation.create({
    data: {
      guestId: guest.id,
      status: 'escalated',
      aiEnabled: false, // AI disabled since human is requested
      confidenceScore: 0.45,
      lastMessage: 'I need to speak to a real person immediately about this extra charge.'
    }
  });

  // 3. Create messages for the conversation
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderType: 'guest',
        content: 'Hi, I just looked at my room bill and there is a charge for room service on Friday night. I did not order room service.',
        channel: 'WhatsApp'
      },
      {
        conversationId: conversation.id,
        senderType: 'ai',
        content: 'Hello Oliver! I would be happy to help look into that room service charge for you. Let me check the details for Room 304.',
        channel: 'WhatsApp'
      },
      {
        conversationId: conversation.id,
        senderType: 'guest',
        content: 'No, I want this removed now. I did not order it. I need to speak to a real person immediately about this extra charge.',
        channel: 'WhatsApp'
      }
    ]
  });

  // 4. Create an Escalation Activity Log
  await prisma.activityLog.create({
    data: {
      conversationId: conversation.id,
      actionType: 'Escalation',
      actionDetails: 'Guest requested human assistance regarding an unrecognized room service charge.'
    }
  });

  console.log('Successfully seeded escalated conversation!');
}

seedEscalation()
  .catch(err => {
    console.error('Error seeding escalation:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
