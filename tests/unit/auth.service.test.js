const authService = require('../../src/services/auth.service');
const userRepository = require('../../src/repositories/user.repository');

jest.mock('../../src/repositories/user.repository');

describe('AuthService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should throw error for non-existent user', async () => {
    userRepository.findByUsername.mockResolvedValue(null);

    await expect(authService.authenticateUser('unknown', 'pass'))
      .rejects.toThrow('Invalid username or password.');
  });

  test('should throw error for incorrect password', async () => {
    userRepository.findByUsername.mockResolvedValue({
      id: 1,
      username: 'admin',
      password_hash: '$2a$10$abcdefghijklmnopqrstuu'
    });

    await expect(authService.authenticateUser('admin', 'wrongpass'))
      .rejects.toThrow('Invalid username or password.');
  });
});
