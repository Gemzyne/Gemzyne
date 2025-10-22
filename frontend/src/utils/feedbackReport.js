// src/utils/feedbackReport.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** Helper: tiny safe access */
const val = (v) => (v == null ? "" : String(v));

/**
 * Export a Feedback report PDF.
 *
 * @param {Array<object>} items  Full list of feedback docs (what you already load)
 * @param {object} opts          Optional filters/labels shown in the header
 *   - type: "all"|"review"|"complaint"
 *   - category: string|"all"
 *   - status: "all"|"pending"|"resolved"   (for complaints)
 *   - includeHidden: boolean
 *   - period: {from?: Date, to?: Date}     (otherwise computed from items)
 */
export function exportFeedbackReport(items = [], opts = {}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const mm = 72 / 25.4; // points per mm

  const safeItems = Array.isArray(items) ? items : [];
  const reviews = safeItems.filter((i) => i.type === "review");
  const complaints = safeItems.filter((i) => i.type === "complaint");

  // --- summary metrics ---
  const totalReviews = reviews.length;
  const totalComplaints = complaints.length;
  const avgRating =
    totalReviews === 0
      ? 0
      : +(reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / totalReviews).toFixed(2);

  const responded = complaints.filter((c) => val(c?.adminReply?.text).trim()).length;
  const resolved = complaints.filter(
    (c) => val(c?.status).toLowerCase() === "resolved"
  ).length;
  const responseRate = totalComplaints ? Math.round((responded / totalComplaints) * 100) : 0;
  const resolutionRate = totalComplaints ? Math.round((resolved / totalComplaints) * 100) : 0;

  // Helper: cut long text to keep rows tidy in the PDF
const truncate = (s = "", max = 260) => {
  const t = String(s);
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
};


  // --- period ---
  const dates = safeItems
    .map((x) => new Date(x.createdAt))
    .filter((d) => !isNaN(d));
  const minD = opts?.period?.from || (dates.length ? new Date(Math.min(...dates)) : null);
  const maxD = opts?.period?.to || (dates.length ? new Date(Math.max(...dates)) : null);
  const fmt = (d) =>
    d ? d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" }) : "-";

  // --- header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GemZyne – Feedback Report", 40, 40);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const filterLine = [
    `Filters: type=${val(opts.type || "all")}`,
    `category=${val(opts.category || "all")}`,
    `status=${val(opts.status || "all")}`,
    `includeHidden=${opts.includeHidden ? "1" : "0"}`,
  ].join(", ");

  doc.text(`Period: ${fmt(minD)} to ${fmt(maxD)}`, 40, 58);
  doc.text(filterLine, 40, 72);

  // --- summary box ---
  autoTable(doc, {
    startY: 90,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 30, 30] },
    head: [["Summary", "", "", "", ""]],
    body: [
      ["Total Reviews", String(totalReviews), "", "Average Rating", String(avgRating)],
      ["Total Complaints", String(totalComplaints), "", "Response Rate", `${responseRate}%`],
      ["", "", "", "Resolution Rate", `${resolutionRate}%`],
    ],
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 80 },
      3: { cellWidth: 140 },
      4: { cellWidth: 80 },
    },
  });

  // --- data table ---
  const body = safeItems.map((f) => {
    const date = fmt(new Date(f.createdAt));
    const type = f.type === "review" ? "Review" : "Complaint";
    const customer =
      [f.firstName, f.lastName].filter(Boolean).join(" ") || f.email || "Anonymous";
    const category = f.type === "complaint"
      ? [f.complaintCategory, ...(Array.isArray(f.categories) ? f.categories : [])]
          .filter(Boolean)
          .join("|")
      : (Array.isArray(f.categories) ? f.categories.join("|") : "");
    const ratingOrStatus =
      f.type === "review" ? `${Number(f.rating) || 0}/5` : (f.status || "Pending");
    const product =
      f.orderId
        ? `Order #${f.orderId}`
        : (f.productName || f.productId || "");
    const text = truncate(f.feedbackText, 260);

    return [date, type, customer, category, ratingOrStatus, product, text];
  });

  autoTable(doc, {
  startY: doc.lastAutoTable.finalY + 12,
  theme: "grid",
  margin: { left: 36, right: 36 },
  styles: { fontSize: 8, cellPadding: 4, valign: "top", overflow: "linebreak" },
  headStyles: { fillColor: [30, 30, 30] },
  columnStyles: {
    0: { cellWidth: 70 },   // Date
    1: { cellWidth: 60 },   // Type
    2: { cellWidth: 120 },  // Customer
    3: { cellWidth: 120 },  // Category
    4: { cellWidth: 80 },   // Rating/Status
    5: { cellWidth: 120 },  // Product/Order
    6: { cellWidth: "wrap"} // Text (auto-wrap rest)
  },
  head: [["Date", "Type", "Customer", "Category", "Rating/Status", "Product/Order", "Text"]],
  body,
  pageBreak: "auto",
  rowPageBreak: "auto",
  didDrawPage: (data) => {
    const page = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.text(
      `Generated: ${new Date().toLocaleString()}  •  Page ${page}`,
      36,
      doc.internal.pageSize.getHeight() - 16
    );
  },
});


  doc.save(
    `feedback_report_${Date.now()}.pdf`
  );
}
