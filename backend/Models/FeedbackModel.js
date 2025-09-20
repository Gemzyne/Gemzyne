const mongoose = require("mongoose");

/**
 * Unified document for both reviews & complaints.
 * type: "review" | "complaint"
 *
 * For "review": rating (1–5) required, categories[], feedbackText required
 * For "complaint": rating optional, complaintCategory/details optional fields below
 */
const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["review", "complaint"],
      required: true,
    },

    // who submitted (optional now; wire auth later)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // basic contact (since your forms collect these)
    firstName: String,
    lastName: String,
    email: String,
    phone: String,

    // product-ish
    productId: String,
    productName: String,

    // shared content
    categories: [{ type: String }], // e.g. ["quality","shipping"]
    feedbackText: { type: String, required: true },
    images: [{ type: String }], // URLs if you add uploads later

    // review-only
    rating: { type: Number, min: 1, max: 5 },

    // complaint-only
    complaintCategory: String, // e.g. "shipping","service"
    orderDate: Date,
    orderId: String,
    status: { type: String, default: "Pending" }, // for complaints workflow

    // --- Soft removal by admin/seller (don't hard-delete user item) ---
    isAdminHidden: { type: Boolean, default: false }, // hidden from public/admin lists by moderation
    hiddenByRole: { type: String, enum: ["admin", "seller", null], default: null },
    hiddenAt: { type: Date, default: null },
    hiddenReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
