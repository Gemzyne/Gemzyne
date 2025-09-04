const express = require("express");
const {
  addReview,
  getReviewsByProduct,
  getAllReviews,
} = require("../Controllers/ReviewController");

const router = express.Router();

// Add a review
router.post("/", addReview);

// All reviews
router.get("/", getAllReviews);

// Reviews for one product (uses optional productId in Option A)
router.get("/product/:productId", getReviewsByProduct);

module.exports = router;

