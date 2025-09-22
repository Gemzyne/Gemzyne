// backend/Controllers/PaymentController.js
const Payment = require('../Models/PaymentModel');
const CustomOrder = require('../Models/CustomOrderModel');
const { encrypt } = require('../Utills/Crypto');
const Winner = require('../Models/Winner');
const Auction = require('../Models/Auction');

function getShipping(country) {
  if (!country) return 0;
  return country === 'LK' ? 20 : 100;
}

function parseMaybeJSON(v) {
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
}

// POST /api/orders/:id/checkout
// Card: JSON body
// Bank: multipart/form-data with field "slip" and stringified "customer" & "payment"
exports.checkout = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await CustomOrder.findById(orderId);
    if (!order) return res.status(404).json({ ok: false, error: 'ORDER_NOT_FOUND' });

    if (order.status === 'cancelled') {
      return res.status(400).json({ ok: false, error: 'ORDER_CANCELLED' });
    }

    // 🔒 claim ownership or enforce it
    if (order.buyerId && order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'NOT_YOUR_ORDER' });
    }
    if (!order.buyerId) {
      order.buyerId = req.user.id; // attach on first checkout
      await order.save();
    }

    const customerRaw = parseMaybeJSON(req.body.customer) || {};
    const paymentRaw  = parseMaybeJSON(req.body.payment)  || {};
    const country     = (req.body.country || customerRaw.country || '').trim();

    // amounts
    const shipping = getShipping(country);
    const subtotal = Number(order?.pricing?.subtotal || 0);
    const total    = subtotal + shipping;

    // payment block
    const method = (paymentRaw.method || 'card').trim();
    const paymentBlock = {
      method,
      status: 'pending',     // default; will set to 'paid' for card below
    };

    if (method === 'card') {
      const remember  = !!paymentRaw.remember;
      const cardName  = paymentRaw.card?.cardName || '';
      const rawNumber = (paymentRaw.card?.cardNumber || '').replace(/\s/g, '');

      if (remember && rawNumber) {
        const last4 = rawNumber.slice(-4);
        const { cipher, iv } = encrypt(rawNumber);
        paymentBlock.card = { cardName, last4, cardCipher: cipher, cardIv: iv };
      }

      // demo: instantly paid for card
      paymentBlock.status = 'paid';
    } else if (method === 'bank') {
      // keep pending until seller verifies
      if (req.file) paymentBlock.bankSlipPath = req.file.path;
    }

    const customer = {
      fullName: customerRaw.fullName || '',
      email:    customerRaw.email || '',
      phone:    customerRaw.phone || '',
      country:  customerRaw.country || country || '',
      address:  customerRaw.address || '',
      city:     customerRaw.city || '',
      zipCode:  customerRaw.zipCode || '',
    };

    // Upsert one Payment per orderId
    const paymentDoc = await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        orderNo: order.orderNo,
        currency: order.currency || 'USD',
        buyerId: order.buyerId, // 🔗 attach the logged-in user
        customer,
        payment: paymentBlock,
        amounts: { subtotal, shipping, total },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Update CustomOrder.status
    if (method === 'card') {
      if (order.status !== 'paid') {
        order.status = 'paid';
        await order.save();
      }
    } else {
      // bank transfer remains pending
      if (order.status !== 'pending') {
        order.status = 'pending';
        await order.save();
      }
    }

    // === NEW: Sync Winner.purchaseStatus based on Payment ===
    // Lookup Winner by auctionCode == order.orderNo (for auction-originated orders)
    // If no Winner found, it's probably a regular custom order — skip safely.
    try {
      let w = await Winner.findOne({ auctionCode: order.orderNo, user: order.buyerId });
    if (!w) {
      // Fallback: find auction by its human code then winner by auction _id
      const a = await Auction.findOne({ auctionId: order.orderNo }).select('_id');
      if (a) w = await Winner.findOne({ auction: a._id, user: order.buyerId });
    }
      if (w) {
        // reflect current payment status
        if (paymentBlock.status === 'paid') {
          w.purchaseStatus = 'paid';
          w.paymentId = paymentDoc._id;
        } else if (paymentBlock.status === 'pending') {
          w.purchaseStatus = 'pending';
          w.paymentId = paymentDoc._id; // keep link even when pending
        } else if (paymentBlock.status === 'cancelled') {
          w.purchaseStatus = 'cancelled';
          w.paymentId = null;
        }
        await w.save();
      }
    } catch (e) {
      // don’t fail checkout if winner sync fails; just log
      console.warn('Winner sync (checkout) error:', e.message);
    }

    return res.json({
      ok: true,
      paymentId: paymentDoc._id,
      orderId: order._id,
      orderNo: order.orderNo,
      total: paymentDoc.amounts.total,
      paymentStatus: paymentDoc.payment.status,  // 'pending' | 'paid'
      orderStatus: order.status,                 // 'pending' | 'paid' | 'cancelled'
    });
  } catch (err) {
    next(err);
  }
};




// ========= Listings & management ===========

// GET /api/payments/my?status=&page=&limit=
exports.listMyPayments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);

    const q = { buyerId: req.user.id };
    if (status) q['payment.status'] = status;

    const [items, total] = await Promise.all([
      Payment.find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: 'orderId', select: 'title selections pricing status estimatedFinishDate' }),
      Payment.countDocuments(q),
    ]);

    res.json({
      ok: true,
      page, limit, total, pages: Math.ceil(total / limit),
      items,
    });
  } catch (err) { next(err); }
};

// GET /api/payments (seller/admin) — list all
// supports ?status=&buyer=&orderNo=&page=&limit=
exports.listAllPayments = async (req, res, next) => {
  try {
    const { status, buyer, orderNo } = req.query;
    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);

    const q = {};
    if (status) q['payment.status'] = status;
    if (buyer)  q['buyerId'] = buyer;
    if (orderNo) q['orderNo'] = orderNo;

    const [items, total] = await Promise.all([
      Payment.find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: 'buyerId', select: 'fullName email phone' })
        .populate({ path: 'orderId', select: 'title pricing status estimatedFinishDate' }),
      Payment.countDocuments(q),
    ]);

    res.json({ ok: true, page, limit, total, pages: Math.ceil(total / limit), items });
  } catch (err) { next(err); }
};

// GET /api/payments/:id (owner or seller/admin)
exports.getPaymentById = async (req, res, next) => {
  try {
    const p = await Payment.findById(req.params.id)
      .populate({ path: 'buyerId', select: 'fullName email phone' })
      .populate({ path: 'orderId', select: 'title pricing status estimatedFinishDate' });

    if (!p) return res.status(404).json({ ok: false, message: 'Not found' });

    const isOwner = p.buyerId && p.buyerId._id?.toString() === req.user.id;
    const isStaff = ['seller', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaff) return res.status(403).json({ ok: false, message: 'Forbidden' });

    res.json({ ok: true, payment: p });
  } catch (err) { next(err); }
};

// PATCH /api/payments/:id/mark-paid  (seller/admin) — confirm bank transfers
exports.markBankPaid = async (req, res, next) => {
  try {
    const p = await Payment.findById(req.params.id);
    if (!p) return res.status(404).json({ ok: false, message: 'Not found' });
    if (p.payment.method !== 'bank') {
      return res.status(400).json({ ok: false, message: 'Only bank payments can be marked paid' });
    }
    if (p.payment.status === 'paid') {
      return res.json({ ok: true, message: 'Already paid', payment: p });
    }

    p.payment.status = 'paid';
    await p.save();

    // sync order
    await CustomOrder.findByIdAndUpdate(p.orderId, { $set: { status: 'paid' } });

    // === NEW: Sync Winner.purchaseStatus too ===
    try {
      // For auction-originated orders, orderNo is the auctionCode (AUC-YYYY-###)
      const w = await Winner.findOne({ auctionCode: p.orderNo, user: p.buyerId });
      if (w) {
        w.purchaseStatus = 'paid';
        w.paymentId = p._id;
        await w.save();
      }
    } catch (e) {
      console.warn('Winner sync (markBankPaid) error:', e.message);
    }

    res.json({ ok: true, message: 'Marked as paid', payment: p });
  } catch (err) { next(err); }
};

// PATCH /api/payments/:id/status  (seller/admin)
// body: { status: 'pending' | 'paid' | 'cancelled' }
exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const nextStatus = String(req.body?.status || '').toLowerCase();

    if (!['pending', 'paid', 'cancelled'].includes(nextStatus)) {
      return res.status(400).json({ ok: false, message: 'Invalid status' });
    }

    const p = await Payment.findById(id);
    if (!p) return res.status(404).json({ ok: false, message: 'Not found' });

    // require seller/admin
    const isStaff = ['seller', 'admin'].includes(req.user.role);
    if (!isStaff) return res.status(403).json({ ok: false, message: 'Forbidden' });

    // only bank payments can be manually changed
    if (p.payment?.method !== 'bank') {
      return res.status(400).json({ ok: false, message: 'Only bank payments can be manually changed' });
    }

    const cur = p.payment?.status || 'pending';
    if (cur === nextStatus) {
      return res.json({ ok: true, message: 'No change', payment: p });
    }

    // 'paid' and 'cancelled' are final
    if (cur === 'paid') {
      return res.status(400).json({ ok: false, message: 'Paid payments are final' });
    }
    if (cur === 'cancelled') {
      return res.status(400).json({ ok: false, message: 'Cancelled payments are final' });
    }

    // helper: sync related docs (CustomOrder + Winner) based on status
    async function syncRelated(orderStatus) {
      // sync order
      await CustomOrder.findByIdAndUpdate(p.orderId, { $set: { status: orderStatus } });

      // sync winner (try by auctionCode == orderNo; fallback via Auction._id)
      try {
        let w = await Winner.findOne({ auctionCode: p.orderNo, user: p.buyerId });
        if (!w) {
          const a = await Auction.findOne({ auctionId: p.orderNo }).select('_id');
          if (a) w = await Winner.findOne({ auction: a._id, user: p.buyerId });
        }
        if (w) {
          if (orderStatus === 'paid') {
            w.purchaseStatus = 'paid';
            w.paymentId = p._id;
          } else if (orderStatus === 'pending') {
            w.purchaseStatus = 'pending';
            w.paymentId = p._id;
          } else if (orderStatus === 'cancelled') {
            w.purchaseStatus = 'cancelled';
            w.paymentId = null;
          }
          await w.save();
        }
      } catch (e) {
        console.warn('Winner sync (updateStatus) error:', e.message);
      }
    }

    // allowed transitions only from 'pending'
    if (nextStatus === 'paid') {
      p.payment.status = 'paid';
      await p.save();
      await syncRelated('paid');
      return res.json({ ok: true, payment: p });
    }

    if (nextStatus === 'cancelled') {
      p.payment.status = 'cancelled';
      await p.save();
      await syncRelated('cancelled');
      return res.json({ ok: true, payment: p });
    }

    // pending -> pending (no-op but keep consistent)
    p.payment.status = 'pending';
    await p.save();
    await syncRelated('pending');
    return res.json({ ok: true, payment: p });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/payments/:id/card  (buyer who owns it OR staff)
// Removes the saved card block from a Payment document
exports.deleteSavedCard = async (req, res, next) => {
  try {
    const p = await Payment.findById(req.params.id);
    if (!p) return res.status(404).json({ ok: false, message: 'Not found' });

    const isOwner = p.buyerId?.toString() === req.user.id;
    const isStaff = ['seller', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    if (p.payment?.method !== 'card') {
      return res.status(400).json({ ok: false, message: 'Only card payments can have saved cards' });
    }
    if (!p.payment?.card) {
      return res.status(400).json({ ok: false, message: 'No saved card on this payment' });
    }

    // Remove the saved card details
    p.payment.card = undefined;
    await p.save();

    return res.json({ ok: true, message: 'Card removed', paymentId: p._id });
  } catch (err) {
    next(err);
  }
};
