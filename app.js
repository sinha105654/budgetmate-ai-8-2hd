require('dotenv').config();
const express = require('express');
const cors = require('cors');
const quickLogRoutes = require('./routes/quickLog');

const userRoutes = require('./routes/users');
const budgetRoutes = require('./routes/budget');
const forecastRoutes = require('./routes/forecast');
const savingsCoachRoutes = require('./routes/savingsCoach');

const app = express();
const mongoose = require('mongoose');
const client = require('prom-client');

// Metrics: counts requests and times them, so Prometheus can watch the app
client.collectDefaultMetrics();
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of requests',
  labelNames: ['method', 'route', 'status'],
});
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'How long requests take',
  labelNames: ['method', 'route', 'status'],
});

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    httpRequests.inc({ method: req.method, route, status: res.statusCode });
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
});
app.use(express.static('public'));

app.use('/api/users', userRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/savings-tips', savingsCoachRoutes);
app.use('/api/quick-log', quickLogRoutes);

app.get('/api/status', (req, res) => {
  res.json({ message: 'BudgetMate AI API is running' });
});

// Health check: used by Docker and the monitoring tool
app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'database down' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = app;
