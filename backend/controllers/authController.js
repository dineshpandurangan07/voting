const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const SecurityEvent = require('../models/SecurityEvent');

const createNotification = async (userId, title, message, type = 'general') => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
    });
  } catch (error) {
    console.error(`Could not create notification: ${error.message}`);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const userRole = role && ['election_officer', 'auditor', 'super_admin'].includes(role) ? 'voter' : (role || 'voter');

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: userRole,
    });

    const token = user.generateAuthToken();

    await createNotification(
      user._id,
      'Account Created',
      `Welcome to VERAVOTE, ${user.name}! Your account has been created successfully.`,
      'general'
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          isVerified: user.isVerified,
          isActive: user.isActive,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      await AuditLog.create({
        action: 'failed_login',
        description: `Failed login attempt for email: ${email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
        metadata: { email },
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      await AuditLog.create({
        user: user._id,
        role: user.role,
        action: 'failed_login',
        description: `Failed login attempt for ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
        metadata: { email: user.email },
      });

      await SecurityEvent.create({
        user: user._id,
        event: 'failed_login',
        severity: 'medium',
        riskScore: 40,
        description: `Multiple failed login attempts detected for ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact an administrator.',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const session = await Session.create({
      user: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });
    session.token = session._id.toString();
    await session.save();

    const token = user.generateAuthToken(session._id);

    await AuditLog.create({
      user: user._id,
      role: user.role,
      action: 'login',
      description: `${user.name} logged in successfully`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { sessionId: session._id },
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          isVerified: user.isVerified,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.sessionId) {
      await Session.updateOne(
        { _id: req.sessionId },
        { isActive: false }
      );
    }

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'logout',
      description: `${req.user.name} logged out`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: req.sessionId ? { sessionId: req.sessionId } : {},
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    await AuditLog.create({
      user: user._id,
      role: user.role,
      action: 'profile_updated',
      description: `${user.name} updated their profile`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.matchPassword(oldPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    if (req.sessionId) {
      await Session.updateMany(
        { user: user._id, _id: { $ne: req.sessionId }, isActive: true },
        { isActive: false }
      );
    }

    await AuditLog.create({
      user: user._id,
      role: user.role,
      action: 'password_changed',
      description: `${user.name} changed their password`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    await createNotification(
      user._id,
      'Password Changed',
      'Your password has been changed successfully.',
      'security_alert'
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Other sessions have been logged out.',
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that email address',
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      user: user._id,
      role: user.role,
      action: 'admin_action',
      description: `Password reset requested for ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { email: user.email },
    });

    const devResetUrl = process.env.NODE_ENV !== 'production'
      ? `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`
      : undefined;

    res.status(200).json({
      success: true,
      message: 'Password reset token generated',
      data: {
        email: user.email,
        expiresIn: '30 minutes',
        devResetToken: devResetUrl ? resetToken : undefined,
        resetUrl: devResetUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const hashedToken = require('crypto')
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: true });

    await Session.updateMany(
      { user: user._id, isActive: true },
      { isActive: false }
    );

    await AuditLog.create({
      user: user._id,
      role: user.role,
      action: 'password_reset',
      description: `${user.email} reset their password`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

exports.getMySessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions.map((s) => ({
        id: s._id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        isActive: s.isActive,
        lastSeen: s.lastSeen,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        isCurrent: req.sessionId ? s._id.toString() === req.sessionId.toString() : false,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.revokeSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    session.isActive = false;
    await session.save();

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'session_revoked',
      description: `${req.user.name} revoked a session`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { sessionId: session._id },
    });

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.revokeAllSessions = async (req, res, next) => {
  try {
    await Session.updateMany(
      { user: req.user._id, isActive: true },
      { isActive: false }
    );

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'logout_all',
      description: `${req.user.name} signed out from all devices`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.status(200).json({
      success: true,
      message: 'Signed out from all devices',
    });
  } catch (error) {
    next(error);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user.preferences || {},
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const allowed = ['emailNotif', 'electionAlerts', 'securityAlerts', 'voteConfirmations'];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        req.user.preferences = req.user.preferences || {};
        req.user.preferences[key] = Boolean(req.body[key]);
      }
    }

    await req.user.save();

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'preferences_updated',
      description: `${req.user.name} updated notification preferences`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: req.user.preferences,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.createNotification = createNotification;