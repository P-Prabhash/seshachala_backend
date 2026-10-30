const studentService = require('../services/student.service');
const settingsService = require('../services/settings.service');
const asyncHandler = require('../utils/async-handler');

const getStudents = asyncHandler(async (req, res) => {
  const search = (req.query.q || '').trim();
  const selectedCategory = (req.query.category || '').trim().toLowerCase();
  const selectedYear = (req.query.year || '').trim();

  const { students, totals } = await studentService.getStudentList({
    search,
    category: selectedCategory,
    year: selectedYear
  });

  let filterText = '';
  if (selectedCategory && selectedYear) {
    filterText = `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} - ${selectedYear}`;
  } else if (selectedCategory) {
    filterText = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
  } else if (selectedYear) {
    filterText = selectedYear;
  }

  res.render('students/index.html', {
    students,
    totals,
    search,
    selected_category: selectedCategory,
    selected_year: selectedYear,
    filter_text: filterText
  });
});

const getAddStudent = asyncHandler(async (req, res) => {
  const courses = await settingsService.getCourses();
  const feeComponents = await studentService.getStudentFeeComponents();

  res.render('students/add.html', {
    courses,
    fee_components: feeComponents
  });
});

const postAddStudent = asyncHandler(async (req, res) => {
  try {
    await studentService.createStudent(req.body, req.files);
    req.flash('success', 'Student added successfully.');
  } catch (error) {
    req.flash('error', error.message || 'Unable to add student.');
  }
  res.redirect('/students');
});

const getStudentView = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const data = await studentService.getStudentById(studentId);

  res.render('students/view.html', {
    student: data.student,
    total_fee: data.totalFee,
    paid_fee: data.paidFee,
    balance_fee: data.balanceFee,
    payment_progress: data.paymentProgress,
    fee_components: data.feeComponents
  });
});

const getEditStudent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const data = await studentService.getStudentById(studentId);
  const courses = await settingsService.getCourses();
  const feeComponents = await studentService.getStudentFeeComponents();

  const existingComponents = {};
  data.feeComponents.forEach(c => {
    existingComponents[c.field_key || c.label.toLowerCase().replace(/\s+/g, '_')] = {
      amount: c.amount,
      label: c.label
    };
  });

  res.render('students/edit.html', {
    student: data.student,
    courses,
    fee_components: feeComponents,
    existing_components: existingComponents,
    paid_amount: data.paidFee
  });
});

const postEditStudent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  try {
    await studentService.updateStudent(studentId, req.body, req.files);
    req.flash('success', 'Student updated successfully.');
    return res.redirect(`/students/${studentId}`);
  } catch (error) {
    req.flash('error', error.message || 'Unable to update student.');
    return res.redirect(`/students/${studentId}/edit`);
  }
});

const postDeleteStudent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.body.id || req.params.id || '0', 10);
  try {
    const student = await studentService.deleteStudent(studentId, req.session.user_id);
    req.flash('success', `Student '${student.name}' (${student.admission_no}) deleted successfully.`);
  } catch (error) {
    req.flash('error', error.message || 'Unable to delete student.');
  }
  res.redirect('/students');
});

const getStudentApi = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  try {
    const data = await studentService.getStudentById(studentId);
    res.json({
      id: data.student.id,
      name: data.student.name,
      admission_no: data.student.admission_no,
      total_fee: data.totalFee,
      paid: data.paidFee,
      balance: data.balanceFee
    });
  } catch (error) {
    res.status(404).json({ error: 'Student not found' });
  }
});

module.exports = {
  getStudents,
  getAddStudent,
  postAddStudent,
  getStudentView,
  getEditStudent,
  postEditStudent,
  postDeleteStudent,
  getStudentApi
};
