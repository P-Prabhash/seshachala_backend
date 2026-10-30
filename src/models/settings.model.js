class CollegeSettingsModel {
  constructor(data) {
    this.id = data.id || 1;
    this.collegeName = data.college_name || 'Seshachala';
    this.subtitle = data.subtitle || 'College of Pharmacy';
    this.address = data.address || '';
    this.phone = data.phone || '';
    this.email = data.email || '';
    this.website = data.website || '';
    this.logoPath = data.logo_path || '/static/images/logo.png';
  }
}

module.exports = CollegeSettingsModel;
