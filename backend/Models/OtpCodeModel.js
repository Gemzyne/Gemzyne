const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const otpCodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["verify_email", "reset_password", "change_email"],
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true, select: false },
    // for email change flow
    targetEmail: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null, index: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL cleanup
otpCodeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "otp_expires_ttl" }
);

otpCodeSchema.methods.setCode = async function (rawCode) {
  const salt = await bcrypt.genSalt(10);
  this.codeHash = await bcrypt.hash(rawCode, salt);
};

otpCodeSchema.methods.verifyCode = async function (rawCode) {
  const ok = await bcrypt.compare(rawCode, this.codeHash);
  this.attempts += 1;
  await this.save();
  return ok;
};

otpCodeSchema.methods.consume = async function () {
  this.consumedAt = new Date();
  this.expiresAt = new Date();
  await this.save();
};

module.exports = mongoose.model("OtpCode", otpCodeSchema);
