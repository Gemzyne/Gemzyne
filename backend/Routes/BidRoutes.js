const router = require("express").Router();

// Use your team's shared middleware (matches JWT signing)
const { requireAuth } = require("../Middleware/auth");

const ctrl = require("../Controllers/bidController");

// Bidding
router.post("/place", requireAuth, ctrl.placeBid);
router.post("/increase", requireAuth, ctrl.increaseBid);

// Buyer view
router.get("/my", requireAuth, ctrl.listMyBids);

// (optional) Seller view for one auction
router.get("/auction/:id", requireAuth, ctrl.listBidsForAuction);

module.exports = router;
