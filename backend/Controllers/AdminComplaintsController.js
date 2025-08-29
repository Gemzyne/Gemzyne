// backend/Controllers/AdminComplaintsController.js
// Stub until you have a Complaint model
exports.listComplaints = async (req, res) => {
  try {
    // Return empty list with standard fields your UI expects
    res.json([]);
  } catch (e) {
    console.error('Admin listComplaints', e);
    res.status(500).json({ message: 'Server error' });
  }
};
