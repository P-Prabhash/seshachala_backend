class StaffModel {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.name = data.name;
    this.username = data.username;
    this.mobile = data.mobile;
    this.email = data.email;
    this.role = data.role;
    this.status = data.status;
    this.createdAt = data.created_at;
    this.lastLogin = data.last_login;
  }
}

module.exports = StaffModel;
