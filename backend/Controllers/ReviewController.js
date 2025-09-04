const Review = require("../Models/ReviewModel");

// POST /api/reviews
exports.addReview = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      rating,
      categories,
      reviewText,
      images = [],
      productId = null,
      productName = null,
    } = req.body;

    // simple safety checks
    if (!rating || !categories?.length || !reviewText) {
      return res.status(400).json({
        success: false,
        message: "rating, categories, and reviewText are required",
      });
    }

    const review = await Review.create({
      firstName,
      lastName,
      email,
      rating,
      categories,
      reviewText,
      images,
      productId,
      productName,
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    console.error("Add review error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/reviews/product/:productId
exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId });
    res.json({ success: true, reviews });
  } catch (err) {
    console.error("Get reviews by product error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/reviews
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    console.error("Get all reviews error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
