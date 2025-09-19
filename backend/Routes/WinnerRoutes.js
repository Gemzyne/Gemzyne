// Routes/winnerRoutes.js
// ----------------------------------------------------
// Routes for winner info.
// NOTE: `:auctionId` can be either the Auction's Mongo _id OR its human code (AUC-YYYY-###)

const router = require("express").Router();
const { requireAuth } = require("../Middleware/auth");
const ctrl = require("../Controllers/winnerController");

// Buyer: list only my wins
router.get("/my", requireAuth, ctrl.listMyWins);

// Auth: seller of the auction OR the winner can view full details for that auction
router.get("/auction/:auctionId", requireAuth, ctrl.getByAuction);

// Public: minimal winner summary for an ended auction (for center/history table)
// Accepts :auctionId as Mongo _id or AUC-####-###
router.get("/public/auction/:auctionId", ctrl.getPublicByAuction);

module.exports = router;
