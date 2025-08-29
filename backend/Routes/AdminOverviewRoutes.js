const router = require('express').Router();
const { requireAuth, requireRoles } = require('../Middleware/auth');
const ctrl = require('../Controllers/AdminOverviewController');

router.use(requireAuth, requireRoles('admin'));
router.get('/', ctrl.getOverview);

module.exports = router;
