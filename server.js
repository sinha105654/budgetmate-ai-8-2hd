require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const userRoutes = require('./routes/users');
const budgetRoutes = require('./routes/budget');
const forecastRoutes = require('./routes/forecast');
const savingsCoachRoutes = require('./routes/savingsCoach');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/users', userRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/savings-tips', savingsCoachRoutes);

app.get('/api/status', (req, res) => {
  res.json({ message: 'BudgetMate AI API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));