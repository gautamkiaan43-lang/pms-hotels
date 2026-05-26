/**
 * Qdrant Service
 * Manages vector storage and similarity search for RAG
 */

const axios = require('axios');

const COLLECTION_NAME = "hotel_knowledge";
const VECTOR_SIZE = 1024;

let client;

const initializeClient = () => {
  if (client) return client;

  const pineconeUrl = process.env.PINECONE_URL;
  const pineconeApiKey = process.env.PINECONE_API_KEY;

  client = axios.create({
    baseURL: pineconeUrl,
    headers: { "Api-Key": pineconeApiKey },
  });

  console.log(`[PineconeService] Client initialized with URL: ${pineconeUrl}`);
  return client;
};

const createCollection = async () => {
  // Pinecone indexes are managed via the Pinecone console.
  // No runtime collection creation is required.
  console.log('[PineconeService] Skipping collection creation (managed externally).');
  return;
};

const upsertPoints = async (points) => {
  try {
    const c = initializeClient();

    // Pinecone indexes are assumed to exist; no collection creation needed.
    const formattedPoints = points.map(p => ({
      id: p.id,
      values: p.vector,
      metadata: {
        text: p.text,
        source: p.source,
        docType: p.docType,
        chunkIndex: p.chunkIndex,
        hotelId: p.hotelId,
      },
    }));

    const payload = { vectors: formattedPoints };
    await c.post('/vectors/upsert', payload);
    console.log(`[PineconeService] Upserted ${formattedPoints.length} points`);
    return { success: true, count: formattedPoints.length };
  } catch (err) {
    // Enhanced error logging – show HTTP status & response if available
    if (err.response) {
      console.error("[PineconeService] Upsert failed – HTTP status:", err.response.status);
      console.error("[PineconeService] Response data:", err.response.data);
    } else {
      console.error("[PineconeService] Upsert failed –", err.message);
    }
    throw err;
  }
};

const search = async (queryVector, limit = 5, hotelId = null) => {
  try {
    const c = initializeClient();

    const payload = {
      vector: queryVector,
      topK: limit,
      includeMetadata: true,
    };

    if (hotelId) {
      payload.filter = {
        hotelId: { "$eq": hotelId }
      };
    }

    const response = await c.post('/query', payload);
    const results = response.data.matches || [];

    return results.map(r => ({
      id: r.id,
      score: r.score,
      text: r.metadata?.text,
      source: r.metadata?.source,
      docType: r.metadata?.docType,
      chunkIndex: r.metadata?.chunkIndex,
    }));
  } catch (err) {
    console.error("[PineconeService] Search failed:", err.message);
    return [];
  }
};

const deletePoint = async (pointId) => {
  try {
    const c = initializeClient();
    // Pinecone delete endpoint expects an array of ids
    await c.post('/vectors/delete', { ids: [pointId] });
    console.log(`[PineconeService] Deleted point ${pointId}`);
  } catch (err) {
    console.error("[PineconeService] Failed to delete point:", err.message);
    throw err;
  }
};

const deleteCollection = async () => {
  // Pinecone indexes are managed via the console – nothing to delete programmatically.
  console.log('[PineconeService] deleteCollection called – no action needed for Pinecone.');
  return;
};

module.exports = {
  initializeClient,
  createCollection,
  upsertPoints,
  search,
  deletePoint,
  deleteCollection,
};
