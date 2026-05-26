require('dotenv').config();
const aiService = require('./src/services/AIService');

async function test() {
  console.log('Testing Intent Analysis...');
  const intent = await aiService.analyzeIntent('Hi, I am staying in room 502. Can I have a late checkout tomorrow around 2 PM?');
  console.log('Intent Result:', JSON.stringify(intent, null, 2));

  console.log('\nTesting Response Generation...');
  const response = await aiService.generateResponse('Guest wants late checkout but occupancy is low (85%). Approve late checkout for 2 PM politely.');
  console.log('Response Result:', response);
}

test();
