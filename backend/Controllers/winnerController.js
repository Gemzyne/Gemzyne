const Winner = require("../Models/Winner");
const Auction = require("../Models/Auction");

/**
 * Public minimal winner summary for an ended auction (no auth).
 * Returns { auctionId, title, type, finalPrice, winnerName, endTime, image }
 */
exports.getPublicByAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const w = await Winner.findOne({ auction: auctionId })
      .populate("user", "fullName")
      .populate("auction", "title type endTime imageUrl")
      .lean();

    if (!w) return res.status(404).json({ message: "Winner not found" });

    return res.json({
      auctionId: w.auction?._id,
      title: w.auction?.title,
      type: w.auction?.type,
      finalPrice: w.amount,
      winnerName: w.user?.fullName || "Unknown",
      endTime: w.auction?.endTime,
      image: w.auction?.imageUrl || "",
    });
  } catch (e) {
    console.error("getPublicByAuction error:", e);
    res.status(500).json({ message: "Failed to load winner" });
  }
};

/**
 * Auth-required: seller of that auction OR the winner can view full details
 */
exports.getByAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const w = await Winner.findOne({ auction: auctionId })
      .populate("user", "fullName email")
      .populate("auction")
      .lean();

    if (!w) return res.status(404).json({ message: "Winner not found" });

    const a = w.auction;
    const isWinner = String(w.user?._id) === String(req.user?.id);
    const isSeller =
      String(a?.sellerId || "") === String(req.user?.id) || req.user?.role === "seller";

    if (!isSeller && !isWinner) return res.status(403).json({ message: "Forbidden" });

    res.json(w);
  } catch (e) {
    console.error("getByAuction error:", e);
    res.status(500).json({ message: "Failed to load winner details" });
  }
};

/**
 * Buyer: list my wins (for Buyer Dashboard)
 * Returns [{ id, auctionId, title, type, finalPrice, endTime, purchaseDeadline, purchaseStatus, paymentId, image }]
 */
exports.listMyWins = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const wins = await Winner.find({ user: userId })
      .populate("auction", "title type endTime imageUrl")
      .lean();

    const items = wins.map((w) => ({
      id: w._id,
      auctionId: w.auction?._id,
      title: w.auction?.title,
      type: w.auction?.type,
      finalPrice: w.amount,
      endTime: w.auction?.endTime,
      purchaseDeadline: w.purchaseDeadline,
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
