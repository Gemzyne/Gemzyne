// backend/Routes/FeedbackRoutes.js
const express = require("express");
const router = express.Router();

const {
  // PUBLIC read
  getPublicFeedback,

  // PRIVATE create/read/update
  createFeedback,
  getFeedback,
  updateFeedback,

  // owner hard-delete
  deleteMyFeedback,

  // admin/seller (legacy) soft-delete / restore
  deleteFeedback,
  restoreFeedback,

  // preferred explicit endpoints (admin/seller hide/unhide)
  hideFeedback,
  unhideFeedback,

   addReply,
   emailComplaint, 

   exportFeedbackReportPdf,

} = require("../Controllers/FeedbackController");

// ✅ reuse your existing auth middleware
const { requireAuth, requireRoles } = require("../Middleware/auth");

/* =========================
 * PUBLIC ROUTES (no token)
 * ======================= */
// Anyone can read publicly visible feedback.
// Use this on the public Reviews page.
router.get("/public", getPublicFeedback);

/* =========================
 * PRIVATE ROUTES (token required)
 * ======================= */

// Create feedback (review or complaint) — controller ties doc to req.user.id
router.post("/", requireAuth, createFeedback);

// List feedback for dashboards / "My Feedback"
// Query params supported:
//   ?type=review|complaint
//   ?visibility=public|all|hidden
//   ?includeHidden=1
//   ?mine=1  (only current user's items)
router.get("/", requireAuth, getFeedback);

// Update a feedback item
router.put("/:id", requireAuth, updateFeedback);

/* ---- Owner operations ----
 * Hard-delete your own feedback (only if req.user owns it)
 * IMPORTANT: this MUST be before the "/:id" delete route so it doesn't get shadowed
 */
router.delete("/my/:id", requireAuth, deleteMyFeedback);

/* ---- Admin/Seller operations ----
 * Preferred soft-hide / unhide endpoints
 */
router.patch("/:id/hide", requireAuth, hideFeedback);
router.patch("/:id/unhide", requireAuth, unhideFeedback);


// ⬇️ ADD THIS (admin/seller only)
router.patch("/:id/reply", requireAuth, requireRoles("admin", "seller"), addReply);

/* Legacy soft-delete by default (hard delete with ?hard=true)
 * Kept for backward compatibility / existing admin UI buttons
 */
router.delete("/:id", requireAuth, deleteFeedback);

// Legacy alias for unhide
router.patch("/:id/restore", requireAuth, restoreFeedback);

// Send an email to the complainant
router.post("/:id/email", requireAuth, requireRoles("admin", "seller"), emailComplaint);

// PDF report (admin/seller only)
router.get(
  "/report.pdf",
  requireAuth,
  requireRoles("admin", "seller"),
  exportFeedbackReportPdf
);


module.exports = router;
