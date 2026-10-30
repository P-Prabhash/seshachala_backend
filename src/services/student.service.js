const studentRepository = require('../repositories/student.repository');
const settingsRepository = require('../repositories/settings.repository');
const paymentRepository = require('../repositories/payment.repository');
const AppError = require('../utils/app-error');

class StudentService {
  async getStudentList({ search = '', category = '', year = '' }) {
    const students = await studentRepository.findAll({ search, category, year });
    const totals = await studentRepository.findTotals({ search, category, year });
    return { students, totals };
  }

  async getStudentById(id) {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw new AppError('Student not found.', 404, 'STUDENT_NOT_FOUND');
    }
    const feeComponents = await studentRepository.getFeeComponents(id);
    const paid = parseFloat(student.paid || 0);
    const totalFee = parseFloat(student.total_fee || 0);
    const balance = Math.max(totalFee - paid, 0);
    const progress = totalFee > 0 ? Math.min((paid / totalFee) * 100, 100) : 0;

    return {
      student,
      totalFee,
      paidFee: paid,
      balanceFee: balance,
      paymentProgress: progress,
      feeComponents: feeComponents.length > 0 ? feeComponents : [{ label: 'Total Fee', amount: totalFee }]
    };
  }

  async getStudentFeeComponents() {
    const appSettings = await settingsRepository.getAppSettings();
    const rawTypes = appSettings.fee_types || 'Tuition Fee,Exam Fee,Lab Fee,Hostel Fee,Transport Fee,Other Fee';
    const labels = rawTypes.split(/[,|\n]/).map(s => s.trim()).filter(Boolean);

    const components = [];
    const usedKeys = new Set();
    const icons = {
      tuition: 'bi-mortarboard-fill',
      exam: 'bi-journal-check',
      lab: 'bi-flask',
      hostel: 'bi-house-door-fill',
      transport: 'bi-bus-front-fill',
      other: 'bi-three-dots'
    };

    for (const label of labels) {
      let key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'fee_item';
      const originalKey = key;
      let suffix = 2;
      while (usedKeys.has(key)) {
        key = `${originalKey}_${suffix}`;
        suffix++;
      }
      usedKeys.add(key);

      let icon = 'bi-plus-circle';
      for (const [prefix, val] of Object.entries(icons)) {
        if (key.startsWith(prefix)) {
          icon = val;
          break;
        }
      }
      components.push({ field: key, label, icon });
    }
    return components;
  }

  async createStudent(formData, files) {
    const { admission_no, name, category, father_name, mobile, email, aadhaar_number, course, year_sem, admission_date, address } = formData;

    if (!admission_no) throw new AppError('Admission number is required.', 400);
    if (!name) throw new AppError('Student name is required.', 400);
    if (!['Convener', 'Management'].includes(category)) throw new AppError('Invalid student category.', 400);
    if (aadhaar_number && (aadhaar_number.length !== 12 || !/^\d+$/.test(aadhaar_number))) {
      throw new AppError('Aadhaar number must contain exactly 12 digits.', 400);
    }

    const existing = await studentRepository.findByAdmissionNo(admission_no);
    if (existing) {
      throw new AppError('Admission number already exists.', 400, 'DUPLICATE_ADMISSION_NO');
    }

    const feeComponentsConfig = await this.getStudentFeeComponents();
    const feeDefinitions = Object.fromEntries(feeComponentsConfig.map(i => [i.field, i]));

    let selectedFields = formData.selected_fee_fields || [];
    if (typeof selectedFields === 'string') selectedFields = [selectedFields];

    const selectedComponents = [];
    let feeTotal = 0.0;

    for (const field of selectedFields) {
      const def = feeDefinitions[field];
      if (!def) throw new AppError('A selected fee field is no longer configured.', 400);
      const rawAmt = (formData[`fee_amounts[${field}]`] || formData[`fee_amounts.${field}`] || formData[field] || '0').toString().trim();
      const amount = parseFloat(rawAmt || 0);
      if (isNaN(amount) || amount <= 0) {
        throw new AppError(`Enter a valid amount for ${def.label}.`, 400);
      }
      feeTotal += amount;
      selectedComponents.push({ field, label: def.label, amount });
    }

    if (feeTotal <= 0 && formData.total_fee) {
      feeTotal = parseFloat(formData.total_fee || 0);
    }

    if (feeTotal < 0) throw new AppError('Total fee cannot be negative.', 400);

    let photoPath = null;
    if (files && files.student_photo && files.student_photo.length > 0) {
      photoPath = files.student_photo[0].filename ? `uploads/students/${files.student_photo[0].filename}` : null;
    }

    const studentData = {
      admissionNo: admission_no,
      name,
      category: category || 'Convener',
      fatherName: father_name,
      mobile,
      email,
      aadhaarNumber: aadhaar_number,
      course: course || 'B.Pharm',
      yearSem: year_sem || '1st Year',
      admissionDate: admission_date,
      address,
      totalFee: feeTotal,
      photo: photoPath
    };

    return await studentRepository.createStudentWithComponents(studentData, selectedComponents);
  }

  async updateStudent(id, formData, files) {
    const student = await studentRepository.findById(id);
    if (!student) throw new AppError('Student not found.', 404);

    const { admission_no, name, category, father_name, mobile, aadhaar_number, course, year_sem, admission_date, address } = formData;

    if (!admission_no) throw new AppError('Admission number is required.', 400);
    if (!name) throw new AppError('Student name is required.', 400);
    if (!['Convener', 'Management'].includes(category)) throw new AppError('Invalid student category.', 400);
    if (aadhaar_number && (aadhaar_number.length !== 12 || !/^\d+$/.test(aadhaar_number))) {
      throw new AppError('Aadhaar number must contain exactly 12 digits.', 400);
    }

    const duplicate = await studentRepository.findByAdmissionNo(admission_no, id);
    if (duplicate) throw new AppError('Admission number already exists.', 400);

    const paidAmount = await paymentRepository.getTotalPaidByStudent(id);

    const feeComponentsConfig = await this.getStudentFeeComponents();
    const feeDefinitions = Object.fromEntries(feeComponentsConfig.map(i => [i.field, i]));

    let selectedFields = formData.selected_fee_fields || [];
    if (typeof selectedFields === 'string') selectedFields = [selectedFields];

    const selectedComponents = [];
    let feeTotal = 0.0;

    for (const field of selectedFields) {
      const def = feeDefinitions[field] || { field, label: field.replace(/_/g, ' ').toUpperCase() };
      const rawAmt = (formData[`fee_amounts[${field}]`] || formData[`fee_amounts.${field}`] || formData[field] || '0').toString().trim();
      const amount = parseFloat(rawAmt || 0);
      if (isNaN(amount) || amount <= 0) {
        throw new AppError(`Enter a valid amount for ${def.label}.`, 400);
      }
      feeTotal += amount;
      selectedComponents.push({ field, label: def.label, amount });
    }

    if (feeTotal <= 0 && formData.total_fee) {
      feeTotal = parseFloat(formData.total_fee || 0);
    }

    if (feeTotal < paidAmount) {
      throw new AppError(`Total fee cannot be less than the already paid amount (₹${paidAmount.toFixed(2)}).`, 400);
    }

    let photoPath = student.photo;
    if (files && files.student_photo && files.student_photo.length > 0) {
      photoPath = `uploads/students/${files.student_photo[0].filename}`;
    }

    const studentData = {
      admissionNo: admission_no,
      name,
      category: category || 'Convener',
      fatherName: father_name,
      mobile,
      aadhaarNumber: aadhaar_number,
      course: course || 'B.Pharm',
      yearSem: year_sem || '1st Year',
      admissionDate: admission_date,
      address,
      totalFee: feeTotal,
      photo: photoPath
    };

    await studentRepository.updateStudentWithComponents(id, studentData, selectedComponents);
  }

  async deleteStudent(id, userId) {
    const result = await studentRepository.deleteStudent(id, { userId });
    if (!result) throw new AppError('Student not found or could not be deleted.', 404);
    return result;
  }
}

module.exports = new StudentService();
