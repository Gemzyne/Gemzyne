// Jobs/closeEndedAuction.js
const Auction = require("../Models/Auction");
const Bid = require("../Models/Bid");
const Winner = require("../Models/Winner");

// Find the highest bid for an auction.
// If two bids have the same amount, the earliest wins.
async function topBid(auctionId) {
  return Bid.findOne({ auction: auctionId })
    .sort({ amount: -1, placedAt: 1 })
    .lean();
}

// One execution "tick" of the job
async function tickOnce() {
  const now = new Date();

  //Promote upcoming -> ongoing when time window opens
  await Auction.updateMany(
    { status: { $ne: "ongoing" }, startTime: { $lte: now }, endTime: { $gt: now } },
    { $set: { status: "ongoing" } }
  ).catch(() => { /* ignore */ });

  //Close auctions that just ended and create winners
  const toClose = await Auction.find({
    endTime: { $lte: now },
    status: { $ne: "ended" },
  });

  for (const a of toClose) {
    const existingWinner = await Winner.findOne({ auction: a._id }).lean();
    const top = await topBid(a._id);

    //Mark auction ended, update current/final price
    a.status = "ended";
    a.endedAt = now;
    if (top) {
      a.currentPrice = Math.max(Number(a.currentPrice || 0), Number(top.amount || 0));
      // If your Auction schema has finalPrice, set it too:
      if ("finalPrice" in a) a.finalPrice = top.amount;
    }
    await a.save();

    //If we have a top bid and no winner exists, create the winner
    if (!existingWinner && top) {
      const purchaseDeadline = new Date(now.getTime() + 7 * 86400000); // +7 days
      await Winner.create({
        auction: a._id,           
        auctionCode: a.auctionId, 
        user: top.user,           
        amount: top.amount,       
        purchaseDeadline,
        purchaseStatus: "pending",
      });
    }
  }
}

//Start the interval job (runs every 2 minutes)
function startCloseEndedAuctionsJob() {
  setInterval(() => {
    tickOnce().catch((e) => console.error("closeEndedAuctions error:", e));
  }, 10 * 1000);
}

module.exports = { startCloseEndedAuctionsJob, tickOnce };
