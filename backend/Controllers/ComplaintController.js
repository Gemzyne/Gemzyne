const Complaint = require("../Models/ComplaintModel");

// simple helper to make LG-xxxx ref
function makeRef() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `LG-${n}`;
}

// POST /api/complaints
exports.addComplaint = async (req, res) => {
  try {
    const reference = makeRef();
    const complaint = await Complaint.create({
      firstName: req.body.firstName,
      lastName:  req.body.lastName,
      email:     req.body.email,
      phone:     req.body.phone || "",
      orderDate: req.body.orderDate,
      product:   req.body.product || "",
      category:  req.body.category,
      details:   req.body.details,
      images:    req.body.images || [],
      status:    "new",
      reference,
    });
    res.status(201).json({ success: true, complaint });
  } catch (err) {
    console.error("Add complaint error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/complaints  (optional list, useful for admin or testing)
exports.getAllComplaints = async (_req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
