// backend/Controllers/UserDashboardController.js
const mongoose = require("mongoose");
const Feedback = require("../Models/FeedbackModel");

let Bid = null;
let Auction = null;
try {
  Bid = require("../Models/Bid");
} catch {}
try {
  Auction = require("../Models/Auction");
} catch {}

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

// GET /api/dashboard/me
// Returns { totals: { activeBids, myReviews }, recent: { reviews } }
exports.getMyDashboard = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    const uid = toObjectId(userId);
    if (!uid)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    // ---------- Active bids (count) ----------
    let activeBids = 0;
    if (Bid && Auction) {
      const now = new Date();
      // all distinct auctions this user has bid on
      const myAuctionIds = await Bid.distinct("auction", { user: uid }).catch(
        () => []
      );

      if (myAuctionIds.length) {
        activeBids = await Auction.countDocuments({
          _id: { $in: myAuctionIds },
          status: "ongoing", // per your Auction schema
          endTime: { $gt: now }, // still open
        }).catch(() => 0);
      }
    }

    // ---------- My reviews (count + recent) ----------
    const email = req.user?.email || null;
    const reviewMatch = email
      ? { type: "review", $or: [{ user: uid }, { email }] } // fall back to email for legacy rows
      : { type: "review", user: uid };

    const myReviewsCount = await Feedback.countDocuments(reviewMatch).catch(() => 0);

    const recentReviewsDocs = await Feedback.find(reviewMatch)
      .sort({ createdAt: -1 })
      .limit(5) // show up to 5 recent reviews
      .select("_id createdAt rating feedbackText productName productId orderId")
      .lean()
      .catch(() => []);

    // Keep your current response shape the UI expects (id/date/rating/text/title)
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

    res.json({
      ok: true,
      totals: { activeBids, myReviews: myReviewsCount },
      recent: { reviews: recentReviews },
    });
  } catch (e) {
    console.error("getMyDashboard", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};
