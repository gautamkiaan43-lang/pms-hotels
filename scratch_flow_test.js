const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const automationEngine = require('./src/services/AutomationEngine');

async function runEndToEndTests() {
  console.log('==================================================');
  console.log('         AUTO-PILOT END-TO-END FLOW TESTS        ');
  console.log('==================================================\n');

  // Find a guest from the database to run our tests with
  const testGuest = await prisma.guest.findFirst({
    where: { pmsGuestId: 'mews-guest-1' } // Sarah Jenkins (Gold Member from seed)
  });

  if (!testGuest) {
    console.error('Error: Test guest "Sarah Jenkins" (mews-guest-1) not found in database. Make sure you seeded the DB!');
    return;
  }

  console.log(`Using Test Guest: ${testGuest.name} (Phone: ${testGuest.phone}, PMS ID: ${testGuest.pmsGuestId})\n`);

  // ==========================================
  // CASE 1: SUCCESSFUL AUTO-PILOT AUTO-REPLY
  // ==========================================
  console.log('--- TEST 1: Guest Requests Late Checkout (Auto-Pilot Auto-Reply) ---');
  console.log('Sending message: "Hi! Can I request a late checkout tomorrow around 2 PM?"');
  
  try {
    const result = await automationEngine.handleIncomingMessage(testGuest.phone, 'Hi! Can I request a late checkout tomorrow around 2 PM?');
    console.log('Test 1 Result Status:', result.success ? 'SUCCESS' : 'FAILED');
    console.log('Automated Response Sent:', result.automated ? 'YES' : 'NO');
    console.log('Generated AI Reply:', result.response || result.message);
    
    // Verify in database that message was saved and activity log created
    const conversation = await prisma.conversation.findFirst({
      where: { guestId: testGuest.id },
      include: { 
        messages: { orderBy: { createdAt: 'desc' }, take: 2 },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    console.log('\nDatabase Verification:');
    console.log(`- Conversation Status in DB: ${conversation.status}`);
    console.log(`- Latest Messages stored in DB:`);
    conversation.messages.forEach(m => {
      console.log(`  [${m.senderType.toUpperCase()}]: "${m.content}"`);
    });
    console.log(`- Latest Activity Log: [${conversation.activityLogs[0]?.actionType}]: "${conversation.activityLogs[0]?.actionDetails}"`);
  } catch (err) {
    console.error('Test 1 Error:', err);
  }

  console.log('\n--------------------------------------------------\n');

  // ==========================================
  // CASE 2: HUMAN ESCALATION & AGENT TAKEOVER
  // ==========================================
  console.log('--- TEST 2: Guest Complains about Billing (Human Escalation) ---');
  console.log('Sending message: "Your system charged me twice! I want a refund and I want to speak to the manager immediately."');

  try {
    const result = await automationEngine.handleIncomingMessage(testGuest.phone, 'Your system charged me twice! I want a refund and I want to speak to the manager immediately.');
    console.log('Test 2 Result Status:', result.success ? 'SUCCESS' : 'FAILED');
    console.log('Automated Response Sent:', result.automated ? 'YES' : 'NO');
    console.log('Engine Output:', result.message || result.response);
    
    // Verify in database that conversation status is now ESCALATED
    const conversation = await prisma.conversation.findFirst({
      where: { guestId: testGuest.id },
      include: { 
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    console.log('\nDatabase Verification:');
    console.log(`- Conversation Status in DB: ${conversation.status} (Expected: escalated)`);
    console.log(`- Latest Activity Log: [${conversation.activityLogs[0]?.actionType}]: "${conversation.activityLogs[0]?.actionDetails}"`);
  } catch (err) {
    console.error('Test 2 Error:', err);
  }

  console.log('\n==================================================');
  console.log('                FLOW TESTING COMPLETE             ');
  console.log('==================================================');
}

runEndToEndTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
