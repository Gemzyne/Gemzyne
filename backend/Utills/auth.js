const jwt = require("jsonwebtoken");

// Prefer Bearer token; fall back to cookies commonly used by teams
function readToken(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const payload = jwt.verify(token, process.env.JWT);
    req.user = payload; // { id, role, ... } – must match what you sign at login
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    return next();
  };
}

module.exports = { requireAuth, requireRole };
