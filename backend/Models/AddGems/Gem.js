const mongoose = require("mongoose");

/**
 * Field mapping to your form (left -> schema key)
 * - Gem Name*                -> name
 * - Gem Type*                -> type
 * - Carat Weight*            -> carat
 * - Dimensions (mm)          -> dimensionsMm
 * - Color Grade              -> colorGrade
 * - Shape/Cut Style          -> shape
 * - Clarity Grade            -> clarityGrade
 * - Cut Quality              -> cutQuality
 * - Treatment                -> treatment
 * - Certification            -> certificationAgency
 * - Certificate Number       -> certificateNumber
 * - Price ($)*               -> priceUSD
 * - Status*                  -> status
 * - Gem ID (auto-generated)  -> gemId
 * - Description              -> description
 * - Images (1–4)             -> images[]
 * - Certificate Image/URL    -> certificateUrl
 *
 * Extra (optional/back-compat):
 * - quality (free text like “AAA Quality”)
 * - origin, sku, createdBy, isActive
 */

const GemSchema = new mongoose.Schema(
  {
    // Human-friendly code shown in the UI (auto-filled like GM##########)
    gemId: { type: String, unique: true, index: true },

    // Basic info
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["sapphire", "ruby", "emerald", "diamond", "other"],
      required: true,
    },
    carat: { type: Number, required: true, min: 0 },

    // Detailed specs
    dimensionsMm: { type: String, default: "" }, // e.g., "8.5x6.5x4.2"
    colorGrade: { type: String, default: "" },   // e.g., "D"
    shape: { type: String, default: "" },        // e.g., "Oval", "Round", ...
    clarityGrade: { type: String, default: "" }, // e.g., "VVS1"
    cutQuality: { type: String, default: "" },   // e.g., "Excellent"
    treatment: {
      type: String,
      enum: ["heated", "unheated", "none"],
      default: "none",
    },

    // Certification
    certificationAgency: { type: String, default: "" }, // e.g., "GIA, IGI, AGS"
    certificateNumber: { type: String, default: "" },
    certificateUrl: { type: String, default: "" }, // image/pdf shown below details

    // Commerce
    priceUSD: { type: Number, required: true, min: 0 }, // base price in USD
    status: {
      type: String,
      enum: ["in_stock", "reserved", "sold", "out_of_stock"],
      default: "in_stock",
    },

    // Media
    images: {
      type: [String], // e.g., "/uploads/gems/123.jpg"
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 4,
        message: "Please upload between 1 and 4 images.",
      },
    },

    // Optional/back-compat/extras
    description: { type: String, default: "" },
    quality: { type: String, default: "" }, // keep for old UIs that show “AAA Quality”
    origin: { type: String, default: "" },

    sku: { type: String, unique: true, sparse: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Auto-generate gemId like: GM##########
GemSchema.pre("validate", function (next) {
  if (!this.gemId) {
    const rand = Math.floor(1_000_000_000 + Math.random() * 9_000_000_000); // 10 digits
    this.gemId = `GM${rand}`;
  }
  next();
});

module.exports = mongoose.model("Gem", GemSchema);
