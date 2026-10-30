class UserModel {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.passwordHash = data.password_hash;
    this.fullName = data.full_name;
    this.role = data.role;
    this.active = data.active;
    this.createdAt = data.created_at;
    this.lastLogin = data.last_login;
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
      role: this.role,
      active: Boolean(this.active),
      createdAt: this.createdAt,
      lastLogin: this.lastLogin
    };
  }
}

module.exports = UserModel;
