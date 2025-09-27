const jwt = require("jsonwebtoken");
const Session = require("../Models/SessionModel");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing access token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.sub, role: decoded.role };
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// Revoke all refresh sessions for a user (used after password change/reset)
async function revokeAllSessions(userId) {
  await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), expiresAt: new Date() } }
  );
}

module.exports = { requireAuth, requireRoles, revokeAllSessions };
