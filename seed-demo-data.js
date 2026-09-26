// One-time script to backfill realistic demo transactions before today's date,
// so the Spending Calendar and Forecast have history to show in your demo video.
//
// Usage: node seed-demo-data.js <userId>
// Find your userId by running this in your browser console (F12 -> Console):
//   localStorage.getItem('budgetmate_user_id')

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const BudgetCategory = require('./models/BudgetCategory');

async function seed() {
  const userId = process.argv[2];
  if (!userId) {
    console.log('Usage: node seed-demo-data.js <userId>');
    console.log('Find your userId in the browser console with: localStorage.getItem("budgetmate_user_id")');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/budgetmate');
  console.log('Connected to MongoDB');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Spread across the days leading up to today, with a few bigger spend days
  // mixed in so the calendar heatmap actually shows light/dark variation.
  const demoTransactions = [
    { day: 3, category: 'Food', amount: 45, note: 'Groceries' },
    { day: 4, category: 'Transport', amount: 20, note: 'Fuel' },
    { day: 6, category: 'Food', amount: 35, note: 'Takeout' },
    { day: 9, category: 'Entertainment', amount: 60, note: 'Movies' },
    { day: 10, category: 'Food', amount: 200, note: 'Big weekly shop' },
    { day: 12, category: 'Transport', amount: 25, note: 'Fuel' },
    { day: 15, category: 'Food', amount: 15, note: 'Coffee run' },
    { day: 16, category: 'Entertainment', amount: 60, note: 'Concert ticket' },
    { day: 18, category: 'Food', amount: 40, note: 'Groceries' },
    { day: 20, category: 'Transport', amount: 30, note: 'Rideshare' },
    { day: 22, category: 'Food', amount: 95, note: 'Weekly shop' },
    { day: 23, category: 'Entertainment', amount: 40, note: 'Streaming + snacks' },
    { day: 25, category: 'Food', amount: 55, note: 'Groceries' },
  ];

  // Make sure matching budget categories exist too, so the Budget Planner
  // tab stays consistent with this seeded history (only creates ones missing).
  const categoryBudgets = { Food: 500, Transport: 150, Entertainment: 150 };
  for (const [name, budgetAmount] of Object.entries(categoryBudgets)) {
    const existing = await BudgetCategory.findOne({ userId, name });
    if (!existing) {
      await BudgetCategory.create({ userId, name, budgetAmount });
      console.log(`Created category: ${name} ($${budgetAmount})`);
    }
  }

  let inserted = 0;
  for (const t of demoTransactions) {
    const date = new Date(year, month, t.day, 12, 0, 0);
    if (date > now) continue; // never backdate into the future
    await Transaction.create({ userId, category: t.category, amount: t.amount, note: t.note, date });
    inserted++;
  }

  console.log(`Seeded ${inserted} demo transactions for ${month + 1}/${year}.`);
  await mongoose.disconnect();
  console.log('Done - refresh your browser to see the calendar and forecast update.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});