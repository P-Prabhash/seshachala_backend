const reportService = require('../services/report.service');
const asyncHandler = require('../utils/async-handler');

const getDashboard = asyncHandler(async (req, res) => {
  const selectedCategory = (req.query.category || '').trim().toLowerCase();
  const selectedYear = (req.query.year || '').trim();

  const allowedCategories = new Set(['convener', 'management']);
  const allowedYears = new Set(['1st Year', '2nd Year', '3rd Year', '4th Year', 'Old']);

  const cat = allowedCategories.has(selectedCategory) ? selectedCategory : '';
  const yr = allowedYears.has(selectedYear) ? selectedYear : '';

  const data = await reportService.getDashboardStats({ category: cat, year: yr });

  let filterText = 'All Students';
  if (cat && yr) {
    filterText = `${cat.charAt(0).toUpperCase() + cat.slice(1)} - ${yr}`;
  } else if (cat) {
    filterText = cat.charAt(0).toUpperCase() + cat.slice(1);
  } else if (yr) {
    filterText = yr;
  }

  // Count upcoming & overdue as student count with positive pending balance
  data.upcoming = data.pending > 0 ? data.total_students : 0;
  data.overdue = data.upcoming;

  res.render('dashboard/index.html', {
    data,
    selected_category: cat,
    selected_year: yr,
    filter_text: filterText
  });
});

module.exports = {
  getDashboard
};
