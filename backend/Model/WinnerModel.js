//winner model
const mongoose = require("mongoose");

const winnerSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      unique: true,
      index: true,
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    winningBid: {
      type: Number,
      required: true,
      min: 0,
    },
    // usually = schedule.endTime
    endedAt: {
      type: Date,
      required: true,
      index: true,
    },
    // endedAt + 7 days
    purchaseDeadline: {
      type: Date,
      required: true,
      index: true,
    },
    purchaseStatus: {
      type: String,
      enum: ["pending", "paid", "expired", "canceled"],
      default: "pending",
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    purchasedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

winnerSchema.index({ winnerId: 1, purchaseStatus: 1 }); // to get all active wins for user

//exprot
module.exports = mongoose.model("Winner", winnerSchema);
