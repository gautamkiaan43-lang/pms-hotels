/**
 * RAG Service
 * Orchestrates document chunking, embedding, storage, and retrieval
 */

const embeddingService = require("./embeddingService");
const qdrantService = require("./qdrantService");

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

/**
 * Split text into overlapping chunks
 */
const chunkText = (text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) => {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
};

/**
 * Process and store a document in RAG pipeline
 */
const processDocument = async (documentText, documentMetadata) => {
  try {
    const { filename, docType = "SOP", hotelId, documentId } = documentMetadata;

    console.log(`[RAGService] Processing document: ${filename}`);

    // 1. Chunk the document
    const chunks = chunkText(documentText);
    console.log(`[RAGService] Created ${chunks.length} chunks from document`);

    // 2. Generate embeddings for each chunk
    const embeddings = await embeddingService.generateEmbeddings(chunks);
    console.log(`[RAGService] Generated ${embeddings.length} embeddings`);

    // 3. Prepare points for Qdrant
    const points = chunks.map((chunk, index) => ({
      id: `${documentId}_${index}`,
      vector: embeddings[index],
      text: chunk,
      source: filename,
      docType,
      chunkIndex: index,
      hotelId,
    }));

    // 4. Upsert to Qdrant
    const result = await qdrantService.upsertPoints(points);

    console.log(
      `[RAGService] Document processing complete: ${result.count} points stored`,
    );
    return { success: true, count: result.count };
  } catch (err) {
    console.error("[RAGService] Document processing failed:", err.message);
    throw err;
  }
};

/**
 * Query knowledge base and retrieve relevant context
 */
const queryKnowledge = async (query, hotelId = null, topK = 5) => {
  try {
    console.log(`[RAGService] Querying: "${query}"`);

    // 1. Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // 2. Search in Qdrant
    const results = await qdrantService.search(queryEmbedding, topK, hotelId);

    if (results.length === 0) {
      console.log("[RAGService] No relevant documents found");
      return { query, results: [], context: "" };
    }

    // 3. Combine results into context
    const context = results
      .map((r, idx) => `[${r.source} - ${r.docType}]\n${r.text}`)
      .join("\n\n---\n\n");

    console.log(`[RAGService] Found ${results.length} relevant chunks`);

    return {
      query,
      results: results.map((r) => ({
        text: r.text,
        source: r.source,
        score: r.score,
      })),
      context,
    };
  } catch (err) {
    console.error("[RAGService] Query failed:", err.message);
    return { query, results: [], context: "", error: err.message };
  }
};

module.exports = {
  chunkText,
  processDocument,
  queryKnowledge,
};
