const settingsRepository = require('../repositories/settings.repository');
const AppError = require('../utils/app-error');

class SettingsService {
  async getCollegeSettings() {
    return await settingsRepository.getCollegeSettings();
  }

  async updateCollegeSettings(formData) {
    const collegeName = (formData.college_name || '').trim();
    if (!collegeName) throw new AppError('College name is required.', 400);

    await settingsRepository.updateCollegeSettings({
      college_name: collegeName,
      subtitle: (formData.subtitle || '').trim(),
      address: (formData.address || '').trim(),
      phone: (formData.phone || '').trim(),
      email: (formData.email || '').trim(),
      website: (formData.website || '').trim(),
      logo_path: (formData.logo_path || '/static/images/logo.png').trim() || '/static/images/logo.png'
    });
  }

  async getAcademicYears() {
    return await settingsRepository.getAcademicYears();
  }

  async addAcademicYear(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new AppError('Academic year name is required.', 400);
    await settingsRepository.addAcademicYear(trimmed);
  }

  async activateAcademicYear(id) {
    await settingsRepository.activateAcademicYear(id);
  }

  async deleteAcademicYear(id) {
    const years = await settingsRepository.getAcademicYears();
    const target = years.find(y => y.id === id);
    if (!target) throw new AppError('Academic year not found.', 404);
    if (target.active) throw new AppError('Activate another academic year before deleting this one.', 400);

    await settingsRepository.deleteAcademicYear(id);
  }

  async getCourses() {
    return await settingsRepository.getCourses();
  }

  async addCourse(name, durationYears) {
    const trimmed = (name || '').trim();
    const duration = parseInt(durationYears || '4', 10);

    if (!trimmed) throw new AppError('Course name is required.', 400);
    if (isNaN(duration) || duration < 1 || duration > 10) {
      throw new AppError('Course duration must be between 1 and 10 years.', 400);
    }

    await settingsRepository.addCourse(trimmed, duration);
  }

  async toggleCourse(id) {
    await settingsRepository.toggleCourse(id);
  }

  async updateCourse(id, name, durationYears) {
    const course = await settingsRepository.getCourseById(id);
    if (!course) throw new AppError('Course not found.', 404);

    const trimmed = (name || '').trim();
    const duration = parseInt(durationYears || '4', 10);

    if (!trimmed || isNaN(duration) || duration < 1 || duration > 10) {
      throw new AppError('Enter a course name and a duration between 1 and 10 years.', 400);
    }

    if (trimmed !== course.name) {
      const usage = await settingsRepository.getCourseStudentUsage(course.name);
      if (usage > 0) throw new AppError('This course is assigned to students; its name cannot be changed.', 400);
    }

    await settingsRepository.updateCourse(id, trimmed, duration);
  }

  async deleteCourse(id) {
    const course = await settingsRepository.getCourseById(id);
    if (!course) throw new AppError('Course not found.', 404);

    const usage = await settingsRepository.getCourseStudentUsage(course.name);
    if (usage > 0) throw new AppError('This course is assigned to existing students and cannot be deleted.', 400);

    await settingsRepository.deleteCourse(id);
  }

  async saveConfigSection(section, formData) {
    const appSettings = await settingsRepository.getAppSettings();

    if (section === 'payment') {
      const modes = ['Cash', 'UPI', 'Card', 'Check'];
      let selected = formData.payment_modes || [];
      if (typeof selected === 'string') selected = [selected];
      selected = modes.filter(m => selected.includes(m));

      if (selected.length === 0) throw new AppError('Enable at least one payment mode.', 400);

      await settingsRepository.setAppSetting('payment_modes', selected.join(','));
      return;
    }

    if (section === 'fees') {
      const rawTypes = (formData.fee_types || '').trim();
      const labels = rawTypes.split(/[,|\n]/).map(s => s.trim()).filter(Boolean);
      if (labels.length === 0 || labels.length > 20 || labels.some(l => l.length > 60)) {
        throw new AppError('Add between 1 and 20 fee field names, each up to 60 characters.', 400);
      }
      const uniqueLabels = new Set(labels.map(l => l.toLowerCase()));
      if (uniqueLabels.size !== labels.length) throw new AppError('Fee field names must be unique.', 400);

      await settingsRepository.setAppSetting('fee_types', labels.join(','));

      const installments = parseInt(formData.default_installments || '1', 10);
      if (isNaN(installments) || installments < 1 || installments > 12) {
        throw new AppError('Default installments must be a whole number from 1 to 12.', 400);
      }
      await settingsRepository.setAppSetting('default_installments', installments);

      const lateFee = parseFloat(formData.late_fee_amount || '0');
      if (isNaN(lateFee) || lateFee < 0) throw new AppError('Late Fee Amount cannot be negative.', 400);
      await settingsRepository.setAppSetting('late_fee_amount', lateFee);

      const maxDiscount = parseFloat(formData.max_discount_percent || '0');
      if (isNaN(maxDiscount) || maxDiscount < 0 || maxDiscount > 100) {
        throw new AppError('Maximum discount cannot exceed 100 percent.', 400);
      }
      await settingsRepository.setAppSetting('max_discount_percent', maxDiscount);
    }

    if (section === 'receipt') {
      const prefix = (formData.receipt_prefix || '').trim();
      if (!prefix || prefix.length > 12) {
        throw new AppError('Receipt prefix is required and must be 12 characters or fewer.', 400);
      }
      await settingsRepository.setAppSetting('receipt_prefix', prefix);
      await settingsRepository.setAppSetting('receipt_header', (formData.receipt_header || '').trim());
      await settingsRepository.setAppSetting('receipt_footer', (formData.receipt_footer || '').trim());
      await settingsRepository.setAppSetting('signature_label', (formData.signature_label || '').trim());
      await settingsRepository.setAppSetting('receipt_logo_path', (formData.receipt_logo_path || '').trim());
    }
  }
}

module.exports = new SettingsService();
