const express = require('express');
const router = express.Router();
const { createCustomOrder, getCustomOrder } = require('../Controllers/CustomOrderController');

router.post('/', createCustomOrder);
router.get('/:id', getCustomOrder);

module.exports = router;
