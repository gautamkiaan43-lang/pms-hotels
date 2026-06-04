const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const pdfParse = require('pdf-parse');
const vectorDb = require('../utils/vectorDb');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple text chunker
function chunkText(text, maxChars = 1000) {
  const chunks = [];
  let currentChunk = '';
  const sentences = text.split(/(?<=[.?!])\s+/);
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence + ' ';
    } else {
      currentChunk += sentence + ' ';
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

// Fetch all uploaded knowledge documents
exports.getDocuments = async (req, res) => {
  try {
    let hotelId = req.user?.hotelId;
    if (!hotelId) {
      const hotel = await prisma.hotel.findFirst();
      if (!hotel) return res.status(404).json({ message: 'No hotel found' });
      hotelId = hotel.id;
    }
    hotelId = parseInt(hotelId, 10);

    const docs = await prisma.knowledgeDocument.findMany({
      where: { hotelId }
    });
    res.json(docs);
  } catch (error) {
    console.error('Get Documents Error:', error);
    res.status(500).json({ message: 'Failed to fetch knowledge documents' });
  }
};

// Handle document upload and trigger vectorization
exports.uploadDocument = async (req, res) => {
  try {
    let hotelId = req.user?.hotelId;
    if (!hotelId) {
      const hotel = await prisma.hotel.findFirst();
      if (!hotel) return res.status(404).json({ message: 'No hotel found' });
      hotelId = hotel.id;
    }
    hotelId = parseInt(hotelId, 10);

    const { filename, docType } = req.body; 
    
    // In a production app, use multer to handle req.file
    let textToEmbed = 'This is a placeholder policy document. Gold members get late checkout until 2 PM. Regular checkout is 11 AM.';
    
    if (req.file && req.file.path) {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      textToEmbed = pdfData.text;
    }

    // 1. Create DB record for the file in Prisma (MySQL)
    const newDoc = await prisma.knowledgeDocument.create({
      data: {
        hotelId,
        filename: filename || (req.file ? req.file.originalname : 'Unknown_Document.pdf'),
        fileUrl: req.file ? `/uploads/${req.file.filename}` : `/uploads/${Date.now()}_doc.pdf`,
        docType: docType || 'SOP',
        isVectorized: false
      }
    });

    // 2. Perform Vectorization
    (async () => {
      try {
        console.log(`[RAG Engine] Processing ${newDoc.filename}... chunking text...`);
        const chunks = chunkText(textToEmbed);
        
        console.log(`[RAG Engine] Generating ${chunks.length} embeddings...`);
        const embeddingsResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunks,
          dimensions: 1024
        });

        console.log(`[RAG Engine] Saving vectors to Neon Vector DB...`);
        const records = chunks.map((chunk, i) => ({
          id: `doc_${newDoc.id}_chunk_${i}`,
          documentId: newDoc.id,
          hotelId: hotelId,
          content: chunk,
          embedding: embeddingsResponse.data[i].embedding
        }));

        if (!records || records.length === 0) {
          throw new Error('No records generated to upsert.');
        }
        await vectorDb.upsertEmbeddings(records);

        await prisma.knowledgeDocument.update({
          where: { id: newDoc.id },
          data: {
            isVectorized: true,
            vectorCount: chunks.length
          }
        });
        console.log(`[RAG Engine] ${newDoc.filename} vectorized successfully.`);
      } catch (err) {
        console.error(`[RAG Engine] Error vectorizing document ${newDoc.id}:`, err);
      }
    })();

    res.status(201).json({ 
      message: 'Document uploaded and is being processed by the RAG engine', 
      document: newDoc 
    });
  } catch (error) {
    console.error('Upload Document Error:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
};

// Query the RAG knowledge base via Pinecone
exports.queryKnowledge = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // 1. Embed the query string
    const queryEmbeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      dimensions: 1024
    });
    
    const queryVector = queryEmbeddingResponse.data[0].embedding;

    // 2. Perform similarity search in Neon Vector DB
    let hotelId = req.user?.hotelId;
    if (!hotelId) {
      const hotel = await prisma.hotel.findFirst();
      if (hotel) hotelId = hotel.id;
    }
    hotelId = hotelId ? parseInt(hotelId, 10) : 13;

    const matches = await vectorDb.querySimilarEmbeddings(queryVector, hotelId, 3);

    const results = matches.map(match => ({
      source: `Document ID: ${match.metadata?.documentId || 'Unknown'}`,
      content: match.metadata?.content || '',
      confidence: match.score?.toFixed(2) || 0
    }));

    res.json({
      query,
      results: results.length > 0 ? results : [{
        source: 'System',
        content: 'No relevant information found in the knowledge base.',
        confidence: 0
      }]
    });
  } catch (error) {
    console.error('RAG Query Error:', error);
    res.status(500).json({ message: 'Failed to query knowledge base' });
  }
};

// Delete a document
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    await vectorDb.deleteDocumentEmbeddings(parseInt(id, 10));
    
    await prisma.knowledgeDocument.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete Document Error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};
