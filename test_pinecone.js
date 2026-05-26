require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const axios = require('axios');

(async () => {
  try {
    const url = process.env.PINECONE_URL;
    if (!url) {
      console.error('PINECONE_URL not set in .env');
      process.exit(1);
    }
    const response = await axios.get(url);
    console.log('✅ Pinecone reachable, status:', response.status);
  } catch (err) {
    console.error('❌ Pinecone connection failed:', err.message);
  }
})();
