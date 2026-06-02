const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all workflows for a hotel
exports.getWorkflows = async (req, res) => {
  try {
    const hotelId = req.user?.hotelId || 5; // Fallback to 5 since only hotel 5 exists
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
    const hotelId = req.user?.hotelId || 5;
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
