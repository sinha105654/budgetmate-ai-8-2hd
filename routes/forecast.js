const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Simple forecast: average daily spend so far this month, projected to a full 30 days,
// plus a basic trend comparing the first half vs second half of logged transactions.
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await Transaction.find({ userId }).sort({ date: 1 });

    if (transactions.length === 0) {
      return res.json({ message: 'No transactions yet', forecastTotal: 0, trend: 'flat' });
    }

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const firstDate = transactions[0].date;
    const daysSoFar = Math.max(
      1,
      Math.ceil((Date.now() - new Date(firstDate)) / (1000 * 60 * 60 * 24))
    );

    // Not enough history yet to extrapolate responsibly - a single day's spending
    // projected across 30 days produces wildly unrealistic numbers. Show the
    // actual total instead, with a note, until there's at least 3 days of data.
    const MIN_DAYS_FOR_FORECAST = 3;
    if (daysSoFar < MIN_DAYS_FOR_FORECAST) {
      return res.json({
        notEnoughData: true,
        totalSoFar: Math.round(total),
        daysSoFar,
        message: `Log spending for ${MIN_DAYS_FOR_FORECAST - daysSoFar} more day(s) to see an accurate forecast.`,
      });
    }

    const dailyAverage = total / daysSoFar;
    const forecastTotal = Math.round(dailyAverage * 30);

    // basic trend: compare spend in first half vs second half of the logged period
    const mid = Math.floor(transactions.length / 2);
    const firstHalfTotal = transactions.slice(0, mid).reduce((s, t) => s + t.amount, 0);
    const secondHalfTotal = transactions.slice(mid).reduce((s, t) => s + t.amount, 0);
    const trend = secondHalfTotal > firstHalfTotal ? 'rising' : secondHalfTotal < firstHalfTotal ? 'falling' : 'flat';

    res.json({ dailyAverage: Math.round(dailyAverage), forecastTotal, trend, daysSoFar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily spending calendar for the current month - powers the heatmap-style
// calendar view on the Spending Forecast tab.
router.get('/calendar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed (0 = January)

    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Group spending by day-of-month (1-31)
    const dailyTotals = {};
    transactions.forEach((t) => {
      const day = new Date(t.date).getDate();
      dailyTotals[day] = Math.round((dailyTotals[day] || 0) + t.amount);
    });

    const daysInMonth = endOfMonth.getDate();
    const firstWeekday = startOfMonth.getDay(); // 0 = Sunday, for calendar grid alignment
    const highestDay = Math.max(0, ...Object.values(dailyTotals));

    res.json({ year, month, daysInMonth, firstWeekday, dailyTotals, highestDay });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;