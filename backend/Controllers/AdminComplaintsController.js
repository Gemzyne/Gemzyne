// backend/Controllers/AdminComplaintsController.js
const Feedback = require("../Models/FeedbackModel");

// GET /api/admin/complaints
// ?category=<name> to filter (case-insensitive). Use category=all to force no filtering.
exports.listComplaints = async (req, res) => {
  try {
    const category = (req.query.category || "").toString().trim().toLowerCase();

    // Base: all complaints
    const match = { type: "complaint" };

    // If a category is provided and not "all", apply filter
    if (category && category !== "all") {
      match.$or = [
        { complaintCategory: { $regex: category, $options: "i" } },
        { categories: { $elemMatch: { $regex: category, $options: "i" } } },
      ];
    }

    const docs = await Feedback.find(match)
      .sort({ createdAt: -1 })
      .select(
        "_id createdAt status complaintCategory categories feedbackText firstName lastName email adminReply user productName productId orderId"
      );

    const payload = docs.map((f) => ({
      _id: f._id,
      createdAt: f.createdAt,
      status: f.status,
      complaintCategory: f.complaintCategory,
      categories: f.categories,
      feedbackText: f.feedbackText,
      firstName: f.firstName,
      lastName: f.lastName,
      email: f.email,
      adminReply: f.adminReply || null,
      user: f.user || null,
      productName: f.productName,
      productId: f.productId,
      orderId: f.orderId,
    }));

    res.json({ ok: true, complaints: payload });
  } catch (e) {
    console.error("Admin listComplaints", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};
