const router = require("express").Router();
// Use the shared project middleware so JWT verification matches login
const { requireAuth } = require("../Middleware/auth");
const ctrl = require("../Controllers/winnerController");

// Buyer: list only my wins
router.get("/my", requireAuth, ctrl.listMyWins);

// Auth: seller of the auction OR the winner can view full details for that auction
router.get("/auction/:auctionId", requireAuth, ctrl.getByAuction);

// Public: minimal winner summary for an ended auction (for Centre/history table)
router.get("/public/auction/:auctionId", ctrl.getPublicByAuction);

module.exports = router;
