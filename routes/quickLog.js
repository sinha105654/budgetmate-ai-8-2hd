const express = require('express');
const router = express.Router();
const BudgetCategory = require('../models/BudgetCategory');
const { askGemini } = require('../utils/gemini');

// Turns a sentence like "spent 12 on sport" into { category, amount, note }.
// It does NOT save anything. The user checks it and clicks Log Spend.
router.post('/', async (req, res) => {
  try {
    const { userId, text } = req.body;
    if (!userId || !text || !text.trim()) {
      return res.status(400).json({ error: 'userId and text are required' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI is not set up. Please use the form below.' });
    }

    const categories = await BudgetCategory.find({ userId });
    const names = categories.map((c) => c.name);
    if (names.length === 0) {
      return res.status(400).json({ error: 'Add a budget category first.' });
    }

    const prompt = `Turn this message into one spending entry. Message: ${JSON.stringify(
      text
    )}. Allowed categories: ${JSON.stringify(
      names
    )}. Reply with ONLY a JSON object like {"category":"Food","amount":12.5,"note":"coffee"}. The category must be exactly one of the allowed categories, or null if none fit. amount is a number in AUD. note is 1 to 4 words. No extra text, no markdown.`;

    const data = await askGemini(prompt);
    if (!data) {
      return res.status(503).json({ error: 'The AI is busy right now. Please try again or use the form below.' });
    }

    const rawText =
      (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('') || '{}';

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch (e) {
      return res.status(422).json({ error: "Sorry, I couldn't understand that. Try: spent 12 on sport" });
    }

    const amount = Number(parsed.amount);
    const category = names.find(
      (n) => n.toLowerCase() === String(parsed.category || '').toLowerCase()
    );

    if (!category || !Number.isFinite(amount) || amount < 0) {
      return res.status(422).json({
        error: `I couldn't match that to one of your categories (${names.join(', ')}).`,
      });
    }

    res.json({ category, amount, note: parsed.note || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;