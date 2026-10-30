const bcrypt = require('bcryptjs');
const staffRepository = require('../repositories/staff.repository');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/app-error');

class StaffService {
  async getStaffList({ search = '', status = '' }) {
    const rows = await staffRepository.findAll({ search, status });
    const stats = await staffRepository.findStats();
    return { rows, stats };
  }

  async getStaffById(id) {
    const staff = await staffRepository.findById(id);
    if (!staff) throw new AppError('Staff account not found.', 404);
    return staff;
  }

  async createStaff(formData) {
    const { name, username, email, password, mobile, status } = formData;

    if (!username) throw new AppError('Username is required.', 400);
    if (!name) throw new AppError('Name is required.', 400);
    if (!password || password.length < 8) throw new AppError('Password must contain at least 8 characters.', 400);
    if (!['Active', 'Inactive'].includes(status)) throw new AppError('Select a valid account status.', 400);

    const existing = await userRepository.findByUsername(username);
    if (existing) throw new AppError('Username already exists.', 400);

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await staffRepository.createStaff({ name, username, email, mobile, status }, passwordHash);
    return userId;
  }

  async updateStaff(id, formData) {
    const staff = await staffRepository.findById(id);
    if (!staff) throw new AppError('Staff account not found.', 404);

    const { name, username, email, mobile, status, password } = formData;

    if (!name || !username) throw new AppError('Name and username are required.', 400);
    if (!['Active', 'Inactive'].includes(status)) throw new AppError('Select a valid account status.', 400);
    if (password && password.length < 8) throw new AppError('Password must contain at least 8 characters.', 400);

    const duplicate = await userRepository.checkUsernameDuplicate(username, staff.user_id);
    if (duplicate) throw new AppError('Username is already in use.', 400);

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    await staffRepository.updateStaff(id, staff.user_id, { name, username, email, mobile, status }, passwordHash);
  }

  async updatePermissions(id, accessRole) {
    const staff = await staffRepository.findById(id);
    if (!staff) throw new AppError('Staff account not found.', 404);
    if (!['Staff', 'Admin'].includes(accessRole)) throw new AppError('Select a valid access role.', 400);

    await staffRepository.updatePermissions(id, staff.user_id, accessRole);
  }

  async toggleStatus(id) {
    const staff = await staffRepository.findById(id);
    if (!staff) throw new AppError('Staff account not found.', 404);

    const currentStatus = String(staff.status || 'Active').toLowerCase();
    const newStatus = currentStatus === 'active' ? 'Inactive' : 'Active';

    await staffRepository.toggleStatus(id, staff.user_id, newStatus);
    return { name: staff.name, newStatus };
  }

  async deleteStaff(id) {
    const staff = await staffRepository.findById(id);
    if (!staff) throw new AppError('Staff account not found.', 404);

    await staffRepository.deleteStaff(id, staff.user_id);
  }
}

module.exports = new StaffService();
