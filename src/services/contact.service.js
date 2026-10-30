const contactRepository = require('../repositories/contact.repository');

class ContactService {
  async saveMessage({ name, email, subject, message }) {
    const id = await contactRepository.create({ name, email, subject, message });
    return await contactRepository.findById(id);
  }

  async getAllMessages() {
    return await contactRepository.findAll();
  }
}

module.exports = new ContactService();
