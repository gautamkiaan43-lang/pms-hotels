require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

(async () => {
  try {
    const url = process.env.PINECONE_URL;
    const apiKey = process.env.PINECONE_API_KEY;
    if (!url || !apiKey) {
      console.error('PINECONE_URL or PINECONE_API_KEY not set');
      process.exit(1);
    }
    const client = axios.create({
      baseURL: url,
      headers: { "Api-Key": apiKey },
    });

    console.log('Sending sample query with 1024-dimension vector to Pinecone...');
    const payload = {
      vector: new Array(1024).fill(0.0),
      topK: 1,
      includeMetadata: true,
    };
    const response = await client.post('/query', payload);
    console.log('✅ Response Keys:', Object.keys(response.data));
    console.log('✅ Response matches/results sample:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('❌ Error details:', err.response ? err.response.data : err.message);
  }
})();
