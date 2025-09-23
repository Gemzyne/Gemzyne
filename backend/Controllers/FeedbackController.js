// backend/Controllers/FeedbackController.js
const Feedback = require("../Models/FeedbackModel");

/* ========================
 * CREATE (private)
 * ====================== */
exports.createFeedback = async (req, res) => {
  try {
    const {
      type,             // "review" | "complaint"
      firstName, lastName, email, phone,
      productId, productName,
      categories = [],
      feedbackText,
      images = [],
      rating,           // reviews
      complaintCategory,// complaints
      orderDate,
      orderId,
    } = req.body;

    if (!type || !["review", "complaint"].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'review' or 'complaint'" });
    }
    if (!feedbackText?.trim()) {
      return res.status(400).json({ success: false, message: "feedbackText is required" });
    }
    if (type === "review" && (!rating || rating < 1 || rating > 5)) {
      return res.status(400).json({ success: false, message: "rating (1-5) required for reviews" });
    }

    const doc = new Feedback({
      type,
      // tie feedback to the logged-in user (route uses requireAuth)
      user: req.user?.id || undefined,

      firstName, lastName, email, phone,
      productId, productName,
      categories,
      feedbackText,
      images,
      rating: type === "review" ? rating : undefined,
      complaintCategory: type === "complaint" ? complaintCategory : undefined,
      orderDate: type === "complaint" && orderDate ? new Date(orderDate) : undefined,
      orderId: type === "complaint" ? orderId : undefined,
      status: type === "complaint" ? "Pending" : undefined,
      // isAdminHidden defaults to false in the schema
    });

    const saved = await doc.save();
    res.status(201).json({ success: true, feedback: saved });
  } catch (err) {
    console.error("createFeedback error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================
 * READ (public): /api/feedback/public
 * Only returns publicly visible items (excludes hidden)
 * Optional: ?type=review|complaint
 * ====================== */
exports.getPublicFeedback = async (req, res) => {
  try {
    const { type } = req.query;

    const find = {
      $or: [{ isAdminHidden: { $exists: false } }, { isAdminHidden: false }],
    };
    if (type && ["review", "complaint"].includes(type)) {
      find.type = type;
    }

    // Public endpoint; no auth required; sort newest first
    const list = await Feedback.find(find).sort({ createdAt: -1 });

    res.json({ success: true, feedback: list });
  } catch (err) {
    console.error("getPublicFeedback error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================
 * READ (private): /api/feedback
 * Supports visibility + includeHidden + mine
 * ====================== */
exports.getFeedback = async (req, res) => {
  try {
    const { type, visibility } = req.query;
    const includeHidden = req.query.includeHidden === "1" || req.query.includeHidden === "true";
    const mine = req.query.mine === "1" || req.query.mine === "true";

    const find = {};

    if (type && ["review", "complaint"].includes(type)) {
      find.type = type;
    }

    if (mine && req.user?.id) {
      find.user = req.user.id;
    }

    // Visibility logic
    if (includeHidden) {
      // include both hidden + visible
    } else if (!visibility || visibility === "public") {
      find.$or = [{ isAdminHidden: { $exists: false } }, { isAdminHidden: false }];
    } else if (visibility === "hidden") {
      find.isAdminHidden = true;
    }
    // visibility === "all" => no filter

    const list = await Feedback.find(find).sort({ createdAt: -1 });
    res.json({ success: true, feedback: list });
  } catch (err) {
    console.error("getFeedback error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================
 * SOFT-DELETE (admin/seller) or HARD with ?hard=true
 * (kept for admin UI / backward compatibility)
 * ====================== */
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query; // ?hard=true to actually remove
    const reason = req.body?.reason;

    if (hard === "true") {
      const del = await Feedback.findByIdAndDelete(id);
      if (!del) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, hard: true });
    }

    // Soft hide (same effect as PATCH /:id/hide)
    const doc = await Feedback.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    const role = req.user?.role || "admin";
    doc.isAdminHidden = true;
    doc.hiddenByRole = role;
    doc.hiddenAt = new Date();
    if (reason) doc.hiddenReason = reason;

    await doc.save();
    return res.json({ success: true, soft: true, feedback: doc });
  } catch (err) {
    console.error("deleteFeedback error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================
 * PATCH /:id/hide (preferred soft-delete for admin/seller)
 * ====================== */
exports.hideFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason;
    const role = req.user?.role || "admin";

    const doc = await Feedback.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    doc.isAdminHidden = true;
    doc.hiddenByRole = role;
    doc.hiddenAt = new Date();
    if (reason) doc.hiddenReason = reason;

    await doc.save();
    res.json({ success: true, feedback: doc });
  } catch (err) {
    console.error("hideFeedback error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================
 * PATCH /:id/unhide (admin/seller)
 * ====================== */
exports.unhideFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Feedback.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    doc.isAdminHidden = false;
    doc.hiddenByRole = null;
    doc.hiddenAt = null;
    doc.hiddenReason = null;

    await doc.save();
    res.json({ success: true, feedback: doc });
  } catch (err) {
    console.error("unhideFeedback error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* Legacy alias for unhide */
exports.restoreFeedback = exports.unhideFeedback;

/* ========================
 * DELETE (owner): /api/feedback/my/:id
 * Hard-deletes ONLY if the current user owns the doc
 * ====================== */
exports.deleteMyFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await Feedback.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    if (!doc.user || String(doc.user) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await Feedback.findByIdAndDelete(id);
    return res.json({ success: true, deleted: true });
  } catch (err) {
    console.error("deleteMyFeedback error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================
 * UPDATE (private)
 * ====================== */
exports.updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,                   // "review" | "complaint"
      firstName, lastName, email, phone,
      productId, productName,
      categories,
      feedbackText,
      images,
      rating,
      complaintCategory,
      orderDate,
      orderId,
      status,
    } = req.body;

    const doc = await Feedback.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    if (type && !["review", "complaint"].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'review' or 'complaint'" });
    }
    if (type === "review" && (rating && (rating < 1 || rating > 5))) {
      return res.status(400).json({ success: false, message: "rating (1-5) invalid for reviews" });
    }

    // Update only provided fields
    if (type) doc.type = type;
    if (firstName != null) doc.firstName = firstName;
    if (lastName  != null) doc.lastName  = lastName;
    if (email     != null) doc.email     = email;
    if (phone     != null) doc.phone     = phone;

    if (productId   != null) doc.productId   = productId;
    if (productName != null) doc.productName = productName;

    if (Array.isArray(categories)) doc.categories = categories;
    if (feedbackText != null) doc.feedbackText = feedbackText;
    if (Array.isArray(images)) doc.images = images;

    if (type === "review" || rating != null) doc.rating = rating;
    if (type === "complaint" || complaintCategory != null) doc.complaintCategory = complaintCategory;

    if (orderDate != null) doc.orderDate = orderDate ? new Date(orderDate) : undefined;
    if (orderId   != null) doc.orderId   = orderId;
    if (status    != null) doc.status    = status;

    const saved = await doc.save();
    res.json({ success: true, feedback: saved });
  } catch (err) {
    console.error("updateFeedback error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// PATCH /api/feedback/:id/reply  { text }
exports.addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const fb = await Feedback.findById(id);
    if (!fb) return res.status(404).json({ message: "Feedback not found" });

    fb.adminReply = {
      text: String(text).trim(),
      byRole: req.user?.role || null,
      byUser: req.user?.id || null,
      createdAt: new Date(),
    };

    // ✅ ADD: auto-mark complaints as Resolved when replying
    if (fb.type === "complaint" && String(fb.status).toLowerCase() !== "resolved") {
      fb.status = "Resolved";
    }

    await fb.save();
    return res.json({ ok: true, feedback: fb });
  } catch (e) {
    console.error("addReply", e);
    return res.status(500).json({ message: "Server error" });
  }
};

