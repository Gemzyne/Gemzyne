// Controllers/bidController.js

const Auction = require("../Models/Auction"); // auction model
const Bid = require("../Models/Bid"); // bid model

async function ensureOngoing(auctionId) {
  // guard: auction in bid window
  const a = await Auction.findById(auctionId);
  if (!a) throw new Error("Auction not found");
  const now = Date.now();
  if (
    !(
      new Date(a.startTime).getTime() <= now &&
      now < new Date(a.endTime).getTime()
    )
  ) {
    throw new Error("Auction is not accepting bids");
  }
  return a;
}

async function topBidAmount(auctionId) {
  // helper: highest bid amount
  const top = await Bid.findOne({ auction: auctionId })
    .sort({ amount: -1, placedAt: 1 })
    .lean();
  return top ? top.amount : null;
}

// POST /api/bids/place – create/update single row per user+auction
exports.placeBid = async (req, res) => {
  try {
    const userId = req.user?.id; // caller id
    if (!userId) return res.status(401).json({ message: "Unauthorized" }); // auth guard

    const { auctionId, amount } = req.body || {}; // body
    const amt = Number(amount); // amount numeric
    if (!auctionId || !Number.isFinite(amt)) {
      return res
        .status(400)
        .json({ message: "auctionId and amount are required" }); // input guard
    }

    const a = await ensureOngoing(auctionId); // time window check
    const currentTop = await topBidAmount(auctionId); // current top
    const floor = Math.max(
      a.basePrice || 0,
      a.currentPrice || 0,
      currentTop || 0
    ); // minimum allowed
    if (amt <= floor) {
      return res
        .status(400)
        .json({ message: `Bid must be greater than current price (${floor})` }); // reject low bids
    }

    const existing = await Bid.findOne({ auction: auctionId, user: userId }); // find your bid
    if (existing) {
      existing.amount = amt; // update amount
      existing.placedAt = new Date(); // update time
      await existing.save(); // save change
    } else {
      await Bid.create({
        auction: auctionId,
        user: userId,
        amount: amt,
        placedAt: new Date(),
      }); // create new
    }

    if ((a.currentPrice || 0) < amt) {
      await Auction.updateOne(
        { _id: auctionId },
        { $set: { currentPrice: amt } }
      ); // raise current price
    }

    return res
      .status(201)
      .json({ ok: true, currentPrice: Math.max(a.currentPrice || 0, amt) }); // reply
  } catch (e) {
    console.error("placeBid error:", e); // log
    return res
      .status(400)
      .json({ message: e.message || "Failed to place bid" }); // error
  }
};

// POST /api/bids/increase – update existing bid only
exports.increaseBid = async (req, res) => {
  try {
    const userId = req.user?.id; // caller id
    if (!userId) return res.status(401).json({ message: "Unauthorized" }); // auth guard

    const { auctionId, amount } = req.body || {}; // body
    const amt = Number(amount); // numeric
    if (!auctionId || !Number.isFinite(amt)) {
      return res
        .status(400)
        .json({ message: "auctionId and amount are required" }); // input guard
    }

    const a = await ensureOngoing(auctionId); // window check
    const existing = await Bid.findOne({ auction: auctionId, user: userId }); // your bid
    if (!existing)
      return res
        .status(400)
        .json({ message: "No existing bid to increase. Place a bid first." }); // must exist

    const currentTop = await topBidAmount(auctionId); // current top
    const floor = Math.max(
      a.basePrice || 0,
      a.currentPrice || 0,
      currentTop || 0
    ); // minimum
    if (amt <= floor) {
      return res
        .status(400)
        .json({
          message: `Increase must be greater than current price (${floor})`,
        }); // reject low
    }

    existing.amount = amt; // update amount
    existing.placedAt = new Date(); // update time
    await existing.save(); // save

    if ((a.currentPrice || 0) < amt) {
      await Auction.updateOne(
        { _id: auctionId },
        { $set: { currentPrice: amt } }
      ); // update auction price
    }

    return res
      .status(200)
      .json({ ok: true, currentPrice: Math.max(a.currentPrice || 0, amt) }); // reply
  } catch (e) {
    console.error("increaseBid error:", e); // log
    return res
      .status(400)
      .json({ message: e.message || "Failed to increase bid" }); // error
  }
};

// GET /api/bids/my – list your bids shaped for dashboard
exports.listMyBids = async (req, res) => {
  try {
    const userId = req.user?.id; // caller id
    if (!userId) return res.status(401).json({ message: "Unauthorized" }); // auth guard

    const bids = await Bid.find({ user: userId }).populate("auction").lean(); // load bids
    const items = (bids || [])
      .filter((b) => b.auction) // keep valid
      .map((b) => ({
        auctionId: b.auction._id,
        id: String(b.auction._id),
        title: b.auction.title,
        type: b.auction.type,
        endTime: b.auction.endTime,
        currentPrice: b.auction.currentPrice,
        image: b.auction.imageUrl || "",
        yourBid: b.amount,
      })) // shape rows
      .sort((x, y) => new Date(x.endTime) - new Date(y.endTime)); // sort by end

    return res.json({ items }); // reply data
  } catch (e) {
    console.error("listMyBids error:", e); // log
    return res.status(500).json({ message: "Failed to load your bids" }); // error
  }
};

// GET /api/bids/auction/:id – seller/debug list for one auction
exports.listBidsForAuction = async (req, res) => {
  try {
    const { id } = req.params; // read param
    const items = await Bid.find({ auction: id })
      .populate("user", "fullName email")
      .sort({ amount: -1, placedAt: 1 })
      .lean(); // load list
    return res.json({
      items: items.map((b) => ({
        id: String(b._id),
        user: b.user,
        amount: b.amount,
        placedAt: b.placedAt,
      })),
    }); // shape rows
  } catch (e) {
    console.error("listBidsForAuction error:", e); // log
    return res.status(500).json({ message: "Failed to load bids" }); // error
  }
};
