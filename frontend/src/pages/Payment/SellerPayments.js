// src/pages/Seller/SellerPayments.js
import React, { useEffect, useMemo, useState } from "react";
import "./SellerPayments.css";
import Header from "../../Components/Header";
import SellerSidebar from "../../Components/SellerSidebar";

// ---------- API base + tiny wrapper ----------
const API_BASE =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:5000";

async function apiRequest(
  path,
  { method = "GET", headers = {}, body, isForm } = {}
) {
  const token = localStorage.getItem("accessToken");
  const h = new Headers(headers);
  if (!isForm && body && !h.has("Content-Type"))
    h.set("Content-Type", "application/json");
  if (token && !h.has("Authorization"))
    h.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: h,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const err = new Error((data && data.message) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ---------- helpers ----------
function money(n, ccy = "USD") {
  const amt = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: amt % 1 === 0 ? 0 : 2,
    }).format(amt);
  } catch {
    return `${ccy} ${amt.toFixed(2)}`;
  }
}
function shortId(id = "") {
  return id ? `${id.slice(0, 4)}…${id.slice(-4)}` : "—";
}
function slipUrlFromPath(p) {
  if (!p) return null;
  const filename = String(p).split(/[/\\]/).pop();
  if (!filename) return null;
  return `${API_BASE}/uploads/${filename}`;
}
function isImageUrl(u) {
  return /\.(png|jpe?g|gif|webp)$/i.test(u || "");
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ---------- robust PDF loader with fallbacks ----------
function loadScript(url, id) {
  return new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) return resolve();
    const s = document.createElement("script");
    if (id) s.id = id;
    s.src = url;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.referrerPolicy = "no-referrer";
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.body.appendChild(s);
  });
}
async function tryMany(urls, id) {
  let lastErr;
  for (const url of urls) {
    try {
      await loadScript(url, id);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Failed to load any of: ${urls.join(", ")}`);
}
async function ensureJsPdf() {
  if (window.jspdf?.jsPDF && window.jspdf?.jsPDF?.API?.autoTable) {
    return window.jspdf.jsPDF;
  }
  await tryMany(
    [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js",
    ],
    "jspdf-cdn"
  );
  await tryMany(
    [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js",
      "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.min.js",
      "https://unpkg.com/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.min.js",
    ],
    "autotable-cdn"
  );
  if (!window.jspdf?.jsPDF)
    throw new Error("jsPDF not available after loading");
  if (!window.jspdf?.jsPDF?.API?.autoTable)
    throw new Error("autoTable plugin not available after loading");
  return window.jspdf.jsPDF;
}

// ---------- Report builders ----------
function filterByMonth(items, month, year) {
  // month: 1..12
  return items.filter((p) => {
    const d = p.createdAt ? new Date(p.createdAt) : null;
    if (!d || isNaN(d.getTime())) return false;
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
}
function buildReportRows(items) {
  return items.map((p) => {
    const d = p.createdAt ? new Date(p.createdAt) : null;
    const dateTime = d ? d.toLocaleString() : "—";
    const orderNo = p?.orderNo || p?.orderId?._id || "—";
    const product = p?.orderId?.title || "Product";
    const buyer = p?.buyerId?.fullName || "—";
    const method =
      p?.payment?.method === "card"
        ? "Card"
        : p?.payment?.method === "bank"
        ? "Bank Transfer"
        : p?.payment?.method || "—";
    const status = p?.payment?.status || "—";
    const ccy = p?.currency || "USD";
    const total = Number(p?.amounts?.total || 0);

    return {
      dateTime,
      orderNo,
      product,
      buyer,
      method,
      status,
      currency: ccy,
      total,
      totalFmt: money(total, ccy),
    };
  });
}
function buildMonthlySummary(rows) {
  const totals = {
    count: rows.length,
    paid: 0,
    pending: 0,
    cancelled: 0,
    sumPaid: 0,
    sumPending: 0,
    sumCancelled: 0,
    ccy: rows[0]?.currency || "USD",
  };
  rows.forEach((r) => {
    if (r.status === "paid") {
      totals.paid += 1;
      totals.sumPaid += r.total;
    } else if (r.status === "pending") {
      totals.pending += 1;
      totals.sumPending += r.total;
    } else if (r.status === "cancelled") {
      totals.cancelled += 1;
      totals.sumCancelled += r.total;
    }
  });
  totals.grand = totals.sumPaid + totals.sumPending + totals.sumCancelled;
  return totals;
}
async function generateMonthlyPdf({ items, month, year }) {
  const jsPDF = await ensureJsPdf();
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // Filter + shape rows
  const monthItems = filterByMonth(items, month, year);
  if (monthItems.length === 0) {
    window.alert("No transactions found for the selected month.");
    return;
  }
  const rows = buildReportRows(monthItems);
  const summary = buildMonthlySummary(rows);

  // Header
  const pad = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GemZyne — Seller Payments (Monthly Report)", pad, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Period: ${MONTHS[month - 1]} ${year}`, pad, 70);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pad, 88);

  // Summary band
  const y0 = 110;
  const bandH = 60;
  doc.setDrawColor(212, 175, 55);
  doc.roundedRect(pad - 6, y0 - 26, 520, bandH, 6, 6, "S");

  doc.setFont("helvetica", "bold");
  doc.text("Summary", pad, y0);
  doc.setFont("helvetica", "normal");
  const s = summary;
  const line1 = `Orders: ${s.count}   |   Paid: ${s.paid}   Pending: ${s.pending}   Cancelled: ${s.cancelled}`;
  const line2 = `Totals — Paid: ${money(
    s.sumPaid,
    s.ccy
  )}   |   Pending: ${money(s.sumPending, s.ccy)}   |   Cancelled: ${money(
    s.sumCancelled,
    s.ccy
  )}   |   Grand: ${money(s.grand, s.ccy)}`;
  doc.text(line1, pad, y0 + 18);
  doc.text(line2, pad, y0 + 36);

  // Table
  const head = [
    ["Date/Time", "Order No", "Product", "Buyer", "Method", "Status", "Amount"],
  ];
  const body = rows.map((r) => [
    r.dateTime,
    r.orderNo,
    r.product,
    r.buyer,
    r.method,
    r.status.toUpperCase(),
    r.totalFmt,
  ]);

  doc.autoTable({
    head,
    body,
    startY: y0 + bandH + 20,
    styles: { fontSize: 10, cellPadding: 6, halign: "left" },
    headStyles: { fillColor: [24, 24, 24], textColor: 245, lineWidth: 0.5 },
    bodyStyles: { lineWidth: 0.3 },
    theme: "grid",
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 85 },
      2: { cellWidth: 120 },
      3: { cellWidth: 110 },
      4: { cellWidth: 70 },
      5: { cellWidth: 70 },
      6: { cellWidth: 80, halign: "right" },
    },
    didDrawPage: (data) => {
      const str = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(10);
      doc.text(
        str,
        data.settings.margin.left,
        doc.internal.pageSize.height - 20
      );
    },
  });

  const mm = String(month).padStart(2, "0");
  doc.save(`SellerPayments_${year}-${mm}.pdf`);
}

// ---------- Component ----------
export default function SellerPayments() {
  // filters
  const [orderNo, setOrderNo] = useState("");

  // month/year for PDF
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1..12
  const [year, setYear] = useState(now.getFullYear());
  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, i) => now.getFullYear() - i),
    [now]
  );

  // data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ui state
  const [busyId, setBusyId] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // load particles once
  useEffect(() => {
    const id = "particles-cdn";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.async = true;
      s.onload = () => {
        if (window.particlesJS) {
          window.particlesJS("particles-js", {
            particles: {
              number: { value: 60, density: { enable: true, value_area: 800 } },
              color: { value: "#d4af37" },
              shape: { type: "circle" },
              opacity: { value: 0.3, random: true },
              size: { value: 3, random: true },
              line_linked: {
                enable: true,
                distance: 150,
                color: "#d4af37",
                opacity: 0.1,
                width: 1,
              },
              move: { enable: true, speed: 1 },
            },
            interactivity: {
              detect_on: "canvas",
              events: {
                onhover: { enable: true, mode: "repulse" },
                onclick: { enable: true, mode: "push" },
                resize: true,
              },
            },
            retina_detect: true,
          });
        }
      };
      document.body.appendChild(s);
    }
  }, []);

  // fetch payments (seller endpoint)
  const fetchPayments = async (orderNoFilter = "") => {
    try {
      setLoading(true);
      setErr("");
      const qs = new URLSearchParams();
      if (orderNoFilter) qs.set("orderNo", orderNoFilter.trim());
      const data = await apiRequest(
        `/api/payments${qs.toString() ? `?${qs}` : ""}`
      );
      setItems(data.items || []);
    } catch (e) {
      setErr(e?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived stats
  const stats = useMemo(() => {
    const paid = items.filter((p) => p?.payment?.status === "paid");
    const pending = items.filter((p) => p?.payment?.status === "pending");
    const cancelled = items.filter((p) => p?.payment?.status === "cancelled");
    const totalRevenue = paid.reduce(
      (s, p) => s + Number(p?.amounts?.total || 0),
      0
    );
    const ccy = items[0]?.currency || "USD";
    return {
      totalRevenue: money(totalRevenue, ccy),
      completedPayments: paid.length,
      pendingPayments: pending.length,
      cancelledPayments: cancelled.length,
    };
  }, [items]);

  // sticky header effect
  useEffect(() => {
    const onScroll = () => {
      const header = document.getElementById("header");
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // filter by order no (debounced)
  useEffect(() => {
    const t = setTimeout(() => fetchPayments(orderNo), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  // status changes
  async function markPaid(id) {
    try {
      setBusyId(id);
      await apiRequest(`/api/payments/${id}/mark-paid`, { method: "PATCH" });
      await fetchPayments(orderNo);
    } catch (e) {
      setErr(e?.message || "Failed to mark as paid");
    } finally {
      setBusyId(null);
    }
  }
  async function updateStatus(id, status) {
    try {
      setBusyId(id);
      await apiRequest(`/api/payments/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      await fetchPayments(orderNo);
    } catch (e) {
      setErr(
        e?.status === 404
          ? "Backend route /api/payments/:id/status missing. Add it per previous snippet."
          : e?.message || "Failed to update status"
      );
    } finally {
      setBusyId(null);
    }
  }
  async function onChangeStatus(p, next) {
    const cur = p?.payment?.status;
    if (next === cur) return;
    if (p?.payment?.method === "bank" && next === "paid") {
      await markPaid(p._id);
      return;
    }
    await updateStatus(p._id, next);
  }

  // PDF trigger
  async function onDownloadMonthlyPdf() {
    try {
      setDownloading(true);
      await generateMonthlyPdf({ items, month, year });
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to prepare PDF libraries. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <Header />
      <div id="particles-js" />

      <div className="dashboard-container seller-payments">
        + <SellerSidebar />
        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Seller Payments</h2>
            <div className="dashboard-controls">
              <input
                type="text"
                className="filter-input"
                placeholder="Filter by Order No"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="stats-summary">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-money-bill-wave" />
              </div>
              <div className="stat-info">
                <h3 id="totalRevenue">{stats.totalRevenue}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-check-circle" />
              </div>
              <div className="stat-info">
                <h3 id="completedPayments">{stats.completedPayments}</h3>
                <p>Completed Payments</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-clock" />
              </div>
              <div className="stat-info">
                <h3 id="pendingPayments">{stats.pendingPayments}</h3>
                <p>Pending Approval</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-times-circle" />
              </div>
              <div className="stat-info">
                <h3 id="cancelledPayments">{stats.cancelledPayments}</h3>
                <p>Cancelled Payments</p>
              </div>
            </div>
          </div>

          {/* Table + Report actions */}
          <div className="payment-history-section">
            <div className="section-header" style={{ gap: 12 }}>
              <h3 className="section-title">All payment transactions</h3>

              {/* Report action bar */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="status-select"
                  title="Month"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="status-select"
                  title="Year"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <button
                  onClick={onDownloadMonthlyPdf}
                  disabled={downloading || loading || items.length === 0}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(212,175,55,.35)",
                    background:
                      "linear-gradient(135deg, rgba(212,175,55,.22), rgba(249,242,149,.18))",
                    color: "#f5f5f5",
                    cursor:
                      downloading || loading || items.length === 0
                        ? "not-allowed"
                        : "pointer",
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                  title="Download Monthly PDF"
                >
                  <i className="fas fa-file-pdf" />
                  {downloading ? "Preparing…" : "Download Monthly PDF"}
                </button>
              </div>
            </div>

            {err && (
              <div
                style={{
                  padding: 12,
                  marginBottom: 8,
                  background: "#b00020",
                  borderRadius: 8,
                }}
              >
                {err}
              </div>
            )}

            {loading ? (
              <div className="sp-loader">Loading…</div>
            ) : (
              <div className="sp-table-wrap">
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Order No</th>
                      <th>Product</th>
                      <th>Buyer</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Slip</th>
                    </tr>
                  </thead>
                  <tbody id="paymentTableBody">
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: "center",
                            padding: 30,
                            color: "#b0b0b0",
                          }}
                        >
                          <i
                            className="fas fa-receipt"
                            style={{
                              fontSize: 24,
                              marginBottom: 10,
                              display: "block",
                              opacity: 0.5,
                            }}
                          />
                          No payments found with selected filters.
                        </td>
                      </tr>
                    ) : (
                      items.map((p, idx) => {
                        const created = p.createdAt
                          ? new Date(p.createdAt).toLocaleString()
                          : "—";
                        const orderNoCell = p?.orderNo || p?.orderId?._id || "";
                        const title = p?.orderId?.title || "Product";
                        const buyerName = p?.buyerId?.fullName || "—";
                        const buyerEmail = p?.buyerId?.email || "—";
                        const buyerIdStr = p?.buyerId?._id || p?.buyerId || "";
                        const method = p?.payment?.method || "—";
                        const status = p?.payment?.status || "—";
                        const ccy = p?.currency || "USD";
                        const totalAmt = p?.amounts?.total ?? 0;
                        const slipUrl = slipUrlFromPath(
                          p?.payment?.bankSlipPath
                        );
                        const slipIsImage = isImageUrl(slipUrl);

                        const badgeClass =
                          status === "paid"
                            ? "status-paid"
                            : status === "pending"
                            ? "status-pending"
                            : "status-cancelled";

                        return (
                          <tr key={p._id || idx}>
                            <td>{created}</td>
                            <td>
                              <span className="order-id">{orderNoCell}</span>
                            </td>
                            <td>{title}</td>
                            <td>
                              <div className="buyer-info">
                                <div className="buyer-name">{buyerName}</div>
                                <div className="buyer-email">
                                  {buyerEmail} · {shortId(buyerIdStr)}
                                </div>
                              </div>
                            </td>
                            <td>
                              {method === "card"
                                ? "Card"
                                : method === "bank"
                                ? "Bank Transfer"
                                : method}
                            </td>
                            <td>
                              {method === "bank" ? (
                                <select
                                  className="status-select"
                                  value={status}
                                  onChange={(e) =>
                                    onChangeStatus(p, e.target.value)
                                  }
                                  disabled={busyId === p._id}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="paid">Paid</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              ) : (
                                <span className={`status ${badgeClass}`}>
                                  <i
                                    className={`fas ${
                                      status === "paid"
                                        ? "fa-check-circle"
                                        : status === "pending"
                                        ? "fa-clock"
                                        : "fa-times-circle"
                                    }`}
                                  />
                                  {status.charAt(0).toUpperCase() +
                                    status.slice(1)}
                                </span>
                              )}
                            </td>
                            <td className="total-amount">
                              {money(totalAmt, ccy)}
                            </td>
                            <td>
                              {slipUrl ? (
                                <>
                                  {slipIsImage ? (
                                    <a
                                      href={slipUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <img
                                        src={slipUrl}
                                        alt="Bank slip"
                                        className="slip-thumb"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      className="order-id"
                                      href={slipUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      View
                                    </a>
                                  )}
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
