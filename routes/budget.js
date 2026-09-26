const express = require('express');
const router = express.Router();
const BudgetCategory = require('../models/BudgetCategory');
const Transaction = require('../models/Transaction');

// Create or update a budget category for a user
router.post('/categories', async (req, res) => {
  try {
    const { userId, name, budgetAmount } = req.body;
    if (!userId || !name || budgetAmount == null || budgetAmount < 0) {
      return res.status(400).json({ error: 'userId, name and a valid budgetAmount are required' });
    }
    const category = await BudgetCategory.create({ userId, name, budgetAmount });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log a transaction
router.post('/transactions', async (req, res) => {
  try {
    const { userId, category, amount, note } = req.body;
    if (!userId || !category || amount == null || amount < 0) {
      return res.status(400).json({ error: 'userId, category and a valid amount are required' });
    }
    const transaction = await Transaction.create({ userId, category, amount, note });
    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get budget-vs-spent summary per category (for the progress bars)
router.get('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const categories = await BudgetCategory.find({ userId });
    const transactions = await Transaction.find({ userId });

    const summary = categories.map((cat) => {
      const spent = transactions
        .filter((t) => t.category === cat.name)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        category: cat.name,
        budgetAmount: cat.budgetAmount,
        spent,
        remaining: cat.budgetAmount - spent,
        percentUsed: cat.budgetAmount > 0 ? Math.round((spent / cat.budgetAmount) * 100) : 0,
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
