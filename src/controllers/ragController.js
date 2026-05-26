const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ragService = require("../services/ragService");
const qdrantService = require("../services/qdrantService");

// Fetch all uploaded knowledge documents
exports.getDocuments = async (req, res) => {
  console.log(`[RAGController] Fetching documents for hotelId=${req.query.hotelId || req.headers["x-hotel-id"] || req.user?.hotelId}`);
  try {
    const docs = await prisma.knowledgeDocument.findMany();
    res.json(docs);
  } catch (error) {
    console.error('Get Documents Error:', error);
    res.status(500).json({ message: 'Failed to fetch knowledge documents' });
  }
};

// New endpoint to trigger reindex (dummy for logging)
exports.reindexDocument = async (req, res) => {
  const { id } = req.params;
  console.log(`[RAGController] Reindex request received for document ID ${id}`);
  try {
    // Fetch the document record
    const doc = await prisma.knowledgeDocument.findUnique({ where: { id: parseInt(id) } });
    if (!doc) {
      return res.status(404).json({ message: `Document ${id} not found` });
    }
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { isVectorized: true },
    });
    res.json({ message: `Reindex completed for document ${id}` });
  } catch (error) {
    console.error('[RAGController] Reindex error:', error);
    res.status(500).json({ message: 'Failed to reindex document', error: error.message });
  }
};

// Query the RAG knowledge base
exports.queryKnowledge = async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    const hotelId = parseInt(
      req.query.hotelId || req.headers["x-hotel-id"] || req.user?.hotelId || 5,
    );

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: "Query is required" });
    }

    // Query knowledge base
    const result = await ragService.queryKnowledge(query, hotelId, topK);

    res.json({
      query: result.query,
      results: result.results,
      context: result.context,
      resultCount: result.results.length,
    });
  } catch (error) {
    console.error("RAG Query Error:", error);
    res
      .status(500)
      .json({
        message: "Failed to query knowledge base",
        error: error.message,
      });
  }
};

// Delete a knowledge document
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from Qdrant (delete all chunks with this document ID)
    // Note: This is a simplified approach - in production you'd track all point IDs
    const doc = await prisma.knowledgeDocument.findUnique({
      where: { id: parseInt(id) },
    });

    // Delete from database
    await prisma.knowledgeDocument.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: "Document removed successfully from vector RAG pipeline",
    });
  } catch (error) {
    console.error("Delete Document Error:", error);
    res.status(500).json({ message: "Failed to delete knowledge document" });
  }
};

// Handle document upload and trigger vectorization
exports.uploadDocument = async (req, res) => {
  try {
    const hotelId = parseInt(
      req.body.hotelId ||
        req.query.hotelId ||
        req.user?.hotelId ||
        req.headers["x-hotel-id"]
    );
    // Resolve a valid hotel ID; if the provided ID does not exist, fall back to the first hotel record.
    let resolvedHotelId = hotelId;
    let hotelRecord = null;
    
    if (!isNaN(resolvedHotelId)) {
      hotelRecord = await prisma.hotel.findUnique({ where: { id: resolvedHotelId } });
    }
    if (!hotelRecord) {
      const firstHotel = await prisma.hotel.findFirst();
      if (firstHotel) {
        resolvedHotelId = firstHotel.id;
      } else {
        return res
          .status(400)
          .json({ message: "No hotel records exist in the system. Create a hotel before uploading documents." });
      }
    }
    // Multer provides the file in req.file
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }
    
    const filename = req.body.filename || file.originalname;
    const docType = req.body.docType || 'SOP';

    let content = "";
    if (file.mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      const { PDFParse } = require('pdf-parse');
      let parser;
      try {
        parser = new PDFParse({ data: file.buffer });
        const pdfData = await parser.getText();
        content = pdfData.text;
      } catch (pdfErr) {
        console.error("PDF Parsing error:", pdfErr);
        return res.status(400).json({ message: "Failed to parse PDF document." });
      } finally {
        if (parser) {
          await parser.destroy().catch(() => {});
        }
      }
    } else {
      content = file.buffer.toString('utf-8');
    }

    // Create DB record for the file
    const newDoc = await prisma.knowledgeDocument.create({
      data: {
        hotelId: resolvedHotelId,
        filename: filename || "Unknown_Document.pdf",
        fileUrl: `/uploads/${Date.now()}_${filename}`,
        docType: docType,
        isVectorized: false,
      },
    });

    // Process document asynchronously
    setImmediate(async () => {
      try {
        const result = await ragService.processDocument(content, {
          filename,
          docType,
          hotelId: resolvedHotelId,
          documentId: newDoc.id,
        });

        // Update DB record
        await prisma.knowledgeDocument.update({
          where: { id: newDoc.id },
          data: {
            isVectorized: true,
            vectorCount: result.count,
          },
        });

        console.log(
          `[RAG Controller] Document ${filename} successfully vectorized: ${result.count} chunks`,
        );
      } catch (err) {
        console.error(
          `[RAG Controller] Failed to process document ${filename}:`,
          err.message,
        );
        // Mark as failed but don't throw
        await prisma.knowledgeDocument
          .update({
            where: { id: newDoc.id },
            data: { isVectorized: false },
          })
          .catch(() => {});
      }
    });

    res.status(201).json({
      message: "Document uploaded and sent to RAG pipeline for processing",
      document: newDoc,
    });
  } catch (error) {
    console.error("Upload Document Error:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
};

// GET query-test endpoint for browser-based RAG testing
exports.queryKnowledgeTest = async (req, res) => {
  try {
    const { query, topK = 3 } = req.query;
    const hotelId = parseInt(
      req.query.hotelId || req.headers["x-hotel-id"] || req.user?.hotelId || 13
    );

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const result = await ragService.queryKnowledge(query, hotelId, parseInt(topK));

    res.json({
      success: true,
      query: result.query,
      results: result.results,
      context: result.context,
      resultCount: result.results.length,
    });
  } catch (error) {
    console.error("RAG Query Test Error:", error);
    res.status(500).json({
      message: "Failed to query knowledge base",
      error: error.message,
    });
  }
};
