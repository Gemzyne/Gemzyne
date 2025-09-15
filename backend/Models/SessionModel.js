const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: { type: String, required: true, select: false },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

sessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "session_expires_ttl" }
);

module.exports = mongoose.model("Session", sessionSchema);
