const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ctrl = require("../Controllers/auctionController");

// Use the same auth your team uses everywhere else
const { requireAuth, requireRoles } = require("../Middleware/auth");

// Multer (auction images only)
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `auction_${Date.now()}${ext || ".png"}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/"))
      return cb(new Error("Only image files are allowed"));
    cb(null, true);
  },
});

// Public
router.get("/public", ctrl.publicList);

// Seller-only (must be BEFORE '/:id')
router.get(
  "/seller/overview",
  requireAuth,
  requireRoles("seller"),
  ctrl.sellerOverview
);
router.post(
  "/",
  requireAuth,
  requireRoles("seller"),
  upload.single("image"),
  ctrl.create
);
router.patch("/:id", requireAuth, requireRoles("seller"), ctrl.updateUpcoming);
router.delete("/:id", requireAuth, requireRoles("seller"), ctrl.deleteUpcoming);

// Single auction (LAST)
router.get("/:id", ctrl.getOne);

module.exports = router;
