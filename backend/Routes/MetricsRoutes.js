// backend/Routes/MetricsRoutes.js
const router = require('express').Router();
const { requireAuth, requireRoles } = require('../Middleware/auth');
const m = require('../Controllers/MetricsController');

// All metrics are read-only and require seller/admin
router.use(requireAuth, requireRoles('seller', 'admin'));

router.get('/seller/summary', m.summary);
router.get('/seller/monthly', m.monthlyRevenue);
router.get('/seller/category', m.categoryBreakdown);

module.exports = router;
