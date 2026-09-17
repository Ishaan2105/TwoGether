const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const duoRoutes = require('./routes/duoRoutes');
const habitRoutes = require('./routes/habitRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Required on Render / reverse proxies so express-rate-limit tracks individual client IPs, not the shared proxy IP
app.set('trust proxy', 1);

// Middleware order: helmet → cors → json → rate limiter → routes → 404 → error handler
app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));

// Health check (always exempt from rate limiting)
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

// Apply rate limiter ONLY to /api calls (never to static files, images, or index.html)
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/duo', duoRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuild));
  // Catch-all: send index.html for any non-API route (React Router)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
} else {
  // 404 handler for API-only dev mode
  app.use(notFound);
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`TwoGether API listening on http://localhost:${PORT}`);
  });
});