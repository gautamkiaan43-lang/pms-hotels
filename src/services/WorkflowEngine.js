const automationEngine = require('./AutomationEngine');

const executeWorkflow = async (context) => {
  const { sender, message, channel } = context;
  return await automationEngine.handleIncomingMessage(sender, message, channel);
};

module.exports = {
  executeWorkflow
};
