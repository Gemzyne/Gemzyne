// backend/Controllers/CustomOrderController.js
const { nanoid } = require('nanoid');
const CustomOrder = require('../Models/CustomOrderModel');
const { computePricing, plus3Days } = require('../Utills/CustomPricing');

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// POST /api/orders
exports.createCustomOrder = async (req, res, next) => {
  try {
    const { type, shape, weight, grade, polish, symmetry } = req.body || {};
    if (![type, shape, weight, grade, polish, symmetry].every(v => v !== undefined && v !== null && v !== '')) {
      return res.status(400).json({ ok: false, message: 'Missing required selections' });
    }

    const pricing = computePricing({ type, shape, weight: Number(weight), grade, polish, symmetry });
    const estimatedFinishDate = plus3Days();
    const title = `${cap(type)} ${cap(shape)}`.trim();

    // Use CORD-... generator you requested
    const orderNo = `CORD-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    const order = await CustomOrder.create({
      orderNo,
      title,
      selections: { type, shape, weight, grade, polish, symmetry },
      pricing,
      currency: 'USD',
      estimatedFinishDate,
      status: 'pending',                 // <— IMPORTANT: must match model enum
    });

    return res.status(201).json({ ok: true, order });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id
exports.getCustomOrder = async (req, res, next) => {
  try {
    const order = await CustomOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });
    return res.json({ ok: true, order });    // <— Payment page expects ok:true
  } catch (err) {
    next(err);
  }
};
