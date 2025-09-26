// backend/Controllers/AdminMetricsController.js
const User = require("../Models/UserModel");
// const Complaint = require("../Models/ComplaintModel"); // if you have it

function monthsBack(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1); d.setHours(0,0,0,0);
  return d;
}

exports.getMetrics = async (req, res) => {
  try {
    // 1) Registrations by month (last 10 months)
    const from = monthsBack(9); // from 9 months ago -> now
    const regsByMonthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);

    // Normalize into labels + values for last 10 months
    const labels = [];
    const values = [];
    for (let i = 9; i >= 0; i--) {
      const d = monthsBack(i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1..12
      const found = regsByMonthAgg.find((r) => r._id.y === y && r._id.m === m);
      labels.push(d.toLocaleString("en", { month: "short" })); // Jan, Feb, …
      values.push(found ? found.count : 0);
    }

    // 2) Users by role (pie/doughnut)
    const rolesAgg = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const roles = rolesAgg.map((r) => r._id || "unknown");
    const roleCounts = rolesAgg.map((r) => r.count);

    // 3) Status breakdown (active/suspended)
    const statusAgg = await User.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statuses = statusAgg.map((s) => s._id || "unknown");
    const statusCounts = statusAgg.map((s) => s.count);

    // 4) Optional: complaints by status (if you have a collection)
    // const compAgg = await Complaint.aggregate([
    //   { $group: { _id: "$status", count: { $sum: 1 } } },
    //   { $sort: { count: -1 } },
    // ]);

    res.json({
      usersByMonth: { labels, values },      // for the bar chart
      usersByRole: { labels: roles, values: roleCounts }, // doughnut
      usersByStatus: { labels: statuses, values: statusCounts }, // small bar/doughnut
    });
  } catch (e) {
    console.error("getMetrics", e);
    res.status(500).json({ message: "Server error" });
  }
};
