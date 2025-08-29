const router = require('express').Router();
const { requireAuth, requireRoles } = require('../Middleware/auth');
const ctrl = require('../Controllers/AdminComplaintsController');

router.use(requireAuth, requireRoles('admin'));
router.get('/', ctrl.listComplaints);

module.exports = router;
