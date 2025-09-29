const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { requireAuth } = require('../Middleware/auth');

const { createCustomOrder, getCustomOrder } = require('../Controllers/CustomOrderController');
const { checkout, checkoutFromGem, checkoutCustom } = require('../Controllers/PaymentController');
const ctrl = require('../Controllers/OrderController');

// prepare uploads directory for bank slips
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `slip_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// 🔒 protect all order endpoints
router.use(requireAuth);

// NEW: pay-first custom checkout (no pre-created order)
router.post('/custom/checkout', upload.single('slip'), checkoutCustom);

// Create order from inventory gem (reused by gem Buy Now flow if needed)
router.post('/from-gem/:gemId', ctrl.createFromGem);

// One-shot checkout directly from a gem (no pre-created order)
router.post('/from-gem/:gemId/checkout', upload.single('slip'), checkoutFromGem);

// Legacy: create custom order (pre-create). We keep this route but the UI won’t call it now.
router.post('/', createCustomOrder);

// Read custom order (Payment page summary when an orderId exists)
router.get('/:id', getCustomOrder);

// Checkout: Card JSON or Bank (multipart with "slip")
router.post('/:id/checkout', upload.single('slip'), checkout);

module.exports = router;
