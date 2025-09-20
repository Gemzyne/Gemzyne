// Controllers/winnerController.js
// -------------------------------------------------
// Controller functions for Winner endpoints.
// NOTE: We allow looking up by either:
//   - Auction Mongo ObjectId  (e.g., "66e...c9a")
//   - Auction Code            (e.g., "AUC-2025-007")
// The param is still called :auctionId for backward-compat, but it can be a code.

const mongoose = require("mongoose");
const Winner = require("../Models/Winner");
const Auction = require("../Models/Auction");

const CustomOrder = require("../Models/CustomOrderModel");
const { nanoid } = require("nanoid");
const { plus3Days } = require("../Utills/CustomPricing");

// Small helper: detect if a string looks like a Mongo ObjectId
function isMongoId(id) {
  return mongoose.isValidObjectId(id);
}

// Small helper: find a winner by either auction ObjectId or by auctionCode
async function findWinnerByAuctionRef(auctionRef) {
  if (isMongoId(auctionRef)) {
    // Treat as Auction _id
    return Winner.findOne({ auction: auctionRef })
      .populate("user", "fullName email")
      .populate("auction", "auctionId title type endTime imageUrl sellerId")
      .lean();
  }

  // Try Winner.auctionCode first (new rows)
  let w = await Winner.findOne({ auctionCode: auctionRef })
    .populate("user", "fullName email")
    .populate("auction", "auctionId title type endTime imageUrl sellerId")
    .lean();
  if (w) return w;

  // Fallback for older rows: resolve Auction by its human code, then find Winner by auction _id
  const a = await Auction.findOne({ auctionId: auctionRef }).select("_id");
  if (!a) return null;

  // Treat as Auction Code (e.g., AUC-2025-007)
  return Winner.findOne({ auctionCode: auctionRef })
    .populate("user", "fullName email")
    .populate("auction", "auctionId title type endTime imageUrl sellerId")
    .lean();
}

/**
 * Public: minimal winner summary for an ended auction (no auth).
 * Accepts :auctionId as either the Mongo _id OR the human code (AUC-####-###).
 * Returns:
 *   {
 *     auctionMongoId,  // Mongo _id of the auction
 *     auctionCode,     // Human-readable code like AUC-2025-007
 *     title, type, finalPrice, winnerName, endTime, image
 *   }
 */
exports.getPublicByAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const w = await findWinnerByAuctionRef(auctionId);
    if (!w) return res.status(404).json({ message: "Winner not found" });

    return res.json({
      auctionMongoId: w.auction?._id || null,
      auctionCode: w.auctionCode || w.auction?.auctionId || null,
      title: w.auction?.title || "",
      type: w.auction?.type || "",
      finalPrice: w.amount,
      winnerName: w.user?.fullName || "Unknown",
      endTime: w.auction?.endTime || null,
      image: w.auction?.imageUrl || "",
    });
  } catch (e) {
    console.error("getPublicByAuction error:", e);
    res.status(500).json({ message: "Failed to load winner" });
  }
};

/**
 * Auth-required: seller of that auction OR the winner can view full details.
 * Accepts :auctionId as either the Mongo _id OR the human code (AUC-####-###).
 */
exports.getByAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const w = await findWinnerByAuctionRef(auctionId);
    if (!w) return res.status(404).json({ message: "Winner not found" });

    const a = w.auction || {};
    const isWinner = String(w.user?._id || "") === String(req.user?.id || "");
    const isSeller =
      String(a?.sellerId || "") === String(req.user?.id || "") ||
      req.user?.role === "seller";

    if (!isSeller && !isWinner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Return full winner doc (already populated with light auction + user)
    res.json(w);
  } catch (e) {
    console.error("getByAuction error:", e);
    res.status(500).json({ message: "Failed to load winner details" });
  }
};

/**
 * Buyer: list my wins (for Buyer Dashboard).
 * Returns:
 *   {
 *     items: [
 *       {
 *         id, auctionMongoId, auctionCode, title, type, finalPrice,
 *         endTime, purchaseDeadline, purchaseStatus, paymentId, image
 *       }
 *     ]
 *   }
 */
exports.listMyWins = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const wins = await Winner.find({ user: userId })
      .populate("auction", "auctionId title type endTime imageUrl")
      .lean();

    const items = wins.map((w) => ({
      id: w._id,
      auctionMongoId: w.auction?._id || null,
      auctionCode: w.auctionCode || w.auction?.auctionId || null,
      title: w.auction?.title || "",
      type: w.auction?.type || "",
      finalPrice: w.amount,
      endTime: w.auction?.endTime || null,
      purchaseDeadline: w.purchaseDeadline || null,
      purchaseStatus: w.purchaseStatus,
      paymentId: w.paymentId || null,
      image: w.auction?.imageUrl || "",
    }));

    res.json({ items });
  } catch (e) {
    console.error("listMyWins error:", e);
    res.status(500).json({ message: "Failed to load your wins" });
  }
};

/**
 * POST /api/wins/purchase/:auctionId
 * Preconditions:
 *  - caller is the winner of the auction
 *  - auction has ended
 * Action:
 *  - creates (or reuses) a CustomOrder whose subtotal == winning amount
 *  - returns { ok, orderId, orderNo, auction: { code, title, amount } }
 * Notes:
 *  - DOES NOT modify CustomOrder schema or your payment controller.
 *  - Selections are filled with neutral placeholders to satisfy required fields.
 */
exports.createWinnerPurchase = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const win = await findWinnerByAuctionRef(auctionId);
    if (!win) return res.status(404).json({ ok: false, message: "Winner not found" });

    // Must be this winner
    if (String(win.user?._id || "") !== String(userId)) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    // Auction must be ended
    const a = win.auction;
    if (!a || !(new Date(a.endTime).getTime() <= Date.now())) {
      return res.status(400).json({ ok: false, message: "Auction not ended yet" });
    }

    const amount = Number(win.amount || 0);
    if (!(amount > 0)) {
      return res.status(400).json({ ok: false, message: "Invalid winning amount" });
    }

    // 🔄 CHANGED: derive the orderNo from the human auction code (AUC-YYYY-###)
    const orderNo = win.auctionCode || a.auctionId; // e.g. "AUC-2025-007"

    // Idempotency:
    // 🔄 CHANGED: reuse an existing order for this buyer + orderNo (auction code)
    const existing = await CustomOrder.findOne({
      orderNo,
      buyerId: userId,
      status: { $in: ['pending', 'paid'] },
    }).lean();

    if (existing) {
      return res.json({
        ok: true,
        orderId: existing._id,
        orderNo: existing.orderNo,
        auction: {
          code: win.auctionCode || a.auctionId || null,
          title: a.title || "Auction Item",
          amount,
        },
      });
    }

    // Minimal yet valid "selections" & "pricing" (no schema changes!)
    const selections = {
      type: a.type || 'other',
      shape: 'n/a',
      weight: 0,
      grade: 'n/a',
      polish: 'n/a',
      symmetry: 'n/a',
    };

    const pricing = {
      basePrice: 0,
      shapePrice: 0,
      weightPrice: 0,
      gradePrice: 0,
      polishPrice: 0,
      symmetryPrice: 0,
      subtotal: amount, // 👈 winning amount drives checkout
    };

    // Title is just for display; keep it recognizable
    const signatureTitle = `[AUCTION] ${a.title || "Gem"}`;

    const order = await CustomOrder.create({
      orderNo,
      buyerId: userId,
      title: signatureTitle,               
      selections,
      pricing,
      currency: 'USD',
      status: 'pending',
    });

    return res.status(201).json({
      ok: true,
      orderId: order._id,
      orderNo: order.orderNo,
      auction: {
        code: win.auctionCode || a.auctionId || null,
        title: a.title || "Auction Item",
        amount,
      },
    });
  } catch (e) {
    console.error("createWinnerPurchase error:", e);
    return res.status(500).json({ ok: false, message: "Failed to prepare purchase" });
  }
};
