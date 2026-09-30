const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const BudgetCategory = require('../models/BudgetCategory');
const { getMonthRange } = require('../utils/month');

// If the first model is busy, the app tries the second one
const MODELS = ['gemini-flash-lite-latest', 'gemini-3.8-flash'];

async function askGemini(prompt) {
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (response.ok) return await response.json();

      console.log(`GEMINI ERROR (${model}, try ${attempt}):`, response.status);

      // Only try again if Google is busy (503) or we hit the limit (429)
      if (response.status !== 503 && response.status !== 429) break;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { start, end } = getMonthRange();

    // Only this month's spending, and only categories that still exist
    const categories = await BudgetCategory.find({ userId });
    const names = categories.map((c) => c.name);

    const transactions = (
      await Transaction.find({ userId, date: { $gte: start, $lte: end } })
    ).filter((t) => names.includes(t.category));

    if (transactions.length === 0) {
      return res.json({ tips: ['Log a few transactions first so I can give you personalised tips.'] });
    }

    const spending = {};
    transactions.forEach((t) => {
      spending[t.category] = (spending[t.category] || 0) + t.amount;
    });

    const budgets = {};
    categories.forEach((c) => {
      budgets[c.name] = c.budgetAmount;
    });

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ tips: fallbackTips(spending, budgets), source: 'fallback' });
    }

    const prompt = `You are a friendly financial coach. This month's spending by category in AUD: ${JSON.stringify(
      spending
    )}. Monthly budgets by category in AUD: ${JSON.stringify(
      budgets
    )}. Reply with ONLY a JSON array of exactly 3 short, practical, encouraging savings tips (each under 20 words). Mention any category that is close to or over its budget. No extra text, no markdown.`;

    const data = await askGemini(prompt);
    if (!data) {
      return res.json({ tips: fallbackTips(spending, budgets), source: 'fallback' });
    }

    const rawText =
      (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('') || '[]';

    let tips;
    try {
      tips = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.log('PARSE FAILED. Raw text was:', rawText);
      return res.json({ tips: fallbackTips(spending, budgets), source: 'fallback' });
    }

    res.json({ tips, source: 'ai' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple backup tips if the AI can't be reached
function fallbackTips(spending, budgets) {
  const entries = Object.entries(spending).sort((a, b) => b[1] - a[1]);
  const [topCategory] = entries[0] || ['spending'];

  const over = Object.keys(spending).find((c) => budgets[c] != null && spending[c] > budgets[c]);
  const first = over
    ? `You are over your ${over} budget this month - try cutting back there first.`
    : `Your biggest spending category is ${topCategory} - review it for easy savings.`;

  return [
    first,
    'Try setting a weekly limit for your top category and track it daily.',
    'Small recurring costs add up - check subscriptions you rarely use.',
  ];
}

module.exports = router;