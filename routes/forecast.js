const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const BudgetCategory = require('../models/BudgetCategory');
const { getMonthRange } = require('../utils/month');

// Forecast for THIS month only:
// average spend per day so far this month, projected to the full month.
// Only counts categories that still exist in the budget.
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { start, end, daysInMonth, dayOfMonth } = getMonthRange();

    const categories = await BudgetCategory.find({ userId });
    const names = categories.map((c) => c.name);

    const transactions = (
      await Transaction.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: 1 })
    ).filter((t) => names.includes(t.category));

    if (transactions.length === 0) {
      return res.json({ message: 'No transactions yet this month', forecastTotal: 0, trend: 'flat' });
    }

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const daysSoFar = dayOfMonth;

    // Too early in the month to project responsibly.
    // A day or two of spending stretched across a month gives unrealistic numbers.
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
    const forecastTotal = Math.round(dailyAverage * daysInMonth);

    // Trend: compare the first half vs the second half of this month's transactions
    const mid = Math.floor(transactions.length / 2);
    const firstHalfTotal = transactions.slice(0, mid).reduce((s, t) => s + t.amount, 0);
    const secondHalfTotal = transactions.slice(mid).reduce((s, t) => s + t.amount, 0);
    const trend =
      secondHalfTotal > firstHalfTotal ? 'rising' : secondHalfTotal < firstHalfTotal ? 'falling' : 'flat';

    res.json({ dailyAverage: Math.round(dailyAverage), forecastTotal, trend, daysSoFar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily spending calendar for the current month.
// Only counts categories that still exist in the budget.
router.get('/calendar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { start, end, daysInMonth } = getMonthRange();

    const categories = await BudgetCategory.find({ userId });
    const names = categories.map((c) => c.name);

    const transactions = (
      await Transaction.find({ userId, date: { $gte: start, $lte: end } })
    ).filter((t) => names.includes(t.category));

    const dailyTotals = {};
    transactions.forEach((t) => {
      const day = new Date(t.date).getDate();
      dailyTotals[day] = Math.round((dailyTotals[day] || 0) + t.amount);
    });

    const firstWeekday = start.getDay(); // 0 = Sunday, for the calendar grid
    const highestDay = Math.max(0, ...Object.values(dailyTotals));

    res.json({
      year: start.getFullYear(),
      month: start.getMonth(),
      daysInMonth,
      firstWeekday,
      dailyTotals,
      highestDay,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;