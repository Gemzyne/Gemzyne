// backend/Routes/OrderRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { createCustomOrder, getCustomOrder } = require('../Controllers/CustomOrderController');
const { checkout } = require('../Controllers/PaymentController');

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

// Create custom order (from Customize page)
router.post('/', createCustomOrder);

// Read custom order (Payment page summary)
router.get('/:id', getCustomOrder);

// Checkout: Card JSON or Bank (multipart with "slip")
router.post('/:id/checkout', upload.single('slip'), checkout);

module.exports = router;
