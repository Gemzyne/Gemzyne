// backend/Routes/AdminMetricsRoutes.js
const router = require("express").Router();
const { requireAuth, requireRoles } = require("../Middleware/auth");
const metrics = require("../Controllers/AdminMetricsController");

router.use(requireAuth, requireRoles("admin"));
router.get("/", metrics.getMetrics);

module.exports = router;
