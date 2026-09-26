const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Create a user (for prototype: one demo user is enough)
router.post('/', async (req, res) => {
  try {
    const { name, email, monthlyIncome } = req.body;
    if (!name || !email || monthlyIncome == null || monthlyIncome < 0) {
      return res.status(400).json({ error: 'name, email and a valid monthlyIncome are required' });
    }
    const user = await User.create({ name, email, monthlyIncome });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;