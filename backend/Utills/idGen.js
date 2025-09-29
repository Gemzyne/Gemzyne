// Auction ID format: AUC-{YYYY}-{3-digit sequence}
const Auction = require("../Models/Auction");

async function nextAuctionId() {
  const year = new Date().getFullYear();
  const prefix = `AUC-${year}-`;
  const last = await Auction
    .findOne({ auctionId: new RegExp(`^${prefix}\\d{3}$`) })
    .sort({ auctionId: -1 })
    .select("auctionId")
    .lean();

  let seq = 0;
  if (last?.auctionId) {
    seq = parseInt(last.auctionId.slice(-3), 10);
  }
  const next = String(seq + 1).padStart(3, "0");
  return `${prefix}${next}`;
}

module.exports = { nextAuctionId };
