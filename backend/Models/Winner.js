// Models/Winner.js
const mongoose = require("mongoose");

const WinnerSchema = new mongoose.Schema(
  {
    // Reference to the Auction document the user won
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true,
    },

    // NEW: denormalized human-friendly code copied from Auction.auctionId
    // Example: "AUC-2025-007"
    auctionCode: {
      type: String,
      required: true,      // we require this so every Winner has a code
      trim: true,
      unique: true,        // ensures one winner record per code (code is unique on Auction too)
      index: true,
    },

    // The user who won
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Final winning amount
    amount: { type: Number, required: true, min: 1 },

    // Optional deadline to complete purchase (e.g., 7 days after end)
    purchaseDeadline: { type: Date, default: null },

    // Payment / purchase status lifecycle
    purchaseStatus: {
      type: String,
      enum: ["pending", "paid", "expired", "cancelled"],
      default: "pending",
    },

    // Optional reference to a Payment document when paid
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
  },
  { timestamps: true }
);

// Only one winner per auction ObjectId (hard guard)
WinnerSchema.index({ auction: 1 }, { unique: true });

// Helper: if code wasn't provided, try to auto-fill it from the Auction
WinnerSchema.pre("validate", async function (next) {
  try {
    if (!this.auctionCode && this.auction) {
      const Auction = mongoose.model("Auction");
      const au = await Auction.findById(this.auction).select("auctionId").lean();
      if (au?.auctionId) this.auctionCode = au.auctionId;
    }
  } catch (err) {
    // If we fail to auto-fill, validation will catch missing `auctionCode`
  }
  next();
});

module.exports = mongoose.model("Winner", WinnerSchema);
