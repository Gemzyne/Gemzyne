// backend/Controllers/AdminOverviewController.js
const User = require('../Models/UserModel');
const Feedback = require('../Models/FeedbackModel');

exports.getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalSellers = await User.countDocuments({ role: 'seller' });

    // Count open complaints from unified Feedback model
    // "Open" = any complaint whose status is NOT 'resolved' or 'closed' (case-insensitive).
    const openAgg = await Feedback.aggregate([
      { $match: { type: "complaint" } },
      {
        $addFields: {
          _statusLower: {
            $toLower: { $ifNull: ["$status", "pending"] },
          },
        },
      },
      { $match: { _statusLower: { $nin: ["resolved", "closed"] } } },
      { $count: "n" },
    ]);
    const openComplaints = openAgg?.[0]?.n || 0;

    res.json({ totalUsers, totalSellers, openComplaints });
  } catch (e) {
    console.error('Admin getOverview', e);
    res.status(500).json({ message: 'Server error' });
  }
};
