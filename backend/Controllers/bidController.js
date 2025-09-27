const Auction = require("../Models/Auction");
const Bid = require("../Models/Bid");

/** Ensure auction is within its bid window (start <= now < end) */
async function ensureOngoing(auctionId) {
  const a = await Auction.findById(auctionId);
  if (!a) throw new Error("Auction not found");
  const now = Date.now();
  if (!(new Date(a.startTime).getTime() <= now && now < new Date(a.endTime).getTime())) {
    throw new Error("Auction is not accepting bids");
  }
  return a;
}

/** Get global current top bid amount for the auction (or null if none) */
async function topBidAmount(auctionId) {
  const top = await Bid.findOne({ auction: auctionId })
    .sort({ amount: -1, placedAt: 1 }) // highest amount; tie -> earliest wins
    .lean();
  return top ? top.amount : null;
}

/**
 * POST /api/bids/place  { auctionId, amount }
 * If the user already has a bid for this auction, update that SAME row
 * (no new documents are created).
 */
exports.placeBid = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { auctionId, amount } = req.body || {};
    const amt = Number(amount);
    if (!auctionId || !Number.isFinite(amt)) {
      return res.status(400).json({ message: "auctionId and amount are required" });
    }

    const a = await ensureOngoing(auctionId);

    const currentTop = await topBidAmount(auctionId);
    const floor = Math.max(a.basePrice || 0, a.currentPrice || 0, currentTop || 0);
    if (amt <= floor) {
      return res.status(400).json({ message: `Bid must be greater than current price (${floor})` });
    }

    // ⬇️ update existing row or create the first one for this user/auction
    const existing = await Bid.findOne({ auction: auctionId, user: userId });
    if (existing) {
      existing.amount = amt;
      existing.placedAt = new Date();
      await existing.save();
    } else {
      await Bid.create({
        auction: auctionId,
        user: userId,
        amount: amt,
        placedAt: new Date(),
      });
    }

    // Update auction current price if this is the new top
    if ((a.currentPrice || 0) < amt) {
      await Auction.updateOne({ _id: auctionId }, { $set: { currentPrice: amt } });
    }

    return res.status(201).json({ ok: true, currentPrice: Math.max(a.currentPrice || 0, amt) });
  } catch (e) {
    console.error("placeBid error:", e);
    return res.status(400).json({ message: e.message || "Failed to place bid" });
  }
};

/**
 * POST /api/bids/increase  { auctionId, amount }
 * Strictly updates the user's existing bid row – DOES NOT create a new one.
 */
exports.increaseBid = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { auctionId, amount } = req.body || {};
    const amt = Number(amount);
    if (!auctionId || !Number.isFinite(amt)) {
      return res.status(400).json({ message: "auctionId and amount are required" });
    }

    const a = await ensureOngoing(auctionId);

    const existing = await Bid.findOne({ auction: auctionId, user: userId });
    if (!existing) {
      return res.status(400).json({ message: "No existing bid to increase. Place a bid first." });
    }

    const currentTop = await topBidAmount(auctionId);
    const floor = Math.max(a.basePrice || 0, a.currentPrice || 0, currentTop || 0);
    if (amt <= floor) {
      return res.status(400).json({ message: `Increase must be greater than current price (${floor})` });
    }

    existing.amount = amt;
    existing.placedAt = new Date();
    await existing.save();

    if ((a.currentPrice || 0) < amt) {
      await Auction.updateOne({ _id: auctionId }, { $set: { currentPrice: amt } });
    }

    return res.status(200).json({ ok: true, currentPrice: Math.max(a.currentPrice || 0, amt) });
  } catch (e) {
    console.error("increaseBid error:", e);
    return res.status(400).json({ message: e.message || "Failed to increase bid" });
  }
};

/**
 * GET /api/bids/my
 * Returns the exact shape your Buyer Dashboard expects:
 * [{ auctionId, id, title, type, endTime, currentPrice, image, yourBid }]
 * (One row per auction because we now keep one bid row per user per auction)
 */
exports.listMyBids = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const bids = await Bid.find({ user: userId }).populate("auction").lean();

    const items = (bids || [])
      .filter((b) => b.auction)
      .map((b) => ({
        auctionId: b.auction._id,
        id: String(b.auction._id),
        title: b.auction.title,
        type: b.auction.type,
        endTime: b.auction.endTime,
        currentPrice: b.auction.currentPrice,
        image: b.auction.imageUrl || "",
        yourBid: b.amount,
      }))
      .sort((x, y) => new Date(x.endTime) - new Date(y.endTime));

    return res.json({ items });
  } catch (e) {
    console.error("listMyBids error:", e);
    return res.status(500).json({ message: "Failed to load your bids" });
  }
};

/** GET /api/bids/auction/:id  (optional seller/debug) */
exports.listBidsForAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const items = await Bid.find({ auction: id })
      .populate("user", "fullName email")
      .sort({ amount: -1, placedAt: 1 })
      .lean();

    return res.json({
      items: items.map((b) => ({
        id: String(b._id),
        user: b.user,
        amount: b.amount,
        placedAt: b.placedAt,
      })),
    });
  } catch (e) {
    console.error("listBidsForAuction error:", e);
    return res.status(500).json({ message: "Failed to load bids" });
  }
};
