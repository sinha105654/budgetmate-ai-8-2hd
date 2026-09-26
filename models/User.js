const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  monthlyIncome: { type: Number, required: true, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);