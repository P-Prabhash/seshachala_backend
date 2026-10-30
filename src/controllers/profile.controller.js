const profileService = require('../services/profile.service');
const asyncHandler = require('../utils/async-handler');

const getProfile = asyncHandler(async (req, res) => {
  const userId = req.session.user_id;
  const user = await profileService.getUserProfile(userId);

  res.render('profile/index.html', { user });
});

const postProfileUpdate = asyncHandler(async (req, res) => {
  const userId = req.session.user_id;
  const action = req.body.action || 'update_profile';

  try {
    if (action === 'update_profile') {
      await profileService.updateProfile(userId, req.body.full_name, req.body.email);
      req.session.full_name = req.body.full_name.trim();
      req.flash('success', 'Profile information updated.');
    } else if (action === 'update_account') {
      await profileService.updateAccount(userId, req.body);
      req.session.username = req.body.username.trim();
      req.flash('success', 'Account credentials updated.');
    }
  } catch (error) {
    req.flash('error', error.message || 'Unable to update profile.');
  }

  res.redirect('/profile');
});

module.exports = {
  getProfile,
  postProfileUpdate
};
