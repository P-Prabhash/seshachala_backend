class StudentModel {
  constructor(data) {
    this.id = data.id;
    this.admissionNo = data.admission_no;
    this.name = data.name;
    this.category = data.category;
    this.fatherName = data.father_name;
    this.mobile = data.mobile;
    this.email = data.email;
    this.aadhaarNumber = data.aadhaar_number;
    this.course = data.course;
    this.yearSem = data.year_sem;
    this.admissionDate = data.admission_date;
    this.address = data.address;
    this.totalFee = parseFloat(data.total_fee || 0);
    this.active = data.active;
    this.photo = data.photo;
    this.createdAt = data.created_at;
  }
}

module.exports = StudentModel;
