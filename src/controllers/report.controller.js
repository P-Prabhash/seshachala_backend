const reportService = require('../services/report.service');
const asyncHandler = require('../utils/async-handler');

const getReports = asyncHandler(async (req, res) => {
  const category = (req.query.category || '').trim();
  const year = (req.query.year || '').trim();

  const data = await reportService.getDashboardStats({ category, year });
  const coursePayload = await reportService.buildReportPayload('course-wise', { category, year }, req.query);

  res.render('reports/index.html', {
    data,
    courses: coursePayload ? coursePayload.rows : [],
    category,
    year,
    categories: ['Convener', 'Management'],
    years: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Old']
  });
});

const getReportDetail = asyncHandler(async (req, res) => {
  const reportType = req.params.report_type;
  const category = (req.query.category || '').trim();
  const year = (req.query.year || '').trim();

  const payload = await reportService.buildReportPayload(reportType, { category, year }, req.query);
  if (!payload) return res.status(404).send('Report not found');

  payload.category = category;
  payload.year = year;

  res.render('reports/detail.html', payload);
});

const getReportExport = asyncHandler(async (req, res) => {
  const reportType = req.params.report_type;
  const category = (req.query.category || '').trim();
  const year = (req.query.year || '').trim();

  const payload = await reportService.buildReportPayload(reportType, { category, year }, req.query);
  if (!payload) return res.status(404).send('Report not found');

  let csv = payload.columns.map(([_, label]) => `"${label}"`).join(',') + '\n';
  payload.rows.forEach(r => {
    csv += payload.columns.map(([key, _]) => `"${r[key] !== undefined ? r[key] : ''}"`).join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${reportType}.csv"`);
  res.send(csv);
});

const getGeneralReportExport = asyncHandler(async (req, res) => {
  const category = (req.query.category || '').trim();
  const year = (req.query.year || '').trim();

  const payload = await reportService.buildReportPayload('student-wise', { category, year }, req.query);

  let csv = 'Admission No,Student,Course,Year/Sem,Total Fee,Paid,Balance\n';
  if (payload && payload.rows) {
    payload.rows.forEach(r => {
      csv += `"${r.admission_no}","${r.name}","${r.course}","${r.year_sem}",${r.total_fee},${r.paid},${r.balance}\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="seshachala_fee_report.csv"');
  res.send(csv);
});

module.exports = {
  getReports,
  getReportDetail,
  getReportExport,
  getGeneralReportExport
};
