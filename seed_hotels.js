const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hotelsData = [
    { name: 'The Grand AutoPilot Resort', pmsConnected: 'Opera PMS', whatsappActive: true, knowledgeBaseActive: true, chatsToday: 115, aiProcessed: 1240, satisfaction: 98.5, escalations: 4, plan: 'Enterprise', status: 'Active', monthlyUsage: 84 },
    { name: 'Boutique Ritz Paris', pmsConnected: 'Mews', whatsappActive: true, knowledgeBaseActive: true, chatsToday: 86, aiProcessed: 890, satisfaction: 97.2, escalations: 0, plan: 'Enterprise', status: 'Active', monthlyUsage: 68 },
    { name: 'Mews Haven Hotel', pmsConnected: 'Mews', whatsappActive: true, knowledgeBaseActive: true, chatsToday: 46, aiProcessed: 412, satisfaction: 99.0, escalations: 2, plan: 'Standard', status: 'Paused', monthlyUsage: 42 },
    { name: 'Apaleo Executive Suites', pmsConnected: 'Apaleo', whatsappActive: false, knowledgeBaseActive: true, chatsToday: 23, aiProcessed: 142, satisfaction: 94.8, escalations: 0, plan: 'Trial', status: 'Active', monthlyUsage: 18 }
  ];

  console.log('Clearing old hotels...');
  await prisma.hotel.deleteMany({});

  console.log('Seeding hotels...');
  for (const hotel of hotelsData) {
    await prisma.hotel.create({
      data: {
        hotelName: hotel.name,
        pmsProvider: typeof hotel.pmsConnected === 'string' ? hotel.pmsConnected : 'Opera PMS',
        pmsConnected: hotel.pmsConnected !== false,
        whatsappConnected: hotel.whatsappActive === true,
        knowledgeBaseStatus: hotel.knowledgeBaseActive ? 'Active' : 'Pending',
        chatsToday: hotel.chatsToday,
        aiProcessed: hotel.aiProcessed,
        satisfaction: hotel.satisfaction,
        escalations: hotel.escalations,
        subscriptionPlan: hotel.plan || 'Standard',
        aiStatus: hotel.status || 'Active',
        monthlyUsage: hotel.monthlyUsage,
        hotelCode: hotel.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
      }
    });
  }
  console.log('Seed completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
