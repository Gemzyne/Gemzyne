const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
      // If you want uniqueness only when present:
      // index: { unique: true, sparse: true },
    },

    // In your original model you stored 'password'; here we store hash only.
    // If you prefer 'password' with a pre-save hook, adapt controllers accordingly.
    passwordHash: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
      required: true,
      index: true,
    },

    emailVerified: { type: Boolean, default: false },

    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
