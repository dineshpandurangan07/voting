const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const { jwtSecret } = require('../config/jwt');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact an administrator.',
      });
    }

    if (decoded.sessionId) {
      const session = await Session.findById(decoded.sessionId);

      if (!session || !session.isActive || (session.expiresAt && session.expiresAt < new Date())) {
        return res.status(401).json({
          success: false,
          message: 'Session has been terminated. Please sign in again.',
        });
      }

      if (session.user && session.user.toString() !== user._id.toString()) {
        return res.status(401).json({
          success: false,
          message: 'Session no longer valid. Please sign in again.',
        });
      }

      if (!session.lastSeen || session.lastSeen < new Date(Date.now() - 60 * 1000)) {
        session.lastSeen = new Date();
        await session.save().catch(() => {});
      }
    }

    req.user = user;
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: error.message,
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`,
      });
    }

    next();
  };
};