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

module.exports = router;