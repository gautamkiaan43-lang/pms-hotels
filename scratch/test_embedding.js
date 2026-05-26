const embeddingService = require('../src/services/embeddingService');

async function run() {
  console.log("Starting embedding service test...");
  try {
    console.log("Loading model...");
    const model = await embeddingService.initializeModel();
    console.log("Model loaded successfully!");
    
    console.log("Generating one embedding...");
    const embedding = await embeddingService.generateEmbedding("Hello world, this is a test.");
    console.log("Embedding generated! Length:", embedding.length);
  } catch (err) {
    console.error("Embedding generation failed with error:", err);
  }
}

run();
