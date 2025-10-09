const crypto = require("crypto");
const User = require("../Models/UserModel");
const OtpCode = require("../Models/OtpCodeModel");
const { revokeAllSessions } = require("../Middleware/auth");
const sendEmail = require("../Utills/Email");

const six = () => crypto.randomInt(100000, 999999).toString();

function safe(u) {
  const o = u.toObject ? u.toObject() : u;
  delete o.passwordHash;
  return o;
}

// GET /users/me
exports.getMe = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });
    res.json({ user: safe(me) });
  } catch (e) {
    console.error("getMe", e);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /users/me   { fullName, phone }
exports.updateMe = async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    if (typeof fullName === "string") me.fullName = fullName.trim();
    if (typeof phone === "string") me.phone = phone.trim();

    await me.save();
    res.json({ user: safe(me) });
  } catch (e) {
    console.error("updateMe", e);
    if (e?.code === 11000)
      return res.status(400).json({ message: "Phone already in use" });
    res.status(500).json({ message: "Server error" });
  }
};

// POST /users/me/password   { currentPassword, newPassword }
exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "currentPassword and newPassword are required" });
    }
    const me = await User.findById(req.user.id).select("+passwordHash");
    if (!me) return res.status(404).json({ message: "User not found" });

    const ok = await me.comparePassword(currentPassword);
    if (!ok)
      return res.status(400).json({ message: "Current password is incorrect" });

    await me.setPassword(newPassword);
    await me.save();
    await revokeAllSessions(me._id);

    res.json({ message: "Password updated" });
  } catch (e) {
    console.error("changeMyPassword", e);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /users/me/password/reset/request
exports.requestMyPasswordReset = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const code = six();
    const otp = new OtpCode({
      userId: me._id,
      purpose: "reset_password",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await otp.setCode(code);
    await otp.save();

    await sendEmail({
      to: me.email,
      subject: "Your password reset code",
      text: `Use this OTP to reset your password: ${code}. It expires in 10 minutes.`,
    });

    res.json({ message: "Reset code sent to your email" });
  } catch (e) {
    console.error("requestMyPasswordReset", e);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /users/me/password/reset/confirm   { code, newPassword }
exports.confirmMyPasswordReset = async (req, res) => {
  try {
    const { code, newPassword } = req.body;
    if (!code || !newPassword)
      return res
        .status(400)
        .json({ message: "code and newPassword are required" });

    const me = await User.findById(req.user.id).select("+passwordHash");
    if (!me) return res.status(404).json({ message: "User not found" });

    const otp = await OtpCode.findOne({
      userId: me._id,
      purpose: "reset_password",
      consumedAt: null,
    })
      .select("+codeHash")
      .sort({ createdAt: -1 });

    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    const ok = await otp.verifyCode(code);
    if (!ok) return res.status(400).json({ message: "Invalid code" });

    await me.setPassword(newPassword);
    await me.save();
    await otp.consume();
    await revokeAllSessions(me._id);

    res.json({ message: "Password reset successful" });
  } catch (e) {
    console.error("confirmMyPasswordReset", e);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /users/me/email/request   { newEmail }
exports.requestEmailChange = async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail)
      return res.status(400).json({ message: "newEmail is required" });

    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const exists = await User.findOne({ email: newEmail.toLowerCase().trim() });
    if (exists)
      return res.status(400).json({ message: "Email already in use" });

    const code = six();
    const otp = new OtpCode({
      userId: me._id,
      purpose: "change_email",
      targetEmail: newEmail.toLowerCase().trim(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await otp.setCode(code);
    await otp.save();

    await sendEmail({
      to: newEmail,
      subject: "Confirm your new email",
      text: `Your email change code is: ${code}. It expires in 10 minutes.`,
    });

    res.json({ message: "Verification code sent to new email" });
  } catch (e) {
    console.error("requestEmailChange", e);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /users/me/email/confirm   { code }
exports.confirmEmailChange = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "code is required" });

    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const otp = await OtpCode.findOne({
      userId: me._id,
      purpose: "change_email",
      consumedAt: null,
    })
      .select("+codeHash")
      .sort({ createdAt: -1 });

    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    const ok = await otp.verifyCode(code);
    if (!ok) return res.status(400).json({ message: "Invalid code" });

    me.email = otp.targetEmail;
    me.emailVerified = true;
    await me.save();
    await otp.consume();

    res.json({ message: "Email updated", user: safe(me) });
  } catch (e) {
    console.error("confirmEmailChange", e);
    if (e?.code === 11000)
      return res.status(400).json({ message: "Email already in use" });
    res.status(500).json({ message: "Server error" });
  }
};

exports.softDeleteMe = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });
    if (me.isDeleted) return res.status(400).json({ message: "Account already deleted" });

    me.isDeleted = true;
    me.deletedAt = new Date();
    me.deletionReason = reason ? String(reason).slice(0, 500) : null;
    me.status = "suspended";
    await me.save();

    await revokeAllSessions?.(me._id); 

    return res.json({ message: "Account deleted (soft)" });
  } catch (e) {
    console.error("softDeleteMe", e);
    return res.status(500).json({ message: "Server error" });
  }
};
