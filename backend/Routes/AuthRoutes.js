const router = require("express").Router();
const ctrl = require("../Controllers/AuthController");

router.post("/register", ctrl.register);
router.post("/verify-email", ctrl.verifyEmail);
router.post("/login", ctrl.login);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.post("/refresh", ctrl.refresh);
router.post("/logout", ctrl.logout);
router.post("/resend-verify", ctrl.resendVerify);

module.exports = router;
