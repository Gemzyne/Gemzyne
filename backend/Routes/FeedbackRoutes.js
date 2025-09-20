// backend/Routes/FeedbackRoutes.js
const express = require("express");
const router = express.Router();

const {
  createFeedback,
  getFeedback,
  deleteFeedback,   // now soft-deletes by default (hard delete with ?hard=true)
  updateFeedback,
  restoreFeedback,  // <-- new: unhide a soft-deleted item
} = require("../Controllers/FeedbackController");

// If you have auth/role middlewares, plug them in later:
// const auth = require("../Middleware/auth");
// const requireRole = require("../Middleware/requireRole");

// Create feedback (review or complaint)
router.post("/", /* auth, */ createFeedback);

// Get feedback
// Supports query params:
//   ?type=review|complaint (optional)
//   ?visibility=public|all|hidden (default: public)
router.get("/", /* auth, */ getFeedback);

// Update feedback (edit)
router.put("/:id", /* auth, */ updateFeedback);

// Soft delete by default (admin/seller “hide”); hard delete with ?hard=true
router.delete("/:id", /* auth, */ deleteFeedback);

// Restore a previously soft-deleted feedback
router.patch("/:id/restore", /* auth, */ restoreFeedback);

module.exports = router;
