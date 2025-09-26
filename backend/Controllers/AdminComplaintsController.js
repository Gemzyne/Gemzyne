// backend/Controllers/AdminComplaintsController.js
const Feedback = require("../Models/FeedbackModel");

// GET /api/admin/complaints?category=website
exports.listComplaints = async (req, res) => {
  try {
    const q = (req.query.category || "website").toString().toLowerCase();

    // match "website" in complaintCategory OR categories[]
    const match = {
      type: "complaint",
      $or: [
        { complaintCategory: { $regex: q, $options: "i" } },
        { categories: { $elemMatch: { $regex: q, $options: "i" } } },
      ],
    };

    const docs = await Feedback.find(match)
      .sort({ createdAt: -1 })
      .select("_id createdAt status complaintCategory categories feedbackText firstName lastName adminReply");

    const payload = docs.map(f => ({
      _id: f._id,
      createdAt: f.createdAt,
      status: f.status,
      complaintCategory: f.complaintCategory,
      categories: f.categories,
      feedbackText: f.feedbackText,
      firstName: f.firstName,
      lastName: f.lastName,
      adminReply: f.adminReply || null,
    }));

    res.json({ ok: true, complaints: payload });
  } catch (e) {
    console.error("Admin listComplaints", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};
