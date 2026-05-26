const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ragService = require('../src/services/ragService');
const aiService = require('../src/services/AIService');
const mewsService = require('../src/services/mewsService');

async function main() {
  console.log('==================================================');
  console.log('         HOTEL PMS RAG & GROQ TASTING RUN        ');
  console.log('==================================================\n');

  // 1. Read Hotel Policies
  const policiesPath = path.resolve(__dirname, 'hotel_policies.txt');
  if (!fs.existsSync(policiesPath)) {
    console.error(`❌ Policies file not found at: ${policiesPath}`);
    return;
  }
  const policiesText = fs.readFileSync(policiesPath, 'utf-8');
  console.log(`📖 Loaded policies file (${policiesText.length} characters)`);

  // 2. Select Hotel ID (we'll use 13: The Grand AutoPilot Resort)
  const targetHotelId = 13;
  const hotel = await prisma.hotel.findUnique({ where: { id: targetHotelId } });
  if (!hotel) {
    console.error(`❌ Target Hotel ID ${targetHotelId} not found in database. Please run check_hotels_guests.js to verify.`);
    return;
  }
  console.log(`🏨 Ingesting policies for Hotel: "${hotel.hotelName}" (ID: ${targetHotelId})`);

  // 3. Create or Update DB Record for Knowledge Document
  let doc = await prisma.knowledgeDocument.findFirst({
    where: { hotelId: targetHotelId, filename: 'hotel_policies.txt' }
  });

  if (doc) {
    console.log(`ℹ️ Existing document found in database (ID: ${doc.id}), deleting first to ensure clean test...`);
    await prisma.knowledgeDocument.delete({ where: { id: doc.id } });
  }

  doc = await prisma.knowledgeDocument.create({
    data: {
      hotelId: targetHotelId,
      filename: 'hotel_policies.txt',
      fileUrl: '/uploads/hotel_policies.txt',
      docType: 'SOP',
      isVectorized: false,
      vectorCount: 0
    }
  });
  console.log(`✅ Created Database KnowledgeDocument record (ID: ${doc.id})`);

  // 4. Vectorize and Ingest Document via RAG Pipeline
  console.log('🚀 Running RAG pipeline vectorization (local Xenova 1024-dim model -> Pinecone)...');
  const ingestResult = await ragService.processDocument(policiesText, {
    filename: doc.filename,
    docType: doc.docType,
    hotelId: targetHotelId,
    documentId: doc.id
  });

  console.log(`✅ Vectorization successful: stored ${ingestResult.count} chunks in Pinecone!`);

  // Update DB Record
  await prisma.knowledgeDocument.update({
    where: { id: doc.id },
    data: {
      isVectorized: true,
      vectorCount: ingestResult.count
    }
  });
  console.log('✅ Updated database record with vectorization status.');

  // Wait a moment for Pinecone to persist the indices fully
  console.log('⏳ Waiting 3 seconds for vector indexes to settle...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 5. Run Tasting Queries (7 test cases directly testing different policies)
  const testCases = [
    {
      id: 1,
      policyRef: 'Policy 22 & 5: Check-out/Early check-in',
      question: 'What time is checkout on my departure day? Also, can I check in early before 2 PM?',
      expectedKeywords: ['11 a.m.', '2 p.m.', 'midnight']
    },
    {
      id: 2,
      policyRef: 'Policy 12: Smoking & Appliances',
      question: 'Can I smoke in my suite? Can I bring and use my personal electrical kettle in the room?',
      expectedKeywords: ['prohibited', 'smoking', 'safety reasons']
    },
    {
      id: 3,
      policyRef: 'Policy 17: Pets rules',
      question: 'Is it allowed to bring my small golden retriever to stay in the room with me? Is there an extra charge?',
      expectedKeywords: ['pet', 'dog', 'charge', 'health']
    },
    {
      id: 4,
      policyRef: 'Policy 10: Guests Visitors',
      question: 'Can I have some guests over to my room tonight around 11:30 PM?',
      expectedKeywords: ['10:00 p.m.', 'visitors', 'registered']
    },
    {
      id: 5,
      policyRef: 'Policy 25: Lost Room Key',
      question: 'Oh no, I lost my room key card. What is the procedure, and will I be charged a fee?',
      expectedKeywords: ['CZK 1,000', 'lost', 'reception']
    },
    {
      id: 6,
      policyRef: 'Policy 29: Helicopter landing',
      question: 'Hello! I am planning to arrive at the hotel next week in my personal helicopter. Can I land on the hotel park, and what is the notice period?',
      expectedKeywords: ['14 days', 'helicopter', 'not possible to land']
    },
    {
      id: 7,
      policyRef: 'Policy 15 & 16: Lake & Kids safety',
      question: 'Is it okay to let my 7-year-old child swim in the hotel lake without adult supervision? Is there a lifeguard?',
      expectedKeywords: ['unsupervised', 'lifeguard', 'responsible']
    }
  ];

  console.log('==================================================');
  console.log('          STARTING END-TO-END TASTING            ');
  console.log('==================================================\n');

  for (const tc of testCases) {
    console.log(`--- [TEST CASE ${tc.id}] (${tc.policyRef}) ---`);
    console.log(`Guest Query: "${tc.question}"\n`);

    // 5a. Query Knowledge Base
    console.log(`🔍 [RAG] Retrieving context from Pinecone...`);
    const ragResult = await ragService.queryKnowledge(tc.question, targetHotelId, 3);
    
    console.log(`📄 Retrieved Context (Top Chunks):`);
    if (ragResult.results && ragResult.results.length > 0) {
      ragResult.results.forEach((res, index) => {
        console.log(`  [Chunk ${index + 1}] Source: ${res.source} | Score: ${(res.score || 0).toFixed(4)}`);
        console.log(`  Snippet: "${res.text.trim().substring(0, 160)}..."`);
      });
    } else {
      console.log('  ⚠️ NO CONTEXT RETRIEVED (Results empty)!');
    }

    // 5b. Generate AI Response using retrieved context
    console.log(`\n🤖 [GROQ] Querying Llama 3.3 with RAG context...`);
    const systemPrompt = `You are "StayFlow AI", an upscale, extremely polite, and helpful virtual guest assistant for a luxury hotel resort.
Generate a polite, personalized, and elegant response to the guest's request based ONLY on the provided Hotel Policy Context.
If the information is not in the context, politely explain you do not have that specific information.

Hotel Policy Context:
${ragResult.context || 'No specific policy found.'}`;

    const aiResponse = await aiService.generateResponse(tc.question, systemPrompt);

    console.log(`\n✨ AI Response:`);
    console.log(`"${aiResponse}"`);

    // 5c. Simple Keyword verification
    const responseLower = aiResponse.toLowerCase();
    const verified = tc.expectedKeywords.some(keyword => responseLower.includes(keyword.toLowerCase()));
    console.log(`\nVerification: ${verified ? '✅ SUCCESS (Matches policy keywords)' : '❌ FAILED (Keyword match missed)'}`);
    console.log('--------------------------------------------------\n');
  }

  // 6. Test with a simulated Guest from Mews integration
  console.log('==================================================');
  console.log('      TESTING INTEGRATED MEWS + GROQ + RAG FLOW  ');
  console.log('==================================================\n');

  console.log('Simulating Mews guest stay details lookup...');
  const testPmsGuestId = 'mews-guest-1'; // Sarah Jenkins
  const guestStayDetails = await mewsService.getStayDetails(testPmsGuestId);
  
  console.log('PMS Reservation Details Loaded:');
  console.log(JSON.stringify(guestStayDetails, null, 2));

  console.log('\nTesting RAG-enabled AutomationEngine flow with Sarah Jenkins...');
  const automationEngine = require('../src/services/AutomationEngine');
  
  // Test case of Checkout Inquiry through AutomationEngine
  const simulatedPhone = '+49123456789'; // Sarah Jenkins' phone
  const testMessage = 'Hi! What time is checkout tomorrow? Can I get a late checkout?';
  console.log(`Sending WhatsApp message: "${testMessage}"`);

  // Override guest.hotelId inside test context
  const originalFindByIdentity = require('../src/services/guestService').findByIdentity;
  require('../src/services/guestService').findByIdentity = async (phone) => {
    const guestObj = await originalFindByIdentity(phone);
    if (guestObj) {
      guestObj.hotelId = targetHotelId; // Bind mock hotelId
    }
    return guestObj;
  };

  const result = await automationEngine.handleIncomingMessage(simulatedPhone, testMessage);
  console.log('\n--- Automation Engine Response ---');
  console.log('Success:', result.success);
  console.log('Is Automated:', result.automated);
  console.log('Reply Content:', result.response || result.message);
  
  console.log('\n==================================================');
  console.log('               TASTING RUN COMPLETE              ');
  console.log('==================================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
