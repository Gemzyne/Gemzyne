const router = require('express').Router();
const { requireAuth } = require('../Middleware/auth');
const me = require('../Controllers/MeController');

router.use(requireAuth);

router.get('/me', me.getMe);
router.patch('/me', me.updateMe);

router.post('/me/password', me.changeMyPassword);
router.post('/me/password/reset/request', me.requestMyPasswordReset);
router.post('/me/password/reset/confirm', me.confirmMyPasswordReset);

router.post('/me/email/request', me.requestEmailChange);
router.post('/me/email/confirm', me.confirmEmailChange);

router.delete('/me', me.softDeleteMe);

module.exports = router;
