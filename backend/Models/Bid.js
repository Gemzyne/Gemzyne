const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    auction: { type: mongoose.Schema.Types.ObjectId, ref: "Auction", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 1, index: true },
    placedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Optional helpful index for top bid queries (amount desc, placedAt asc)
bidSchema.index({ auction: 1, amount: -1, placedAt: 1 });

module.exports = mongoose.model("Bid", bidSchema);
