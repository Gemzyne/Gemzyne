// backend/Controllers/MetricsController.js
const mongoose = require("mongoose");
const Payment = require("../Models/PaymentModel");
const Feedback = require("../Models/FeedbackModel");
const CustomOrder = require("../Models/CustomOrderModel");

// Helper: parse ints with fallback
function toInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}

// GET /api/metrics/seller/summary?year=2025
// Returns { totalRevenue, paidCount, pendingCount, cancelledCount, currency }
exports.summary = async (req, res, next) => {
  try {
    const year = toInt(req.query.year, new Date().getFullYear());

    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
    // ---- revenue & counts
    const rows = await Payment.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: "$payment.status",
          revenue: { $sum: "$amounts.total" },
          count: { $sum: 1 },
          anyCurrency: { $first: "$currency" },
        },
      },
    ]);

    let totalRevenue = 0,
      paidCount = 0,
      pendingCount = 0,
      cancelledCount = 0,
      currency = "USD";
    for (const r of rows) {
      if (r._id === "paid") {
        totalRevenue += r.revenue || 0;
        paidCount = r.count;
      } else if (r._id === "pending") {
        pendingCount = r.count;
      } else if (r._id === "cancelled") {
        cancelledCount = r.count;
      }
      if (r.anyCurrency) currency = r.anyCurrency;
    }

    const ratingAgg = await Feedback.aggregate([
      { $match: { type: "review" } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    const avgRating = ratingAgg?.[0]?.avg
      ? Math.round(ratingAgg[0].avg * 10) / 10
      : 0;
    const ratingCount = ratingAgg?.[0]?.count || 0;

    // Count all orders created within the requested year
    const ordersYearCount = await CustomOrder.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
    res.json({
      ok: true,
      totalRevenue,
      paidCount,
      pendingCount,
      cancelledCount,
      currency,
      avgRating,
      ratingCount,
      year,
      ordersYearCount,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/metrics/seller/monthly?year=2025
// Returns array of 12 numbers (revenue per month for PAID payments)
exports.monthlyRevenue = async (req, res, next) => {
  try {
    const year = toInt(req.query.year, new Date().getFullYear());
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    const rows = await Payment.aggregate([
      {
        $match: {
          "payment.status": "paid",
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: { m: { $month: "$createdAt" } },
          total: { $sum: "$amounts.total" },
        },
      },
      { $sort: { "_id.m": 1 } },
    ]);

    const months = Array(12).fill(0);
    rows.forEach((r) => {
      const idx = (r._id.m | 0) - 1; // 0..11
      if (idx >= 0 && idx < 12) months[idx] = r.total || 0;
    });

    res.json({ ok: true, year, months });
  } catch (err) {
    next(err);
  }
};

// GET /api/metrics/seller/category?year=2025
// Buckets PAID sales by inferred category from order title (best-effort).
// Returns: { labels: [...], values: [...] }
exports.categoryBreakdown = async (req, res, next) => {
  try {
    const year = toInt(req.query.year, new Date().getFullYear());
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    // NOTE: collection name for CustomOrder is Mongoose-pluralized: "customorders"
    const rows = await Payment.aggregate([
      {
        $match: {
          "payment.status": "paid",
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $lookup: {
          from: "customorders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          amount: "$amounts.total",
          title: { $ifNull: ["$order.title", ""] },
          // you can also project other fields if your CustomOrder has them, e.g. $order.type
        },
      },
    ]);

    const buckets = {
      Sapphires: 0,
      Rubies: 0,
      Emeralds: 0,
      Diamonds: 0,
      Others: 0,
    };
    const re = {
      Sapphires: /sapphir/i,
      Rubies: /ruby/i,
      Emeralds: /emerald/i,
      Diamonds: /diamond/i,
    };

    for (const r of rows) {
      const t = r.title || "";
      let cat = "Others";
      if (re.Sapphires.test(t)) cat = "Sapphires";
      else if (re.Rubies.test(t)) cat = "Rubies";
      else if (re.Emeralds.test(t)) cat = "Emeralds";
      else if (re.Diamonds.test(t)) cat = "Diamonds";
      buckets[cat] += Number(r.amount || 0);
    }

    const labels = Object.keys(buckets);
    const values = labels.map((k) => buckets[k]);

    res.json({ ok: true, year, labels, values });
  } catch (err) {
    next(err);
  }
};
