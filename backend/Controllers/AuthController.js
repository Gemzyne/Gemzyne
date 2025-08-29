const crypto = require('crypto');
const User = require('../Models/UserModel');
const OtpCode = require('../Models/OtpCodeModel');
const Session = require('../Models/SessionModel');
const sendEmail = require('../Utills/Email');
const {
  signAccessToken,
  generateRawRefreshToken,
  createSession,
  verifyRefreshAgainstSession,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../Utills/Tokens');
const { revokeAllSessions } = require('../Middleware/auth');

const six = () => crypto.randomInt(100000, 999999).toString();

// POST /auth/register
exports.register = async (req, res) => {
  console.log('[WHOAMI] Controllers/AuthController.js -> register HIT');

  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ $or: [{ email }, ...(phone ? [{ phone }] : [])] });
    if (existing) return res.status(400).json({ message: 'Email or phone already registered' });

    const user = new User({ fullName, email, phone, role: 'buyer' });
    await user.setPassword(password);
    await user.save();

    const raw = six();
    console.log('[DEBUG OTP]:', raw);
    const otp = new OtpCode({
      userId: user._id,
      purpose: 'verify_email',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await otp.setCode(raw);
    await otp.save();

    await sendEmail({
      to: email,
      subject: 'Verify your GemZyne account',
      text: `Your OTP is ${raw}. It expires in 10 minutes.`,
    });
    console.log('[DEBUG] sendEmail finished');

    return res.status(201).json({ message: 'Registered. Check your email for the OTP.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /auth/verify-email
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or code' });

    const otp = await OtpCode.findOne({
      userId: user._id,
      purpose: 'verify_email',
      consumedAt: null,
    })
      .select('+codeHash')
      .sort({ createdAt: -1 });

    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const ok = await otp.verifyCode(code);
    if (!ok) return res.status(400).json({ message: 'Invalid code' });

    await otp.consume();
    user.emailVerified = true;
    await user.save();

    return res.json({ message: 'Email verified' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = email or phone
    if (!identifier || !password) return res.status(400).json({ message: 'Missing fields' });

    const user =
      (await User.findOne({ email: identifier }).select('+passwordHash')) ||
      (await User.findOne({ phone: identifier }).select('+passwordHash'));

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (user.status === 'suspended') return res.status(403).json({ message: 'Account suspended' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const accessToken = signAccessToken(user);
    const rawRefresh = generateRawRefreshToken();
    const session = await createSession(user._id, rawRefresh, req.headers['user-agent'], req.ip);

    setRefreshCookie(res, rawRefresh);

    return res.json({
      accessToken,
      user: user.toJSON(),
      sessionId: session._id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
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
        purpose: 'reset_password',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      await otp.setCode(raw);
      await otp.save();

      await sendEmail({
        to: email,
        subject: 'Your password reset code',
        text: `Use this OTP to reset your password: ${raw} (valid 10 minutes)`,
      });
    }

    return res.json({ message: 'If the account exists, a code has been sent to the email.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) return res.status(400).json({ message: 'Invalid email or code' });

    const otp = await OtpCode.findOne({
      userId: user._id,
      purpose: 'reset_password',
      consumedAt: null,
    })
      .select('+codeHash')
      .sort({ createdAt: -1 });

    if (!otp || otp.expiresAt < new Date()) return res.status(400).json({ message: 'Invalid or expired code' });

    const ok = await otp.verifyCode(code);
    if (!ok) return res.status(400).json({ message: 'Invalid code' });

    await user.setPassword(newPassword);
    await user.save();

    await otp.consume();
    await revokeAllSessions(user._id); // force re-login

    return res.json({ message: 'Password updated' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /auth/refresh
exports.refresh = async (req, res) => {
  try {
    const cookieName = process.env.REFRESH_COOKIE_NAME || 'gid';
    const rawRefresh = req.cookies[cookieName];
    const { sessionId } = req.body || {};

    if (!rawRefresh || !sessionId) return res.status(401).json({ message: 'Missing refresh' });

    const session = await Session.findById(sessionId);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    const ok = await verifyRefreshAgainstSession(session, rawRefresh);
    if (!ok) return res.status(401).json({ message: 'Invalid refresh token' });

    const user = await User.findById(session.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /auth/logout
exports.logout = async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, { $set: { revokedAt: new Date() } });
    }
    clearRefreshCookie(res);
    return res.json({ message: 'Logged out' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
};
