// backend/Models/CustomOrderModel.js
const mongoose = require('mongoose');

const SelectionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  shape: { type: String, required: true },
  weight: { type: Number, required: true },
  grade: { type: String, required: true },
  polish: { type: String, required: true },
  symmetry: { type: String, required: true },
}, { _id: false });

const PricingSchema = new mongoose.Schema({
  basePrice: Number,
  shapePrice: Number,
  weightPrice: Number,
  gradePrice: Number,
  polishPrice: Number,
  symmetryPrice: Number,
  subtotal: { type: Number, required: true },
}, { _id: false });

const CustomOrderSchema = new mongoose.Schema({
  orderNo: { type: String, unique: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional
  title: String,
  selections: { type: SelectionSchema, required: true },
  pricing: { type: PricingSchema, required: true },
  currency: { type: String, default: 'USD' },
  estimatedFinishDate: { type: Date, required: true },

  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
}, { timestamps: true });

CustomOrderSchema.index({ status: 1 });
CustomOrderSchema.index({ buyerId: 1 });

module.exports = mongoose.model('CustomOrder', CustomOrderSchema);
