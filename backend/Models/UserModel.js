const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto"); // for generating secure random OTP

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"], // restrict values
      default: "buyer", // default user type
      required: true,
    },
    otp: {
      type: String, // store OTP for verification
      default: null,
    },
    otpExpires: {
      type: Date, // optional expiry date for OTP
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method for login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
// Generate OTP for verification
userSchema.methods.generateOTP = async function () {
  // Generate 6-digit numeric OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Set OTP and expiry (5 minutes from now)
  this.otp = otp;
  this.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes in ms

  await this.save(); // save OTP to user document

  return otp; // return OTP to send via email/SMS
};

module.exports = mongoose.model("UserModel", userSchema);
