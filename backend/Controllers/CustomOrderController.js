// backend/Controllers/CustomOrderController.js
const { nanoid } = require('nanoid');
const CustomOrder = require('../Models/CustomOrderModel');
const { computePricing, plus3Days } = require('../Utills/CustomPricing');

//helper
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

    const orderNo = `CORD-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    const order = await CustomOrder.create({
      orderNo,
      title,
      selections: { type, shape, weight, grade, polish, symmetry },
      pricing,
      currency: 'USD',
      estimatedFinishDate,
      status: 'pending',                 // <— IMPORTANT: must match model enum
      buyerId: req.user.id, // 🔗 attach the logged-in user
      // ADDED: initialize orderStatus (seller tracking)
      orderStatus: "processing",
    });

    return res.status(201).json({ ok: true, order });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id
exports.getCustomOrder = async (req, res, next) => {
  try {
    // ADDED: populate buyer name fields so frontend can show a human name
    const order = await CustomOrder.findById(req.params.id)
      .populate('buyerId', 'name fullName firstName lastName username email'); // ← ADDED

    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });

    //Works whether buyerId is ObjectId or populated doc
    const buyerIdStr = (order.buyerId && order.buyerId._id)
      ? String(order.buyerId._id)
      : String(order.buyerId || '');
    const isOwner = buyerIdStr === String(req.user.id);
      const isStaff = ['seller', 'admin'].includes(req.user.role);
      if (!isOwner && !isStaff) return res.status(403).json({ ok: false, message: 'Forbidden' });
    
    return res.json({ ok: true, order });    // <— Payment page expects ok:true
  } catch (err) {
    next(err);
  }
};

/* ===========================
   ADDED (orderStatus): list / update / delete
   =========================== */

// GET /api/orders   (seller/admin) — list with pagination
// ADDED (orderStatus)
exports.listOrdersForSeller = async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (!['seller', 'admin'].includes(role)) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      // ADDED: populate buyer name fields so the frontend can show the name
      CustomOrder.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'name fullName firstName lastName username email'), // ← ADDED
      CustomOrder.countDocuments({}),
    ]);

    res.json({ ok: true, page, limit, total, items });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/order-status  (seller/admin) — update only orderStatus
// ADDED (orderStatus)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (!['seller', 'admin'].includes(role)) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const { id } = req.params;
    const { orderStatus } = req.body || {};
    const allowed = ['processing', 'shipped', 'completed'];
    if (!allowed.includes(orderStatus)) {
      return res.status(400).json({ ok: false, message: 'Invalid orderStatus' });
    }

    const order = await CustomOrder.findByIdAndUpdate(
      id,
      { $set: { orderStatus } },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });

    res.json({ ok: true, order });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/orders/:id  (seller/admin) — delete a row
// ADDED (orderStatus)
exports.deleteOrder = async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (!['seller', 'admin'].includes(role)) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const { id } = req.params;
    const deleted = await CustomOrder.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ ok: false, message: 'Order not found' });

    res.json({ ok: true, deletedId: id });
  } catch (err) {
    next(err);
  }
};
