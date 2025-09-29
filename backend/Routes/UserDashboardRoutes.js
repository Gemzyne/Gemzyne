// backend/Routes/UserDashboardRoutes.js
const router = require("express").Router();
const { requireAuth } = require("../Middleware/auth");
const ctrl = require("../Controllers/UserDashboardController");

router.use(requireAuth);
router.get("/me", ctrl.getMyDashboard);

module.exports = router;
