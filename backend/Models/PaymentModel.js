// backend/Models/PaymentModel.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  country: String,
  address: String,
  city: String,
  zipCode: String,
}, { _id: false });

const CardSchema = new mongoose.Schema({
  cardName: String,
  last4: String,       // last 4 digits
  cardCipher: String,  // encrypted PAN
  cardIv: String,      // IV for AES-GCM
  provider: { type: String, default: 'demo' },
}, { _id: false });

const PaymentBlockSchema = new mongoose.Schema({
  method: { type: String, enum: ['card', 'bank'], required: true },
  // IMPORTANT: use "paid" for successful card payments
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  card: CardSchema,
  bankSlipPath: String,
}, { _id: false });

const AmountsSchema = new mongoose.Schema({
  subtotal: { type: Number, required: true },
  shipping: { type: Number, required: true },
  total:    { type: Number, required: true },
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  orderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'CustomOrder', required: true, index: true },
  orderNo:  { type: String, index: true },
  currency: { type: String, default: 'USD' },

  // 🔗 Who made this payment (buyer)
  buyerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

  customer: CustomerSchema,
  payment:  PaymentBlockSchema,
  amounts:  AmountsSchema,
}, { timestamps: true });

PaymentSchema.index({ buyerId: 1, createdAt: -1 });
PaymentSchema.index({ 'payment.status': 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
