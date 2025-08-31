const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Session = require("../Models/SessionModel");

const ACCESS_TTL_MIN = 15; // minutes
const REFRESH_TTL_DAYS = 30;

function signAccessToken(user) {
  const payload = { sub: user._id.toString(), role: user.role };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: `${ACCESS_TTL_MIN}m`,
  });
}

function generateRawRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

async function hashRefreshToken(raw) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(raw, salt);
}

async function createSession(userId, rawRefreshToken, ua, ip) {
  const refreshTokenHash = await hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  return Session.create({
    userId,
    refreshTokenHash,
    userAgent: ua,
    ip,
    expiresAt,
  });
}

async function verifyRefreshAgainstSession(session, rawToken) {
  const full = await Session.findById(session._id).select("+refreshTokenHash");
  if (!full || full.revokedAt || full.expiresAt < new Date()) return false;
  return bcrypt.compare(rawToken, full.refreshTokenHash);
}

function setRefreshCookie(res, rawToken) {
  res.cookie(process.env.REFRESH_COOKIE_NAME || "gid", rawToken, {
    httpOnly: true,
    secure: process.env.REFRESH_COOKIE_SECURE === "true",
    sameSite: process.env.REFRESH_COOKIE_SAMESITE || "Lax",
    domain: process.env.REFRESH_COOKIE_DOMAIN || undefined,
    path: "/auth",
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(process.env.REFRESH_COOKIE_NAME || "gid", {
    path: "/auth",
    domain: process.env.REFRESH_COOKIE_DOMAIN || undefined,
  });
}

module.exports = {
  signAccessToken,
  generateRawRefreshToken,
  createSession,
  verifyRefreshAgainstSession,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_TTL_DAYS,
};
