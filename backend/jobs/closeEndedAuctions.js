const Auction = require("../Models/Auction");
const Bid = require("../Models/Bid");
const Winner = require("../Models/Winner");

async function topBid(auctionId) {
  // Highest amount; for ties, earliest wins
  return Bid.findOne({ auction: auctionId })
    .sort({ amount: -1, placedAt: 1 })
    .lean();
}

async function tickOnce() {
  const now = new Date();

  // 1) Promote upcoming -> ongoing (keeps status tidy)
  await Auction.updateMany(
    { status: { $ne: "ongoing" }, startTime: { $lte: now }, endTime: { $gt: now } },
    { $set: { status: "ongoing" } }
  ).catch(() => {});

  // 2) Close auctions that just ended and create winners
  const toClose = await Auction.find({
    endTime: { $lte: now },
    status: { $ne: "ended" },
  });

  for (const a of toClose) {
    const existingWinner = await Winner.findOne({ auction: a._id }).lean();
    const top = await topBid(a._id);

    // mark ended & sync price/finalPrice
    a.status = "ended";
    a.endedAt = now;
    if (top) {
      a.currentPrice = Math.max(Number(a.currentPrice || 0), Number(top.amount || 0));
      if ("finalPrice" in a) a.finalPrice = top.amount; // only if your model has this field
    }
    await a.save();

    // create Winner doc if there was a bid and not already created
    if (!existingWinner && top) {
      const purchaseDeadline = new Date(now.getTime() + 7 * 86400000);
      await Winner.create({
        auction: a._id,
        user: top.user,
        amount: top.amount,
        purchaseDeadline,
        purchaseStatus: "pending",
      });
    }
  }
}

function startCloseEndedAuctionsJob() {
  setInterval(() => {
    tickOnce().catch((e) => console.error("closeEndedAuctions error:", e));
  }, 2 * 60 * 1000); // every 2 minutes
}

module.exports = { startCloseEndedAuctionsJob, tickOnce };
