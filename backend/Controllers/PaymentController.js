// backend/Controllers/PaymentController.js
const Payment = require('../Models/PaymentModel');
const CustomOrder = require('../Models/CustomOrderModel');
const { encrypt } = require('../Utills/Crypto');

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
