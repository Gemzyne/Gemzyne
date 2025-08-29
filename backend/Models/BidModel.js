//Bid model
const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: auctionModel,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    placedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
); // auto add createdAt, updatedAt

bidSchema.index({ auctionId: 1, amount: -1 }); // to get highest bid quickly
bidSchema.index({ auctionId: 1, amount: -1 }); //recent highest bid for auction
bidSchema.index({ userId: 1, auctionId: 1 }); // "Your bids" per user

//exporting the model
module.exports = mongoose.model("Bid", bidSchema);
