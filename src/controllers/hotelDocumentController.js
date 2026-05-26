const prisma = require('../config/prisma');
const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Dual-Mode Document Upload Controller
 * Supports uploading SOPs during both the Onboarding Request phase and Active Hotel Tenant phase
 */
const uploadDocument = asyncHandler(async (req, res) => {
  const { filename, fileUrl, docType, hotelRequestId, hotelId } = req.body;

  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required' });
  }

  // Validate allowed extensions (PDF, DOCX, TXT)
  const ext = filename.split('.').pop().toLowerCase();
  if (!['pdf', 'docx', 'txt'].includes(ext)) {
    return res.status(400).json({
      success: false,
      message: `Unsupported file type: .${ext}. Only PDF, DOCX, and TXT are supported.`
    });
  }

  const simulatedUrl = fileUrl || `/uploads/${Date.now()}_${filename.replace(/\s+/g, '_')}`;
  const documentCategory = docType || 'SOP';

  // Scenario A: Onboarding Stage (Save to OnboardingRequest.sopDocuments)
  if (hotelRequestId) {
    const request = await prisma.onboardingRequest.findUnique({
      where: { requestId: hotelRequestId }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Onboarding request not found' });
    }

    let parsedSops = [];
    try {
      parsedSops = request.sopDocuments ? JSON.parse(request.sopDocuments) : [];
    } catch (e) {
      parsedSops = [];
    }

    const docMetadata = {
      id: `doc_${Date.now()}`,
      name: filename,
      url: simulatedUrl,
      category: documentCategory,
      uploadedAt: new Date().toISOString()
    };

    parsedSops.push(docMetadata);

    const updated = await prisma.onboardingRequest.update({       
      where: { requestId: hotelRequestId },
      data: {
        sopDocuments: JSON.stringify(parsedSops)
      }
    });

    return sendSuccess(res, 201, {
      message: 'SOP Document uploaded to onboarding request successfully',
      document: docMetadata,
      request: updated
    });
  }

  // Scenario B: Active Stage (Save to KnowledgeDocument model)
  if (hotelId) {
    const parsedHotelId = parseInt(hotelId);
    const hotel = await prisma.hotel.findUnique({
      where: { id: parsedHotelId }
    });

    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel workspace not found' });
    }

    const newDoc = await prisma.knowledgeDocument.create({
      data: {
        hotelId: parsedHotelId,
        filename,
        fileUrl: simulatedUrl,
        docType: documentCategory,
        isVectorized: false
      }
    });

    // Simulate Background Vectorization Pipeline
    setTimeout(async () => {
      try {
        await prisma.knowledgeDocument.update({
          where: { id: newDoc.id },
          data: {
            isVectorized: true,
            vectorCount: Math.floor(Math.random() * 40) + 15
          }
        });
        console.log(`[RAG ENGINE] Async embedding complete for ${filename} (${newDoc.id}).`);
      } catch (err) {
        console.error('Simulated vectorization failed:', err);
      }
    }, 4000);

    return sendSuccess(res, 201, {
      message: 'Document uploaded to active hotel knowledge base and sent to RAG pipeline',
      document: newDoc
    });
  }

  return res.status(400).json({
    success: false,
    message: 'Either hotelRequestId or hotelId must be provided'
  });
});

module.exports = {
  uploadDocument
};
