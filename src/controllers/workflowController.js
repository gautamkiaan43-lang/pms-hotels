const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const resolveHotelId = async (requestedHotelId) => {
  let hotelId = parseInt(requestedHotelId);
  let hotel = null;

  if (!isNaN(hotelId)) {
    hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  }

  if (!hotel) {
    hotel = await prisma.hotel.findFirst({ orderBy: { id: 'asc' } });
    hotelId = hotel?.id;
  }

  if (!hotelId) {
    const error = new Error('No hotel records exist in the system');
    error.statusCode = 400;
    throw error;
  }

  return hotelId;
};

// Get all workflows for a hotel
exports.getWorkflows = async (req, res) => {
  try {
    const hotelId = await resolveHotelId(req.query.hotelId || req.headers['x-hotel-id'] || req.user?.hotelId);
    const workflows = await prisma.workflow.findMany({
      where: { hotelId }
    });
    res.json(workflows);
  } catch (error) {
    console.error('Get Workflows Error:', error);
    res.status(500).json({ message: 'Failed to fetch workflows' });
  }
};

// Create a new workflow
exports.createWorkflow = async (req, res) => {
  try {
    const hotelId = await resolveHotelId(req.body.hotelId || req.query.hotelId || req.headers['x-hotel-id'] || req.user?.hotelId);
    const { name, purpose, channel, policySource, escalationTrigger, autoApproveLimit, occupancyThreshold, loyaltyRequired } = req.body;

    const newWorkflow = await prisma.workflow.create({
      data: {
        hotelId,
        name,
        purpose,
        channel: channel || 'WhatsApp',
        policySource: policySource || 'StandardSOP.pdf',
        escalationTrigger: escalationTrigger || 'Confidence < 85%',
        autoApproveLimit,
        occupancyThreshold,
        loyaltyRequired,
        status: 'Active'
      }
    });

    res.status(201).json(newWorkflow);
  } catch (error) {
    console.error('Create Workflow Error:', error);
    res.status(500).json({ message: 'Failed to create workflow' });
  }
};

// Update an existing workflow (toggle status or update rules)
exports.updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedWorkflow = await prisma.workflow.update({
      where: { id: parseInt(id) },
      data: updates
    });

    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Update Workflow Error:', error);
    res.status(500).json({ message: 'Failed to update workflow' });
  }
};
