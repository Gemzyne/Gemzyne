const router = require('express').Router();
const { requireAuth, requireRoles } = require('../Middleware/auth');
const ctrl = require('../Controllers/PaymentController');

// all need auth
router.use(requireAuth);

// Buyer: my payments
router.get('/my', ctrl.listMyPayments);

// Buyer/Staff: remove saved card from a single payment
router.delete('/:id/card', ctrl.deleteSavedCard);


// Seller/Admin: all payments
router.get('/', requireRoles('seller', 'admin'), ctrl.listAllPayments);

// Shared: details
router.get('/:id', ctrl.getPaymentById);

// Seller/Admin: confirm bank transfers
router.patch('/:id/mark-paid', requireRoles('seller', 'admin'), ctrl.markBankPaid);

// Seller/Admin: generic status update (pending → paid | cancelled)
router.patch('/:id/status', requireRoles('seller', 'admin'), ctrl.updateStatus);

module.exports = router;
