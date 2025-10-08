// Controllers/winnerController.js

const mongoose = require("mongoose"); // imports
const Winner = require("../Models/Winner"); // winner model
const Auction = require("../Models/Auction"); // auction model
const CustomOrder = require("../Models/CustomOrderModel"); // custom order model
const { nanoid } = require("nanoid"); // id helper (kept for parity)
const { plus3Days } = require("../Utills/CustomPricing"); // date util (kept for parity)

function isMongoId(id) {
  return mongoose.isValidObjectId(id);
} // helper: objectid check

async function findWinnerByAuctionRef(auctionRef) {
  // helper: find by _id or code
  if (isMongoId(auctionRef)) {
    return Winner.findOne({ auction: auctionRef })
      .populate("user", "fullName email")
      .populate("auction", "auctionId title type endTime imageUrl sellerId")
      .lean();
  }
  let w = await Winner.findOne({ auctionCode: auctionRef })
    .populate("user", "fullName email")
    .populate("auction", "auctionId title type endTime imageUrl sellerId")
    .lean();
  if (w) return w;
  const a = await Auction.findOne({ auctionId: auctionRef }).select("_id");
  if (!a) return null;
  return Winner.findOne({ auctionCode: auctionRef })
    .populate("user", "fullName email")
    .populate("auction", "auctionId title type endTime imageUrl sellerId")
    .lean();
}

// GET /api/wins/public/auction/:auctionId – minimal public summary
exports.getPublicByAuction = async (req, res) => {
  try {
    const { auctionId } = req.params; // read param
    const w = await findWinnerByAuctionRef(auctionId); // find winner
    if (!w) return res.status(404).json({ message: "Winner not found" }); // not found
    return res.json({
      auctionMongoId: w.auction?._id || null,
      auctionCode: w.auctionCode || w.auction?.auctionId || null,
      title: w.auction?.title || "",
      type: w.auction?.type || "",
      finalPrice: w.amount,
      winnerName: w.user?.fullName || "Unknown",
      endTime: w.auction?.endTime || null,
      image: w.auction?.imageUrl || "",
    }); // shape
  } catch (e) {
    console.error("getPublicByAuction error:", e); // log
    res.status(500).json({ message: "Failed to load winner" }); // error
  }
};

// GET /api/wins/auction/:auctionId – auth: seller or winner
exports.getByAuction = async (req, res) => {
  try {
    const { auctionId } = req.params; // read param
    const w = await findWinnerByAuctionRef(auctionId); // find winner
    if (!w) return res.status(404).json({ message: "Winner not found" }); // not found
    const a = w.auction || {}; // auction ref
    const isWinner = String(w.user?._id || "") === String(req.user?.id || ""); // check winner
    const isSeller =
      String(a?.sellerId || "") === String(req.user?.id || "") ||
      req.user?.role === "seller"; // check seller
    if (!isSeller && !isWinner)
      return res.status(403).json({ message: "Forbidden" }); // forbid
    res.json(w); // full winner doc
  } catch (e) {
    console.error("getByAuction error:", e); // log
    res.status(500).json({ message: "Failed to load winner details" }); // error
  }
};

// GET /api/wins/my – list wins for current user
exports.listMyWins = async (req, res) => {
  try {
    const userId = req.user?.id; // caller id
    if (!userId) return res.status(401).json({ message: "Unauthorized" }); // auth guard
    const wins = await Winner.find({ user: userId })
      .populate("auction", "auctionId title type endTime imageUrl")
      .lean(); // load wins
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
    })); // shape
    res.json({ items }); // reply
  } catch (e) {
    console.error("listMyWins error:", e); // log
    res.status(500).json({ message: "Failed to load your wins" }); // error
  }
};

// POST /api/wins/purchase/:auctionId – create/reuse order for winner
exports.createWinnerPurchase = async (req, res) => {
  try {
    const { auctionId } = req.params; // read param
    const userId = req.user?.id; // caller id
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" }); // auth guard

    const win = await findWinnerByAuctionRef(auctionId); // load winner
    if (!win)
      return res.status(404).json({ ok: false, message: "Winner not found" }); // not found
    if (String(win.user?._id || "") !== String(userId)) {
      return res.status(403).json({ ok: false, message: "Forbidden" }); // must be winner
    }

    const a = win.auction; // auction doc
    if (!a || !(new Date(a.endTime).getTime() <= Date.now())) {
      return res
        .status(400)
        .json({ ok: false, message: "Auction not ended yet" }); // must be ended
    }

    const amount = Number(win.amount || 0); // amount
    if (!(amount > 0))
      return res
        .status(400)
        .json({ ok: false, message: "Invalid winning amount" }); // validate

    const orderNo = win.auctionCode || a.auctionId; // order number
    const existing = await CustomOrder.findOne({
      orderNo,
      buyerId: userId,
      status: { $in: ["pending", "paid"] },
    }).lean(); // idempotency

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
      }); // reuse
    }

    const selections = {
      type: a.type || "other",
      shape: "n/a",
      weight: 0,
      grade: "n/a",
      polish: "n/a",
      symmetry: "n/a",
    }; // minimal selections
    const pricing = {
      basePrice: 0,
      shapePrice: 0,
      weightPrice: 0,
      gradePrice: 0,
      polishPrice: 0,
      symmetryPrice: 0,
      subtotal: amount,
    }; // minimal pricing
    const signatureTitle = `[AUCTION] ${a.title || "Gem"}`; // display title

    const order = await CustomOrder.create({
      orderNo,
      buyerId: userId,
      title: signatureTitle,
      selections,
      pricing,
      currency: "USD",
      status: "pending",
    }); // create order

    return res
      .status(201)
      .json({
        ok: true,
        orderId: order._id,
        orderNo: order.orderNo,
        auction: {
          code: win.auctionCode || a.auctionId || null,
          title: a.title || "Auction Item",
          amount,
        },
      }); // respond
  } catch (e) {
    console.error("createWinnerPurchase error:", e); // log
    return res
      .status(500)
      .json({ ok: false, message: "Failed to prepare purchase" }); // error
  }
};
