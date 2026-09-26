const mongoose = require('mongoose');

const budgetCategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, // e.g. "Rent", "Food", "Transport"
  budgetAmount: { type: Number, required: true, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('BudgetCategory', budgetCategorySchema);