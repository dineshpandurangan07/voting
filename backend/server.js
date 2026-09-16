require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/elections');
const candidateRoutes = require('./routes/candidates');
const voteRoutes = require('./routes/votes');
const voterRoutes = require('./routes/voters');
const resultRoutes = require('./routes/results');
const analyticsRoutes = require('./routes/analytics');
const securityRoutes = require('./routes/security');
const auditLogRoutes = require('./routes/audit-logs');
const notificationRoutes = require('./routes/notifications');

const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.get('/api/__diag', async (req, res) => {
  const out = {};
  try {
    const uri = process.env.MONGO_URI || '';
    out.hasURI = !!uri;
    out.host = (uri.match(/@([^/?]+)/) || [])[1] || '(none)';
    const dns = require('dns');
    try {
      out.srv = await new Promise((res2, rej2) => require('dns').resolveSrv('_mongodb._tcp.' + out.host, (e, a) => e ? rej2(e) : res2(String(a[0] && a[0].name))));
    } catch (e) { out.srv = 'SRV_ERR ' + e.code; }
    const mongoose = require('mongoose');
    try {
      await Promise.race([
        mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('forced-timeout')), 12000)),
      ]);
      out.connect = 'CONNECTED';
      await mongoose.disconnect();
    } catch (e) { out.connect = 'FAIL ' + e.name + ': ' + e.message; }
  } catch (e) { out.fatal = e.message; }
  res.json(out);
});

app.use(helmet());

app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
      ];
      const host = origin ? new URL(origin).hostname : '';
      const isVercel = host.endsWith('.vercel.app');
      if (!origin || allowed.includes(origin) || process.env.NODE_ENV !== 'production' || isVercel) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    maxAge: 86400,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

app.use('/api', limiter);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'VERAVOTE API',
      status: 'healthy',
      time: new Date().toISOString(),
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    // Do not crash the process; keep serving so health checks pass and
    // endpoints return friendly 500s until MONGO_URI is reachable.
    console.error(`MongoDB connection failed: ${error.message}`);
  }
  app.listen(PORT, () => {
    console.log(`VERAVOTE backend running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
};

startServer();

module.exports = app;