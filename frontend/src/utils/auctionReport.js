// src/utils/auctionReport.js
// -------------------------------------------------------------
// Modern Seller Auction Winner Summary → PDF (Monthly or Weekly)
// Extended table width and better column distribution
// "#" changed to "No."
// -------------------------------------------------------------

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** Public API */
export async function exportSellerAuctionReport({
  overview,
  siteName = "GemZyne",
  mode = "monthly",
  year,
  month,
  weekStartDate,
  currency = "USD",
  winMap = {},
}) {
  try {
    if (!overview || !Array.isArray(overview.history)) {
      return fail("overview.history is missing. Make sure the page has loaded data.");
    }

    const { start, end, periodLabel, err } = resolvePeriodSafe({ mode, year, month, weekStartDate });
    if (err) return fail(err);

    // Filter rows by period
    const winners = overview.history.filter((h) => inRange(h?.endTime ?? h?.endedAt, start, end));
    const totals = computePaidTotals(winners, winMap);

    // Your brand color scheme
    const colors = {
      primary: [212, 175, 55],    // #d4af37 - Gold
      secondary: [64, 64, 64],    // Dark gray
      accent: [76, 175, 80],      // Green for paid
      warning: [255, 152, 0],     // Orange for warnings
      lightBg: [224, 224, 224],   // #e0e0e0 - Light gray
      border: [176, 176, 176],    // #b0b0b0 - Medium gray
      textLight: [255, 255, 255],
      textDark: [33, 33, 33],
    };

    // PDF doc with modern settings
    const doc = new jsPDF({ 
      unit: "pt", 
      format: "a4",
      compress: true
    });
    
    const marginX = 30; // Reduced margin for more table space
    const pageWidth = doc.internal.pageSize.width;
    let y = 50;

    // Modern header with primary color background
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 120, 'F');
    
    // Site name and title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...colors.textDark);
    doc.text(siteName, marginX, y);
    
    doc.setFontSize(16);
    doc.text(`Auction Winner Summary`, marginX, y + 32);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2], 0.8);
    doc.text(`${cap(mode)} Report • ${periodLabel}`, marginX, y + 50);
    
    y = 140;

    // Stats cards design
    const stats = [
      { label: "Total Auctions", value: winners.length, color: colors.primary },
      { label: "Sold (Paid)", value: totals.paidCount, color: colors.accent },
      { label: "Total Income", value: fmtMoney(totals.totalIncome, currency), color: colors.secondary },
    ];

    const cardWidth = (pageWidth - (marginX * 2) - 30) / 3;
    
    stats.forEach((stat, index) => {
      const x = marginX + (index * (cardWidth + 15));
      
      // Card background
      doc.setFillColor(...stat.color);
      doc.rect(x, y, cardWidth, 70, 'F');
      
      // Text
      doc.setTextColor(...colors.textLight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(stat.label, x + 15, y + 25);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(String(stat.value), x + 15, y + 50);
    });

    y += 100;

    // Section header with light background
    doc.setFillColor(...colors.lightBg);
    doc.rect(marginX, y, pageWidth - (marginX * 2), 30, 'F');
    
    doc.setTextColor(...colors.textDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Winner Details", marginX + 15, y + 20);
    
    y += 40;

    // Modern table with extended width and better column distribution
    const head = ["No.", "Auction Code", "Gem", "Type", "Price", "Winner", "Status", "Ended"];
    const body = winners.map((h, i) => {
      const code = h.auctionId || h.code || "-";
      const title = h.title || "-";
      const type = titleCase(h.type || "-");
      const final = num(h.finalPrice ?? h.currentPrice ?? h.basePrice ?? 0);
      const ended = fmtDateTime(h.endTime || h.endedAt);
      const winner = h.winnerName || "-";
      const { label: statusLabel, code: statusCode } = statusFromRow(h, winMap);
      
      // Color code status using your brand colors
      const statusColor = getStatusColor(statusCode, colors);
      
      return [
        i + 1,
        code,
        truncateText(title, 25), // Increased from 20
        type,
        fmtMoney(final, currency),
        truncateText(winner, 20), // Increased from 15
        { content: statusLabel, styles: { textColor: statusColor, fontStyle: 'bold' } },
        ended
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      styles: {
        fontSize: 9,
        font: "helvetica",
        textColor: colors.textDark,
        cellPadding: 8,
        lineColor: colors.border,
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: colors.secondary,
        textColor: colors.textLight,
        fontStyle: 'bold',
        fontSize: 9,
        lineColor: colors.border,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      // Extended column widths to use full page space
      columnStyles: {
        0: { 
          cellWidth: 35, 
          halign: 'center',
          fontStyle: 'bold'
        },  // No.
        1: { 
          cellWidth: 85, 
          fontStyle: 'bold' 
        },  // Auction Code
        2: { 
          cellWidth: 90  // Gem - increased width
        },  
        3: { 
          cellWidth: 55, 
          halign: 'center' 
        },  // Type
        4: { 
          cellWidth: 65, 
          halign: 'right',
          fontStyle: 'bold'
        },  // Price
        5: { 
          cellWidth: 75  // Winner - increased width
        },  
        6: { 
          cellWidth: 50, 
          halign: 'center' 
        },  // Status
        7: { 
          cellWidth: 85, 
          fontSize: 8 
        },  // Ended
      },
      margin: { 
        left: marginX, 
        right: marginX 
      },
      tableWidth: 'auto',
      tableLineWidth: 0.5,
      theme: 'grid',
      didDrawPage: function (data) {
        // Optional: Add page numbers if table spans multiple pages
        if (data.pageCount > 1) {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Page ${data.pageNumber} of ${data.pageCount}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 20
          );
        }
      }
    });

    y = doc.lastAutoTable.finalY + 25;

    // Footer note
    doc.setFontSize(8);
    doc.setTextColor(...colors.border);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on ${new Date().toLocaleString()} • Income calculated from paid auctions only`, marginX, y);

    // Page footer
    doc.setFontSize(7);
    doc.setTextColor(...colors.border);
    doc.text(`${siteName} • Confidential Report`, marginX, doc.internal.pageSize.height - 20);

    const fname = `Auction_Summary_${mode}_${isoDate(start)}_${isoDate(end)}.pdf`;
    doc.save(fname);
    return { ok: true };
  } catch (e) {
    console.error("PDF Generation Error:", e);
    return fail(e?.message || "Unknown error while generating PDF.");
  }
}

/* ================= MODERN HELPER FUNCTIONS ================= */

function getStatusColor(statusCode, colors) {
  const statusColors = {
    paid: colors.accent,          // Green for paid
    cancelled: [244, 67, 54],     // Red for cancelled
    expired: [255, 152, 0],       // Orange for expired
    pending: colors.primary,      // Gold for pending
  };
  return statusColors[statusCode] || colors.textDark;
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Enhanced date formatting
function fmtDateTime(dt) {
  const d = toDate(dt);
  if (!d) return "-";
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  }) + ' ' + d.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// Modern money formatting
function fmtMoney(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num(amount));
  } catch {
    return `${currency} ${num(amount).toFixed(0)}`;
  }
}

// Enhanced period resolution
function resolvePeriodSafe({ mode, year, month, weekStartDate }) {
  try {
    if (mode === "weekly") {
      const start = toDate(weekStartDate) || mondayOf(new Date());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { 
        start, 
        end, 
        periodLabel: `${fmtDateOnly(start)} – ${fmtDateOnly(end)}` 
      };
    }
    
    // monthly (default)
    if (!year || !month || !Number(year) || !Number(month)) {
      const today = new Date();
      year = today.getFullYear();
      month = today.getMonth() + 1;
    }
    const start = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    const periodLabel = start.toLocaleString('en-US', { 
      month: "long", 
      year: "numeric" 
    });
    return { start, end, periodLabel };
  } catch {
    return { err: "Invalid period settings. Check month/year or week start date." };
  }
}

// Keep the rest of the helper functions the same
function mondayOf(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function inRange(dt, start, end) {
  if (!dt) return false;
  const d = toDate(dt);
  if (!d) return false;
  return d >= start && d <= end;
}

function toDate(x) {
  if (!x) return null;
  if (x instanceof Date) return x;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}

function num(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function fmtDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

function isoDate(d) {
  return fmtDateOnly(d).replaceAll("-", "");
}

function cap(s = "") {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function titleCase(s = "") {
  return String(s).replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusFromRow(row, winMap) {
  const map = (row && winMap && winMap[row._id]) || {};
  const raw =
    (map.purchaseStatus ??
      row.purchaseStatus ??
      row.winnerStatus ??
      row.status ??
      "")
      .toString()
      .toLowerCase();

  const paymentId = map.paymentId || row.paymentId || null;
  const deadline = map.purchaseDeadline || row.purchaseDeadline || null;

  if (raw.includes("paid") || paymentId) return { label: "Paid", code: "paid" };
  if (raw.includes("cancel")) return { label: "Cancelled", code: "cancelled" };
  if (deadline && !isNaN(Date.parse(deadline)) && Date.parse(deadline) <= Date.now()) {
    return { label: "Expired", code: "expired" };
  }
  if (raw.includes("pending")) return { label: "Pending", code: "pending" };
  return { label: cap(raw || "Pending"), code: raw || "pending" };
}

function computePaidTotals(rows, winMap) {
  const paidRows = rows.filter((h) => statusFromRow(h, winMap).code === "paid");
  const totalIncome = paidRows.reduce(
    (sum, h) => sum + num(h.finalPrice ?? h.currentPrice ?? h.basePrice ?? 0),
    0
  );
  return { paidCount: paidRows.length, totalIncome };
}

function fail(message) {
  console.error("[Modern AuctionReport] " + message);
  return { ok: false, error: message };
}