const express = require("express");
const { addComplaint, getAllComplaints } = require("../Controllers/ComplaintController");
const router = express.Router();

router.post("/", addComplaint);
router.get("/", getAllComplaints); // optional

module.exports = router;
