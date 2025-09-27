// backend/Routes/UserOrdersRoutes.js
const express = require("express");
const router = express.Router();

const { listMine } = require("../Controllers/UserOrdersController");

// Use your existing auth middleware
const { requireAuth } = require("../Middleware/auth");

// GET /api/my-orders  → only the logged-in user's orders
router.get("/", requireAuth, listMine);

module.exports = router;
