//auction schema
const mongoose = require("mongoose");
const { base } = require("./UserModel");

//Embedded schema for top three bids
const topBidSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    bidId: { type: mongoose.Schema.Types.ObjectId, ref: "Bid", required: true },
  },
  { _id: false }
); // no _id for subdocument

// Main auction schema
const auctionSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    item: {
      name: {
        type: String,
        required: true,
      },
      details: {
        category: { String, required: true }, // blue sapphire, red ruby, diamond
        weight: { type: Number, reqiured: true }, // in carats
        color: { type: String, required: true }, //royal blue, fancy blue, pink, white
        cut: { type: String, required: true }, //ovel, round, pear, emerald
      },
      images: [{ type: String, required: true }], // array of image URLs
    },
    schedule: {
      startTime: { type: Date, required: true, index: true },
      endTime: { type: Date, required: true, index: true },
    },
    pricing: {
      basePrice: { type: Number, required: true, min: 0 }, // minimum price
    },
    status: {
      type: {
        type: String,
        enum: ["upcoming", "ongoing", "ended"],
        required: true,
        index: true,
      },
    },
    // Live status fields
    stats: {
      highestBid: { type: Number, default: null },
      highestBidderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      bidCount: { type: Number, default: 0 },
      topBids: { type: [topBidSchema], default: [] }, // array of top 3 bids
    },
  },
  { timestamps: true }
);

// Create indexes for efficient querying
auctionSchema.index({ sellerId: 1 });
auctionSchema.index({
  "status.type": 1,
  "schedule.startTime": 1,
  "schedule.endTime": 1,
});

module.exports = mongoose.model("Auction", auctionSchema);
