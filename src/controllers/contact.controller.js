const contactService = require('../services/contact.service');
const asyncHandler = require('../utils/async-handler');

const postContact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  const result = await contactService.saveMessage({ name, email, subject, message });

  res.status(201).json({
    success: true,
    message: 'Message received successfully.',
    data: result
  });
});

const getContacts = asyncHandler(async (req, res) => {
  const messages = await contactService.getAllMessages();
  res.json({
    success: true,
    data: messages
  });
});

module.exports = {
  postContact,
  getContacts
};
