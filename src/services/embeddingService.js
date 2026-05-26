/**
 * Embedding Service
 * Generates embeddings for text using local transformers (no API key needed)
 */

let pipeline;

const initializeModel = async () => {
  if (pipeline) return pipeline;

  try {
    const { pipeline: p } = await import("@xenova/transformers");
    pipeline = await p("feature-extraction", "Xenova/bge-large-en-v1.5");
    console.log("[EmbeddingService] Model loaded successfully");
    return pipeline;
  } catch (err) {
    console.error("[EmbeddingService] Failed to load model:", err.message);
    throw err;
  }
};

const generateEmbedding = async (text) => {
  try {
    const model = await initializeModel();
    const result = await model(text, { pooling: "mean", normalize: true });
    return Array.from(result.data);
  } catch (err) {
    console.error(
      "[EmbeddingService] Embedding generation failed:",
      err.message,
    );
    throw err;
  }
};

const generateEmbeddings = async (texts) => {
  try {
    const model = await initializeModel();
    const embeddings = [];

    for (const text of texts) {
      const result = await model(text, { pooling: "mean", normalize: true });
      embeddings.push(Array.from(result.data));
    }

    return embeddings;
  } catch (err) {
    console.error(
      "[EmbeddingService] Batch embedding generation failed:",
      err.message,
    );
    throw err;
  }
};

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  initializeModel,
};
