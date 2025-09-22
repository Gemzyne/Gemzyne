const express = require("express");
const router = express.Router();

const controller = require("../Controllers/CustomOrderController");

// if these are in another file, adjust the path:
const { requireAuth, requireRoles } = require("../Middleware/auth"); 
// ^^^ Make sure this path matches your project. It should export
//     requireAuth(req,res,next) and requireRoles(...roles)

//
// Create + Get (existing behavior)
//
router.post("/", requireAuth, controller.createCustomOrder);
router.get("/:id", requireAuth, controller.getCustomOrder);

//
// Seller/Admin management
//
router.get(
  "/",
  requireAuth,
  requireRoles("seller", "admin"),
  controller.listOrdersForSeller
);

router.patch(
  "/:id/order-status",
  requireAuth,
  requireRoles("seller", "admin"),
  controller.updateOrderStatus
);

router.delete(
  "/:id",
  requireAuth,
  requireRoles("seller", "admin"),
  controller.deleteOrder
);

module.exports = router;
