const crypto = require("crypto");
const User = require("../Models/UserModel");
const OtpCode = require("../Models/OtpCodeModel");
const Session = require("../Models/SessionModel");
const sendEmail = require("../Utills/Email");
const {
  signAccessToken,
  generateRawRefreshToken,
  createSession,
  verifyRefreshAgainstSession,
  setRefreshCookie,
  clearRefreshCookie,
} = require("../Utills/Tokens");
const { revokeAllSessions } = require("../Middleware/auth");

const six = () => crypto.randomInt(100000, 999999).toString();

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: "fullName, email, password are required" });
    }

    const normEmail = String(email).toLowerCase().trim();

    // Find by email first (unique)
    let user = await User.findOne({ email: normEmail }).select("+passwordHash");

    if (user && !user.isDeleted) {
      // existing active user => duplicate
      return res.status(400).json({ message: "Email already registered" });
    }

    if (user && user.isDeleted) {
      // Restore same document
      user.fullName = fullName.trim();
      // update phone only if provided (and you may want to check it's not used by a different active user)
      if (phone) {
        const phoneHolder = await User.findOne({
          phone,
          isDeleted: false,
          _id: { $ne: user._id },
        });
        if (phoneHolder)
          return res.status(400).json({ message: "Phone already registered" });
        user.phone = String(phone).trim();
      }
      user.isDeleted = false;
      user.deletedAt = null;
      user.deletionReason = null;
      user.status = "active";
      user.emailVerified = false; // optional re-verify
      await user.setPassword(password);
      await user.save();
    }

    if (!user) {
      // brand new
      // (also ensure phone is free among active users)
      if (phone) {
        const phoneHolder = await User.findOne({ phone, isDeleted: false });
        if (phoneHolder)
          return res.status(400).json({ message: "Phone already registered" });
      }

      user = new User({
        fullName: fullName.trim(),
        email: normEmail,
        phone: phone ? String(phone).trim() : null,
        role: "buyer",
        status: "active",
        emailVerified: false,
      });
      await user.setPassword(password);
      await user.save();
    }

    // Send verify code (same as you already do)
    const raw = six();
    const otp = new OtpCode({
      userId: user._id,
      purpose: "verify_email",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await otp.setCode(raw);
    await otp.save();

    await sendEmail({
      to: normEmail,
      subject: "Verify your GemZyne account",
      text: `Your OTP is ${raw}. It expires in 10 minutes.`,
    });

    return res.status(201).json({
      message: user.deletedAt
        ? "Restored. Check your email for the OTP."
        : "Registered. Check your email for the OTP.",
    });
  } catch (e) {
    console.error(e);
    if (e?.code === 11000) {
      // unique index collision (rare here, but keep guard)
      return res
        .status(400)
        .json({ message: "Email or phone already registered" });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /auth/verify-email
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or code" });

    if (user.isDeleted) {
      return res
        .status(403)
        .json({ message: "Account deleted. Re-register to restore." });
    }

    const otp = await OtpCode.findOne({
      userId: user._id,
      purpose: "verify_email",
      consumedAt: null,
    })
      .select("+codeHash")
      .sort({ createdAt: -1 });

    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    const ok = await otp.verifyCode(code);
    if (!ok) return res.status(400).json({ message: "Invalid code" });

    await otp.consume();
    user.emailVerified = true;
    await user.save();

    return res.json({ message: "Email verified" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = email or phone
    if (!identifier || !password)
      return res.status(400).json({ message: "Missing fields" });

    const user =
      (await User.findOne({ email: identifier }).select("+passwordHash")) ||
      (await User.findOne({ phone: identifier }).select("+passwordHash"));

    // ✅ first ensure user exists before accessing properties
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (user.isDeleted) {
      return res
        .status(403)
        .json({ message: "Account deleted. Re-register to restore." });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Account suspended" });
    }

    // ✅ block login until email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Email not verified. Please verify your email to continue.",
        verifyRequired: true, // (optional) lets the client show OTP UI directly
      });
    }

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = signAccessToken(user);
    const rawRefresh = generateRawRefreshToken();
    const session = await createSession(
      user._id,
      rawRefresh,
      req.headers["user-agent"],
      req.ip
    );

    setRefreshCookie(res, rawRefresh);

    return res.json({
      accessToken,
      user: user.toJSON(),
      sessionId: session._id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const raw = six();
      const otp = new OtpCode({
        userId: user._id,
        purpose: "reset_password",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      await otp.setCode(raw);
      await otp.save();

      await sendEmail({
        to: email,
        subject: "Your password reset code",
        text: `Use this OTP to reset your password: ${raw} (valid 10 minutes)`,
      });
    }

    return res.json({
      message: "If the account exists, a code has been sent to the email.",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user)
      return res.status(400).json({ message: "Invalid email or code" });

    const otp = await OtpCode.findOne({
      userId: user._id,
      purpose: "reset_password",
      consumedAt: null,
    })
      .select("+codeHash")
      .sort({ createdAt: -1 });

    if (!otp || otp.expiresAt < new Date())
      return res.status(400).json({ message: "Invalid or expired code" });

    const ok = await otp.verifyCode(code);
    if (!ok) return res.status(400).json({ message: "Invalid code" });

    await user.setPassword(newPassword);
    await user.save();

    await otp.consume();
    await revokeAllSessions(user._id); // force re-login

    return res.json({ message: "Password updated" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /auth/refresh
exports.refresh = async (req, res) => {
  try {
    const cookieName = process.env.REFRESH_COOKIE_NAME || "gid";
    const rawRefresh = req.cookies[cookieName];
    const { sessionId } = req.body || {};

    if (!rawRefresh || !sessionId)
      return res.status(401).json({ message: "Missing refresh" });

    const session = await Session.findById(sessionId);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const ok = await verifyRefreshAgainstSession(session, rawRefresh);
    if (!ok) return res.status(401).json({ message: "Invalid refresh token" });

    const user = await User.findById(session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /auth/logout
exports.logout = async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, {
        $set: { revokedAt: new Date(), expiresAt: new Date() },
      });
    }
    clearRefreshCookie(res);
    return res.json({ message: "Logged out" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /auth/resend-verify
exports.resendVerify = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isDeleted) {
      return res
        .status(403)
        .json({ message: "Account deleted. Re-register to restore." });
    }

    if (user.emailVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }

    const raw = six();
    const otp = new OtpCode({
      userId: user._id,
      purpose: "verify_email",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await otp.setCode(raw);
    await otp.save();

    await sendEmail({
      to: user.email,
      subject: "Verify your GemZyne account",
      text: `Your OTP is ${raw}. It expires in 10 minutes.`,
    });

    return res.json({ message: "Verification code resent" });
  } catch (e) {
    console.error("resendVerify", e);
    return res.status(500).json({ message: "Server error" });
  }
};
