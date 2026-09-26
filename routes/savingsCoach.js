const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await Transaction.find({ userId });

    if (transactions.length === 0) {
      return res.json({ tips: ['Log a few transactions first so I can give you personalised tips.'] });
    }

    // group spending by category
    const spending = {};
    transactions.forEach((t) => {
      spending[t.category] = (spending[t.category] || 0) + t.amount;
    });

    if (!process.env.GEMINI_API_KEY) {
      // Fallback if no API key is set yet - keeps the app usable while you set things up
      return res.json({ tips: fallbackTips(spending), source: 'fallback' });
    }

    const prompt = `You are a friendly financial coach. Given this month's spending by category in AUD: ${JSON.stringify(
      spending
    )}, reply with ONLY a JSON array of exactly 3 short, practical, encouraging savings tips (each under 20 words). No extra text, no markdown.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      // API failed - don't break the demo, fall back gracefully
      return res.json({ tips: fallbackTips(spending), source: 'fallback' });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    let tips;
    try {
      tips = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      tips = fallbackTips(spending);
    }

    res.json({ tips, source: 'ai' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Basic rule-based fallback so the feature still works if the API key is missing or the call fails
function fallbackTips(spending) {
  const entries = Object.entries(spending).sort((a, b) => b[1] - a[1]);
  const [topCategory] = entries[0] || ['spending'];
  return [
    `Your biggest spending category is ${topCategory} - review it for easy savings.`,
    'Try setting a weekly limit for your top category and track it daily.',
    'Small recurring costs add up - check subscriptions you rarely use.',
  ];
}

module.exports = router;