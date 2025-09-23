// backend/Controllers/PaymentController.js
const Payment = require('../Models/PaymentModel');
const CustomOrder = require('../Models/CustomOrderModel');
const { encrypt } = require('../Utills/Crypto');
const Winner = require('../Models/Winner');
const Auction = require('../Models/Auction');
const Gem = require('../Models/AddGems/Gem');

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

async function markGemSoldForOrder(order) {
  try {
    const gemId = order?.gemId || order?.selections?.gem?.id;
    if (!gemId) return;

    const gem = await Gem.findById(gemId);
    if (!gem) return;

    // If it’s already sold or out of stock, do nothing
    const cur = String(gem.status || '').toLowerCase().replace(/\s+/g, '_');
    if (['sold','out_of_stock'].includes(cur)) return;

    gem.status = 'sold';
    gem.isActive = false;
    await gem.save();
  } catch (e) {
    console.warn('Could not mark gem sold for order', order?._id, e?.message || e);
  }
}

// === helper: reserve gem when order is paid ===
async function markGemReservedForOrder(order) {
  try {
    const gemId = order?.gemId || order?.selections?.gem?.id;
    if (!gemId) return;

    const gem = await Gem.findById(gemId);
    if (!gem) return;

    const cur = String(gem.status || '').toLowerCase().replace(/\s+/g, '_');
    if (!['reserved','sold','out_of_stock'].includes(cur)) {
      gem.status = 'reserved';
      await gem.save();
    }
  } catch (e) {
    console.warn('Could not reserve gem for order', order?._id, e?.message || e);
  }
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
        // === reserve gem now that it's paid ===
        await markGemSoldForOrder(order);
      }
    } else {
      // bank transfer remains pending
      if (order.status !== 'pending') {
        order.status = 'pending';
        await order.save();
      }
      // Reserve the gem while we wait for bank verification
      await markGemReservedForOrder(order);
    }

    // Sync Winner.purchaseStatus based on Payment ===
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

// --- NEW: one-shot checkout directly from a gem (no precreated order) ---
exports.checkoutFromGem = async (req, res, next) => {
  const CustomOrder = require('../Models/CustomOrderModel');
  const Gem = require('../Models/AddGems/Gem');

  // helpers reused from the standard checkout above
  const finalizeGemSoldForOrder = async (order) => {
    try {
      let gemId = order?.gemId || order?.selections?.gem?.id;
      if (!gemId) return;
      const gem = await Gem.findById(gemId);
      if (!gem) return;
      gem.status = 'sold';
      gem.isActive = false;
      await gem.save();
    } catch (e) {
      console.warn('finalizeGemSoldForOrder (fromGem) error:', e.message);
    }
  };
  const ensureGemReservedForOrder = async (order) => {
    try {
      let gemId = order?.gemId || order?.selections?.gem?.id;
      if (!gemId) return;
      const gem = await Gem.findById(gemId);
      if (!gem) return;
      if (gem.status === 'in_stock') {
        gem.status = 'reserved';
        await gem.save();
      }
    } catch (e) {
      console.warn('ensureGemReservedForOrder (fromGem) error:', e.message);
    }
  };

  try {
    const buyerId = req.user?.id || req.user?._id;
    if (!buyerId) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });

    const { gemId } = req.params;
    let gem;
    try { gem = await Gem.findById(gemId); } catch { return res.status(400).json({ ok: false, error: 'INVALID_GEM' }); }
    if (!gem) return res.status(404).json({ ok: false, error: 'GEM_NOT_FOUND' });
    const s = String(gem.status || '').toLowerCase().replace(/\s+/g,'_');
    if (['sold','out_of_stock','reserved'].includes(s)) {
    return res.status(400).json({ ok: false, error: 'GEM_UNAVAILABLE' });
}

    // Build order data (use your mappings; fill required fields)
    const priceUSD = Number(gem.priceUSD ?? 0);
    if (!Number.isFinite(priceUSD) || priceUSD < 0) {
      return res.status(400).json({ ok: false, error: 'INVALID_PRICE' });
    }

    const orderNo = gem.gemId || `ORD-${Date.now()}`;
    const selections = {
      source: 'inventory',
      type: gem.type || 'N/A',
      shape: gem.shape || 'N/A',
      weight: Number(gem.carat ?? 0),
      grade: 'N/A',
      polish: 'good',     // required by your model
      symmetry: 'good',   // required by your model
      gem: {
        id: gem._id,
        gemId: gem.gemId || null,
        name: gem.name || null,
        images: Array.isArray(gem.images) ? gem.images.slice(0, 4) : [],
        certificateUrl: gem.certificateUrl || '',
      },
    };

    const customerRaw = parseMaybeJSON(req.body.customer) || {};
    const paymentRaw  = parseMaybeJSON(req.body.payment)  || {};
    const country     = (req.body.country || customerRaw.country || '').trim();
    const shipping    = getShipping(country);
    const subtotal    = priceUSD;
    const total       = subtotal + shipping;
    const method      = (paymentRaw.method || 'card').trim();

    // Create order now (status depends on method)
    const order = await CustomOrder.create({
      orderNo,
      title: gem.name || gem.gemId || 'Gem',
      selections,
      buyerId,
      currency: 'USD',
      pricing: { subtotal },
      status: method === 'card' ? 'paid' : 'pending',
      gemId: gem._id,
    });

    // Build payment block
    const paymentBlock = { method, status: method === 'card' ? 'paid' : 'pending' };
    if (method === 'card') {
      const remember  = !!paymentRaw.remember;
      const cardName  = paymentRaw.card?.cardName || '';
      const rawNumber = (paymentRaw.card?.cardNumber || '').replace(/\s/g, '');
      if (remember && rawNumber) {
        const last4 = rawNumber.slice(-4);
        const { encrypt } = require('../Utills/Crypto');
        const { cipher, iv } = encrypt(rawNumber);
        paymentBlock.card = { cardName, last4, cardCipher: cipher, cardIv: iv, provider: 'demo' };
      }
    } else if (method === 'bank') {
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

    // Write Payment
    const paymentDoc = await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        orderNo: order.orderNo,
        currency: order.currency || 'USD',
        buyerId: order.buyerId,
        customer,
        payment: paymentBlock,
        amounts: { subtotal, shipping, total },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Update gem state
    if (method === 'card') {
      await finalizeGemSoldForOrder(order);   // sold + hidden
    } else {
      await ensureGemReservedForOrder(order); // keep reserved while pending
    }

    // (Auction Winner sync is skipped here on purpose; not relevant for inventory)

    return res.json({
      ok: true,
      paymentId: paymentDoc._id,
      orderId: order._id,
      orderNo: order.orderNo,
      total: paymentDoc.amounts.total,
      paymentStatus: paymentDoc.payment.status,
      orderStatus: order.status,
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
    const order = await CustomOrder.findByIdAndUpdate(p.orderId, { $set: { status: 'paid' } }, { new: true });

    // === reserve gem now that bank is paid ===
    if (order) await markGemSoldForOrder(order);

    // Sync Winner.purchaseStatus too ===
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
      const order = await CustomOrder.findByIdAndUpdate(p.orderId, { $set: { status: orderStatus } }, { new: true });

      // when order becomes paid -> mark SOLD
      if (orderStatus === 'paid' && order) {
        await  markGemSoldForOrder(order); // 
      }
      // when order is pending (bank slip waiting) -> mark RESERVED
      if (orderStatus === 'pending' && order) {
      await markGemReservedForOrder(order);
     }

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
