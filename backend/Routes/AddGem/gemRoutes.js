// backend/Routes/AddGem/gemRoutes.js
const express = require("express");
const router = express.Router();
const upload = require("../../Middleware/AddGem/Upload");
const ctrl = require("../../Controllers/AddGems/gemController");
const { requireAuth, requireRoles } = require("../../Middleware/auth");

// Public
router.get("/", ctrl.listGems);
router.get("/:id", ctrl.getGemById);

// Seller/Admin
router.get("/mine/list", requireAuth, requireRoles("seller", "admin"), ctrl.listMine);

router.post(
  "/",
  requireAuth,
  requireRoles("seller", "admin"),
  upload.fields([
    { name: "images", maxCount: 4 },
    { name: "certificate", maxCount: 1 },
  ]),
  ctrl.createGem
);

router.put(
  "/:id",
  requireAuth,
  requireRoles("seller", "admin"),
  upload.fields([
    { name: "images", maxCount: 4 },
    { name: "certificate", maxCount: 1 },
  ]),
  ctrl.updateGem
);

router.delete(
  "/:id",
  requireAuth,
  requireRoles("seller", "admin"),
  ctrl.deleteGem
);

module.exports = router;
