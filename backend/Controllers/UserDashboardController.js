// backend/Controllers/UserDashboardController.js
const mongoose = require("mongoose");
const Feedback = require("../Models/FeedbackModel");

// Optional models (guarded)
let Bid = null;
let Auction = null;
let CustomOrder = null;
let Payment = null;
try { Bid = require("../Models/Bid"); } catch {}
try { Auction = require("../Models/Auction"); } catch {}
try { CustomOrder = require("../Models/CustomOrderModel"); } catch {}
try { Payment = require("../Models/PaymentModel"); } catch {}

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

const normPay = (v) => {
  v = String(v ?? "").toLowerCase();
  if (["paid", "success", "succeeded"].includes(v)) return "paid";
  if (["cancelled", "canceled", "failed"].includes(v)) return "cancelled";
  return "pending";
};
const normOrder = (v) => {
  v = String(v ?? "").toLowerCase().trim();
  if (!v) return "processing";
  if (["processing", "shipping", "shipped", "completed"].includes(v)) return v;
  return "processing";
};

// GET /api/dashboard/me
exports.getMyDashboard = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    const uid = toObjectId(userId);
    if (!uid) return res.status(401).json({ ok: false, message: "Unauthorized" });

    /* ---------- Active bids (count) ---------- */
    let activeBids = 0;
    if (Bid && Auction) {
      const now = new Date();
      const myAuctionIds = await Bid.distinct("auction", { user: uid }).catch(() => []);
      if (myAuctionIds.length) {
        activeBids = await Auction.countDocuments({
          _id: { $in: myAuctionIds },
          status: "ongoing",
          endTime: { $gt: now },
        }).catch(() => 0);
      }
    }

    /* ---------- My reviews (count + recent) ---------- */
    const email = req.user?.email || null;
    const reviewMatch = email
      ? { type: "review", $or: [{ user: uid }, { email }] }
      : { type: "review", user: uid };

    const myReviewsCount = await Feedback.countDocuments(reviewMatch).catch(() => 0);

    const recentReviewsDocs = await Feedback.find(reviewMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id createdAt rating feedbackText productName productId orderId")
      .lean()
      .catch(() => []);

    const recentReviews = (recentReviewsDocs || []).map((r) => ({
      id: r._id,
      date: r.createdAt,
      rating: Number(r.rating) || 0,
      text: r.feedbackText || "",
      title:
        r.productName ||
        r.productId ||
        (r.orderId ? `Order #${r.orderId}` : "Review"),
    }));

    /* ---------- My orders (count + last 3) ---------- */
    let totalOrders = 0;
    let recentOrders = [];

    if (CustomOrder) {
      // Count all user orders
      totalOrders = await CustomOrder.countDocuments({ buyerId: uid }).catch(() => 0);

      // Load last 3 orders
      const orders = await CustomOrder.find(
        { buyerId: uid },
        {
          orderNo: 1,
          title: 1,
          selections: 1,
          pricing: 1,
          currency: 1,
          status: 1,
          orderStatus: 1,
          createdAt: 1,
        }
      )
        .sort({ createdAt: -1 })
        .limit(3)
        .lean()
        .catch(() => []);

      // map payment statuses if Payment model exists
      let paysByOrderId = {};
      if (Payment && orders.length) {
        const ids = orders.map((o) => o._id);
        const pays = await Payment.find(
          { orderId: { $in: ids } },
          { status: 1, "payment.status": 1, orderId: 1 }
        ).lean();
        for (const p of (pays || [])) paysByOrderId[String(p.orderId)] = p;
      }

      recentOrders = orders.map((o) => {
        const pay = paysByOrderId[String(o._id)];
        const paymentStatus = normPay(o?.status ?? pay?.status ?? pay?.payment?.status);
        const orderStatus = normOrder(o?.orderStatus);

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
    }

    res.json({
      ok: true,
      totals: { activeBids, myReviews: myReviewsCount, totalOrders },
      recent: { reviews: recentReviews, orders: recentOrders },
    });
  } catch (e) {
    console.error("getMyDashboard", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};
