// backend/Controllers/UserOrdersController.js
// Read-only "My Orders" list, scoped to the logged-in user.
// Implements the display rule: if orderStatus is missing -> "processing" (fallback).
// Also normalizes paymentStatus: paid | pending | cancelled.

const mongoose = require("mongoose");
const CustomOrder = require("../Models/CustomOrderModel");

let Payment = null;
try {
  // If your project has PaymentModel, this will work.
  // If not, the code will safely continue without it.
  Payment = require("../Models/PaymentModel");
} catch (_) {
  Payment = null;
}

// helpers
const normPay = (v) => {
  v = String(v ?? "").toLowerCase();
  if (["paid", "success", "succeeded"].includes(v)) return "paid";
  if (["cancelled", "canceled", "failed"].includes(v)) return "cancelled";
  return "pending";
};
const normOrder = (v) => {
  v = String(v ?? "").toLowerCase().trim();
  if (!v) return "processing"; // fallback rule
  if (["processing", "shipping", "shipped", "completed"].includes(v)) return v;
  return "processing";
};

exports.listMine = async (req, res, next) => {
  try {
    const buyerId = req.user?.id;
    if (!buyerId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    // Pull only this user's orders
    const orders = await CustomOrder.find(
      { buyerId },
      {
        orderNo: 1,
        title: 1,
        selections: 1,
        pricing: 1,
        currency: 1,
        status: 1,        // legacy payment-ish
        orderStatus: 1,   // may be missing
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    // Optional: map associated payments if Payment model exists
    let paysByOrderId = {};
    if (Payment && orders.length) {
      const ids = orders.map((o) => o._id);
      const pays = await Payment.find(
        { orderId: { $in: ids } },
        { status: 1, "payment.status": 1, orderId: 1 }
      ).lean();
      for (const p of pays) paysByOrderId[String(p.orderId)] = p;
    }

    const items = orders.map((o) => {
      const pay = paysByOrderId[String(o._id)];
      const paymentStatus = normPay(o?.status ?? pay?.status ?? pay?.payment?.status);
      const orderStatus   = normOrder(o?.orderStatus);

      return {
        id: o._id,
        orderNo: o.orderNo,
        title: o.title,
        selections: o.selections,
        amount: o?.pricing?.subtotal ?? 0,
        currency: o?.currency || "USD",
        paymentStatus,
        orderStatus,
        createdAt: o.createdAt,
      };
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
};
