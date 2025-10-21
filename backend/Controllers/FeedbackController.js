// backend/Controllers/FeedbackController.js
const PDFDocument = require("pdfkit");
const Feedback = require("../Models/FeedbackModel");
const sendEmail = require("../Utills/Email");  

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

// helper: escape HTML so user text is safe in an HTML email
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

exports.emailComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Email message is required" });
    }

    const fb = await Feedback.findById(id);
    if (!fb) return res.status(404).json({ message: "Feedback not found" });
    if (fb.type !== "complaint") {
      return res.status(400).json({ message: "Email is only supported for complaints" });
    }
    if (!fb.email) {
      return res.status(400).json({ message: "No customer email on this complaint" });
    }

    const subj =
      (subject && subject.toString().trim()) ||
      `Update on your ${fb.complaintCategory || "GemZyne"} complaint`;

    // Plain-text (keeps \n for clients that show text)
    const text = String(message);

    // HTML with preserved line breaks via white-space: pre-line
    const html =
      `<div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111">
         <div style="white-space:pre-line">${escapeHtml(message)}</div>
       </div>`;

    await sendEmail({
      to: fb.email,
      subject: subj,
      text,   // for text-based clients
      html,   // for HTML clients (keeps your newlines and bullets)
    });

    return res.json({ ok: true, sentTo: fb.email });
  } catch (e) {
    console.error("emailComplaint", e);
    return res.status(500).json({ message: "Failed to send email" });
  }
};

// GET /api/feedback/report.pdf?start=2025-09-01&end=2025-09-30&type=complaint&category=shipping&status=resolved&includeHidden=0
exports.exportFeedbackReportPdf = async (req, res) => {
  try {
    const {
      start,                // "YYYY-MM-DD"
      end,                  // "YYYY-MM-DD"
      type,                 // "review" | "complaint" | undefined
      category,             // "shipping" | "quality" | ...
      status,               // "resolved" | "pending" (complaints)
      includeHidden = "0",  // "1" to include admin-hidden
    } = req.query || {};

    // ---- Build query ----
    const q = {};
    if (type && type !== "all") q.type = type;
    if (start || end) {
      q.createdAt = {};
      if (start) q.createdAt.$gte = new Date(start + "T00:00:00.000Z");
      if (end)   q.createdAt.$lte = new Date(end   + "T23:59:59.999Z");
    }
    if (category) {
      q.$or = [{ complaintCategory: category }, { categories: category }];
    }
    if (status) q.status = status;
    if (includeHidden !== "1") q.isAdminHidden = { $ne: true };

    const docs = await Feedback.find(q).sort({ createdAt: -1 });

    // ---- Metrics ----
    const reviews = docs.filter(d => d.type === "review");
    const complaints = docs.filter(d => d.type === "complaint");
    const totalReviews = reviews.length;
    const totalComplaints = complaints.length;
    const avgRating = totalReviews
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / totalReviews).toFixed(2)
      : "0.00";
    const responded = complaints.filter(c => c?.adminReply?.text?.trim()).length;
    const resolved  = complaints.filter(c => String(c.status || "").toLowerCase() === "resolved").length;
    const responseRate   = totalComplaints ? Math.round((responded / totalComplaints) * 100) : 0;
    const resolutionRate = totalComplaints ? Math.round((resolved  / totalComplaints) * 100) : 0;

    // ---- Start PDF stream ----
    const filename = `feedback_report_${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    // ---- Header ----
    doc
      .fontSize(18)
      .fillColor("#000")
      .text("GemZyne – Feedback Report", { align: "left" })
      .moveDown(0.4);

    const periodLine = `Period: ${start || "-"} to ${end || "-"}`;
    const filterLine = `Filters: type=${type || "all"}, category=${category || "all"}, status=${status || "all"}, includeHidden=${includeHidden}`;
    doc
      .fontSize(10)
      .fillColor("#444")
      .text(periodLine)
      .moveDown(0.2)
      .text(filterLine);

    // ---- Summary box ----
// ---- Summary card (single source of truth) ----
const cardX = doc.page.margins.left;
const cardY = doc.y + 10;
const cardW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const cardH = 152;

// Keep alias for table code that uses `boxW`
const boxW = cardW;

// Gradient (fallback to solid if not supported)
let fillPaint = '#f6f1dc';
try {
  const g = doc.linearGradient(cardX, cardY, cardX, cardY + cardH);
  g.stop(0, '#fbf6e6').stop(1, '#f3ecd5');
  fillPaint = g;
} catch { /* solid fill is fine */ }

// Card background
doc.save();
doc.roundedRect(cardX, cardY, cardW, cardH, 10).fill(fillPaint);
doc.restore();

// Pill label
const pillText = 'Summary';
doc.save();
doc.font('Helvetica-Bold').fontSize(10);
const pillPadX = 10, pillH = 20;
const pillW = doc.widthOfString(pillText) + pillPadX * 2;
doc.roundedRect(cardX + 12, cardY + 10, pillW, pillH, 999).fill('#d4af37');
doc.fillColor('#111').text(pillText, cardX + 12 + pillPadX, cardY + 10 + (pillH - 10) / 2 - 1);
doc.restore();

// Helpers
const leftColX  = cardX + 24;
const rightColX = cardX + cardW / 2 + 12;
let rowY = cardY + 46;

const labelStyle = () => { doc.font('Helvetica').fontSize(10).fillColor('#444'); };
const valueStyle = () => { doc.font('Helvetica-Bold').fontSize(13).fillColor('#111'); };
const drawMetric = (x, y, label, value) => {
  labelStyle(); doc.text(label, x, y);
  valueStyle(); doc.text(String(value), x, y + 14);
};

// Left column
drawMetric(leftColX,  rowY,     'Total Reviews',     totalReviews);
drawMetric(leftColX,  rowY+36,  'Average Rating',    avgRating);
drawMetric(leftColX,  rowY+72,  'Response Rate',     `${responseRate}%`);

// Right column
drawMetric(rightColX, rowY,     'Total Complaints',  totalComplaints);
drawMetric(rightColX, rowY+36,  'Resolution Rate',   `${resolutionRate}%`);

// Center divider
doc.save();
doc.moveTo(cardX + cardW / 2, cardY + 40)
   .lineTo(cardX + cardW / 2, cardY + cardH - 14)
   .lineWidth(0.6)
   .strokeColor('#e5dfc8')
   .stroke();
doc.restore();

// Move the cursor below the card (prevents any overlap)
doc.y = cardY + cardH + 18;



    
    // ---- Table: headers ----
const cols = [
  { key: "createdAt",     label: "Date",           width: 60 },  // ↓
  { key: "type",          label: "Type",           width: 54 },  // ↓
  { key: "name",          label: "Customer",       width: 130 }, // ↓
  { key: "category",      label: "Category",       width: 90 },  // ↓
  { key: "rating_status", label: "Rating/Status",  width: 80 },  // ↓
  { key: "product",       label: "Product/Order",  width: 170 }, // ↑ give this more room
  // Fill the rest with the free space so long texts can still wrap here if needed
  { key: "text",          label: "Text",           width: boxW - (60+54+130+90+80+170) - 10 },
];


    // (no "Items" title — keep a little breathing room before the table)
doc.moveDown(0.2);


    const lineY = (y) => {
      doc
        .moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .strokeColor("#e8e8e8")
        .lineWidth(0.5)
        .stroke();
    };

    // Header row (bold)
    
    let y = doc.y;
    lineY(y - 2); // top rule before header
    doc.fontSize(9).fillColor("#111").font("Helvetica-Bold");

    let x = doc.page.margins.left;
    cols.forEach((c) => {
      doc.text(c.label, x + 2, y, { width: c.width });
      x += c.width + 10;
    });
    doc.font("Helvetica");

    // EXTRA breathing room below header + a stronger separator
    const HEADER_GAP = 10;            // <— adjust to taste
    y = doc.y + HEADER_GAP;

    doc.strokeColor("#dcdcdc").lineWidth(0.7);
    lineY(y);                         // header-bottom rule
    doc.strokeColor("#e8e8e8").lineWidth(0.5); // reset default for table rows

    y += 6; // start of first data row


    // ---- Table: rows (fixed overlapping issue) ----
    const safeCap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
    const fmtDate = (d) => {
      try { return new Date(d).toISOString().slice(0, 10); }
      catch { return ""; }
    };
    const truncate = (s, max = 200) =>
      (s && s.length > max ? s.slice(0, max - 1) + "…" : (s || ""));

    // Build rows (same as before, ok to keep your mapper)
    const rows = docs.map(d => {
      const name = truncate([d.firstName, d.lastName].filter(Boolean).join(" ") || d.email || "Anonymous", 50);
      const productRaw = d.orderId ? `Order #${d.orderId}` : (d.productName || d.productId || "");

// was: const product = truncate(productRaw, 60);
const product = truncate(productRaw, 110);   // allow more characters before truncating

      const cat = d.type === "complaint"
        ? (d.complaintCategory || (Array.isArray(d.categories) ? d.categories[0] : "") || "")
        : (Array.isArray(d.categories) ? d.categories.join("|") : "");
      const ratingOrStatus = d.type === "review"
        ? (d.rating != null ? `${d.rating} ★` : "")
        : (d.status || "Pending");
      return {
        createdAt: fmtDate(d.createdAt),
        type: safeCap(d.type),
        name,
        category: safeCap(cat),
        rating_status: ratingOrStatus,
        product,
        text: truncate(d.feedbackText || "", 220),
      };
    });

  // Draw header again (used after page breaks)
    const drawHeaderRow = () => {
      lineY(y); // top rule
      doc.fontSize(9).fillColor("#111").font("Helvetica-Bold");
     let xh = doc.page.margins.left;
      cols.forEach((c) => {
        doc.text(c.label, xh + 2, y, { width: c.width });
        xh += c.width + 10;
      });
      doc.font("Helvetica");

      const HEADER_GAP = 10;   // keep same gap as initial header
      y = doc.y + HEADER_GAP;

      doc.strokeColor("#dcdcdc").lineWidth(0.7);
      lineY(y);                // header-bottom rule
      doc.strokeColor("#e8e8e8").lineWidth(0.5);
      y += 6;
    };


// Minimum row height so short rows look tidy
const MIN_ROW_H = 14;

// Measure height of a string for a given width at current font/size
const cellHeight = (txt, width) =>
  doc.heightOfString(txt ? String(txt) : "", { width, align: "left" });

let rowIndex = 0; // for zebra striping

const addRow = (r) => {
  // Body font for measuring and drawing
  doc.fontSize(8.5).fillColor("#222");

  // Measure required height for each cell
  const h0 = cellHeight(r.createdAt,     cols[0].width);
  const h1 = cellHeight(r.type,          cols[1].width);
  const h2 = cellHeight(r.name,          cols[2].width);
  const h3 = cellHeight(r.category,      cols[3].width);
  const h4 = cellHeight(r.rating_status, cols[4].width);
  const h5 = cellHeight(r.product,       cols[5].width);
  const h6 = cellHeight(r.text,          cols[6].width);

  // Tallest cell defines the row height (+ tiny padding)
  const rowH = Math.max(MIN_ROW_H, h0, h1, h2, h3, h4, h5, h6) + 2;

  // If not enough space, add page and repeat header
  if (y + rowH > doc.page.height - doc.page.margins.bottom - 20) {
    doc.addPage();
    y = doc.page.margins.top;
    drawHeaderRow();
  }

  // Zebra background for odd rows (use computed row height)
  if (rowIndex % 2 === 1) {
    doc.save();
    doc.fillOpacity(0.035).fill("#d4af37");
    doc.rect(doc.page.margins.left, y - 2, boxW, rowH + 2).fill();
    doc.restore();
  }

  // Draw all cells at the same baseline y
  let x = doc.page.margins.left;
  const drawCell = (txt, width) => {
    doc.text(txt ?? "", x + 2, y, { width });
    x += width + 10;
  };

  drawCell(r.createdAt,     cols[0].width);
  drawCell(r.type,          cols[1].width);
  drawCell(r.name,          cols[2].width);
  drawCell(r.category,      cols[3].width);
  drawCell(r.rating_status, cols[4].width);
  drawCell(r.product,       cols[5].width);
  drawCell(r.text,          cols[6].width);

  // Advance by computed row height and draw separator
  y += rowH;
  lineY(y);

  rowIndex++;
};

// Render rows
rows.forEach(addRow);


    doc.end();
  } catch (e) {
    console.error("exportFeedbackReportPdf", e);
    return res.status(500).json({ message: "Failed to generate PDF report" });
  }
};

