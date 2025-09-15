const mongoose = require("mongoose");

const WinnerSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 }, // final winning amount
    purchaseDeadline: { type: Date, default: null }, // e.g., 7 days after win
    purchaseStatus: {
      type: String,
      enum: ["pending", "paid", "expired", "cancelled"],
      default: "pending",
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
  },
  { timestamps: true }
);

// Only one winner per auction
WinnerSchema.index({ auction: 1 }, { unique: true });

module.exports = mongoose.model("Winner", WinnerSchema);
