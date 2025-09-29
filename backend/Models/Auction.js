const mongoose = require("mongoose");

const auctionSchema = new mongoose.Schema(
  {
    auctionId: { type: String, unique: true, index: true }, // AUC-YYYY-###
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["diamond", "sapphire", "ruby", "emerald", "other"],
      required: true,
      index: true,
    },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },

    basePrice: { type: Number, required: true, min: 1 },
    currentPrice: { type: Number, required: true, min: 1 },

    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: ["upcoming", "ongoing", "ended"],
      default: "upcoming",
      index: true,
    },

    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    bidsCount: { type: Number, default: 0 },
    highestBid: {
      amount: { type: Number, default: 0 },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: { type: Date },
    },

    endedAt: { type: Date },
  },
  { timestamps: true }
);

auctionSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Auction", auctionSchema);
