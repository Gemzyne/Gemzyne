const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: String,

    // required fields used by your form
    rating: { type: Number, required: true, min: 1, max: 5 },
    categories: [{ type: String, required: true }],
    reviewText: { type: String, required: true },

    images: [{ type: String }],

    // (optional) keep a productId so you can filter later
    productId: { type: String, default: null },
    productName: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);


