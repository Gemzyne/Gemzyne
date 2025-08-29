// backend/Controllers/AdminOverviewController.js
const User = require('../Models/UserModel');

exports.getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalSellers = await User.countDocuments({ role: 'seller' });

    // If you don't have Orders/Complaints models yet, return zeros for now.
    const totalOrders = 0;
    const openComplaints = 0;

    res.json({ totalUsers, totalSellers, totalOrders, openComplaints });
  } catch (e) {
    console.error('Admin getOverview', e);
    res.status(500).json({ message: 'Server error' });
  }
};
