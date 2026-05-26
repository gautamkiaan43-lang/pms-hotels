const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Clearing old onboarding requests, sessions, refresh tokens, and users...');
  await prisma.onboardingRequest.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding premium, realistic onboarding requests...');

  // 1. Pending Review: The Plaza New York
  const defaultChecklist = [
    { id: 1, task: "Discuss automation & pricing customization", done: false },
    { id: 2, task: "Finalize agreement & sign onboarding contract", done: false },
    { id: 3, task: "Submit system credentials securely", done: false },
    { id: 4, task: "Provision isolated hotel workspace shard", done: false },
    { id: 5, task: "Verify PMS & WhatsApp gateway APIs", done: false },
    { id: 6, task: "Activate hotel live agent workspace", done: false }
  ];

  const defaultTimeline1 = [
    { date: "2026-05-22", event: "Onboarding Request submitted from landing page", category: "system" }
  ];

  const defaultMessages1 = [
    { sender: "system", content: "Hotel Setup Request submitted successfully. Awaiting initial super admin review.", timestamp: "2026-05-22T08:00:00Z" }
  ];

  await prisma.onboardingRequest.create({
    data: {
      requestId: 'REQ-502',
      hotelName: 'The Plaza New York',
      contactName: 'James Wellington',
      email: 'wellington@theplazany.com',
      whatsapp: '+12125550199',
      pmsProvider: 'Opera PMS',
      roomCount: '282',
      plan: 'Enterprise',
      status: 'pending_review',
      specialist: 'Sarah Jenkins',
      integrationHealth: 'Pending',
      notes: 'Requesting custom WhatsApp automation with VIP concierge RAG training for suites.',
      hotelType: 'Luxury Landmark',
      website: 'https://www.theplazany.com',
      checklist: JSON.stringify(defaultChecklist),
      timeline: JSON.stringify(defaultTimeline1),
      messages: JSON.stringify(defaultMessages1),
      customizationReqs: 'Needs high-fidelity tone matching for elite VIP suites guests.'
    }
  });

  // 2. In Discussions: Amangiri Resort Utah
  const checklist2 = [
    { id: 1, task: "Discuss automation & pricing customization", done: true },
    { id: 2, task: "Finalize agreement & sign onboarding contract", done: false },
    { id: 3, task: "Submit system credentials securely", done: false },
    { id: 4, task: "Provision isolated hotel workspace shard", done: false },
    { id: 5, task: "Verify PMS & WhatsApp gateway APIs", done: false },
    { id: 6, task: "Activate hotel live agent workspace", done: false }
  ];

  const timeline2 = [
    { date: "2026-05-20", event: "Onboarding Request submitted from landing page", category: "system" },
    { date: "2026-05-21", event: "Request approved by admin. Onboarding discussion channel initialized.", category: "action" },
    { date: "2026-05-22", event: "Specialist aligned pricing override with client representative.", category: "action" }
  ];

  const messages2 = [
    { sender: "system", content: "Hotel Setup Request submitted successfully. Awaiting initial super admin review.", timestamp: "2026-05-20T10:00:00Z" },
    { sender: "Super Admin", text: "Welcome to AutoPilot.ai, Clara! We are setting up your custom RAG SOP index mapping for wellness schedules.", timestamp: "2026-05-21T09:30:00Z" },
    { sender: "Hotel Representative", text: "Thank you! We have uploaded our guest outdoor activity handbook. We need the assistant to handle canyon tours booking rules.", timestamp: "2026-05-22T11:45:00Z" }
  ];

  await prisma.onboardingRequest.create({
    data: {
      requestId: 'REQ-704',
      hotelName: 'Amangiri Resort Utah',
      contactName: 'Clara van der Post',
      email: 'clara@amanresorts.com',
      whatsapp: '+14355550188',
      pmsProvider: 'Mews',
      roomCount: '34',
      plan: 'Enterprise',
      status: 'approved_waiting_discussion',
      specialist: 'Unassigned',
      integrationHealth: 'Pending',
      notes: 'Needs immediate Vector SOP cataloging for hiking and wellness reservations.',
      hotelType: 'Eco Resort',
      website: 'https://www.aman.com/resorts/amangiri',
      checklist: JSON.stringify(checklist2),
      timeline: JSON.stringify(timeline2),
      messages: JSON.stringify(messages2),
      customizationReqs: 'Active custom hiking scheduling SOP vector matching.'
    }
  });

  // 3. Vault Configuration: Mandarin Oriental Hyde Park London
  const checklist3 = [
    { id: 1, task: "Discuss automation & pricing customization", done: true },
    { id: 2, task: "Finalize agreement & sign onboarding contract", done: true },
    { id: 3, task: "Submit system credentials securely", done: false },
    { id: 4, task: "Provision isolated hotel workspace shard", done: false },
    { id: 5, task: "Verify PMS & WhatsApp gateway APIs", done: false },
    { id: 6, task: "Activate hotel live agent workspace", done: false }
  ];

  const timeline3 = [
    { date: "2026-05-18", event: "Onboarding Request submitted from landing page", category: "system" },
    { date: "2026-05-19", event: "Request approved by admin. Onboarding discussion channel initialized.", category: "action" },
    { date: "2026-05-20", event: "Specialist confirmed signed SLA contract. Active subscription cataloged.", category: "action" },
    { date: "2026-05-22", event: "Isolated virtual database shard provisioned successfully: hotel_ws_mo_hydepark", category: "system" }
  ];

  const messages3 = [
    { sender: "system", content: "Hotel Setup Request submitted successfully.", timestamp: "2026-05-18T10:00:00Z" },
    { sender: "Super Admin", text: "We have compiled and dispatched the customized subscription SLA contract for your property review.", timestamp: "2026-05-19T14:30:00Z" },
    { sender: "Hotel Representative", text: "Contract signed by general manager. Ready to proceed to setup credentials vault.", timestamp: "2026-05-20T16:15:00Z" }
  ];

  await prisma.onboardingRequest.create({
    data: {
      requestId: 'REQ-988',
      hotelName: 'Mandarin Oriental Hyde Park',
      contactName: 'Jean-Luc Renaud',
      email: 'jlrenaud@mohg.com',
      whatsapp: '+442075550144',
      pmsProvider: 'Mews',
      roomCount: '181',
      plan: 'Pro',
      status: 'configured',
      specialist: 'Sarah Jenkins',
      integrationHealth: 'Pending',
      notes: 'Awaiting symmetric secure API credentials vaulting.',
      hotelType: 'Classic Landmark',
      website: 'https://www.mandarinoriental.com/london',
      checklist: JSON.stringify(checklist3),
      timeline: JSON.stringify(timeline3),
      messages: JSON.stringify(messages3),
      uniqueHotelId: 'hotel_ws_mo_hydepark'
    }
  });

  // 4. Active Properties: Raffles Hotel Singapore
  const checklist4 = [
    { id: 1, task: "Discuss automation & pricing customization", done: true },
    { id: 2, task: "Finalize agreement & sign onboarding contract", done: true },
    { id: 3, task: "Submit system credentials securely", done: true },
    { id: 4, task: "Provision isolated hotel workspace shard", done: true },
    { id: 5, task: "Verify PMS & WhatsApp gateway APIs", done: true },
    { id: 6, task: "Activate hotel live agent workspace", done: true }
  ];

  const timeline4 = [
    { date: "2026-05-10", event: "Onboarding Request submitted from landing page", category: "system" },
    { date: "2026-05-11", event: "Request approved by admin. Onboarding discussion channel initialized.", category: "action" },
    { date: "2026-05-12", event: "Specialist confirmed signed SLA contract. Active subscription cataloged.", category: "action" },
    { date: "2026-05-13", event: "Isolated virtual database shard provisioned successfully: hotel_ws_raffles_sg", category: "system" },
    { date: "2026-05-14", event: "Handshake suite executed: Oracle Opera PMS Sync, WhatsApp Gateway Node, Vector Database index validated.", category: "system" },
    { date: "2026-05-15", event: "Active hotel account initialized. Secure temporary credentials dispatched to mltan@raffles.com", category: "system" }
  ];

  const messages4 = [
    { sender: "system", content: "Hotel Setup Request submitted successfully.", timestamp: "2026-05-10T10:00:00Z" },
    { sender: "Super Admin", text: "Welcome aboard Raffles Singapore! Let's get the Opera API link activated.", timestamp: "2026-05-11T11:00:00Z" }
  ];

  const workspaceId = 'hotel_ws_raffles_sg';

  // Seed Hotel & User so that the active request exists as a real account in backend
  const existingHotel = await prisma.hotel.findFirst({
    where: { hotelCode: workspaceId }
  });

  if (!existingHotel) {
    const hashedPassword = await bcrypt.hash('AutoPilot@1234', 10);
    await prisma.$transaction(async (tx) => {
      await tx.hotel.create({
        data: {
          hotelName: 'Raffles Hotel Singapore',
          pmsProvider: 'Opera PMS',
          subscriptionPlan: 'Enterprise',
          aiStatus: 'Active',
          onboardingStatus: 'Completed',
          whatsappConnected: true,
          pmsConnected: true,
          emailConnected: true,
          totalRooms: 115,
          pmsApiKey: '[SECURELY_STORED_IN_SECRET_MANAGER]',
          pmsSecret: '[SECURELY_STORED_IN_SECRET_MANAGER]',
          hotelCode: workspaceId,
          subscriptionStatus: 'Trial',
          bankAuthorized: false,
          billingCycle: 'Monthly',
          paymentHealth: 'Healthy',
          billingEmail: 'mltan@raffles.com',
          billingAddress: '1 Beach Rd, Singapore 189673'
        }
      });

      await tx.user.create({
        data: {
          name: 'Mei-Ling Tan',
          email: 'mltan@raffles.com',
          password: hashedPassword,
          role: 'Hotel Admin'
        }
      });
    });
  }

  await prisma.onboardingRequest.create({
    data: {
      requestId: 'REQ-101',
      hotelName: 'Raffles Hotel Singapore',
      contactName: 'Mei-Ling Tan',
      email: 'mltan@raffles.com',
      whatsapp: '+6565550122',
      pmsProvider: 'Opera PMS',
      roomCount: '115',
      plan: 'Enterprise',
      status: 'active',
      specialist: 'Sarah Jenkins',
      integrationHealth: 'Healthy',
      notes: 'Active workspace synced with Opera PMS.',
      hotelType: 'Heritage Luxury',
      website: 'https://www.raffles.com/singapore',
      checklist: JSON.stringify(checklist4),
      timeline: JSON.stringify(timeline4),
      messages: JSON.stringify(messages4),
      uniqueHotelId: workspaceId
    }
  });

  console.log('Premium seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
