const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getMySessions,
  revokeSession,
  revokeAllSessions,
  getPreferences,
  updatePreferences,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout-all', protect, revokeAllSessions);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

router.get('/sessions', protect, getMySessions);
router.delete('/sessions/:id', protect, revokeSession);

router.get('/preferences', protect, getPreferences);
router.put('/preferences', protect, updatePreferences);

module.exports = router;