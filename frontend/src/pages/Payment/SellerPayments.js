import React, { useEffect, useMemo, useState } from "react";
import "./SellerPayments.css";
import Header from "../../Components/Header";
import SellerSidebar from "../../Components/SellerSidebar";

// ---- API base + tiny wrapper (reads token, adds Authorization, handles JSON) ----
const API_BASE =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:5000";

async function apiRequest(path, { method = "GET", headers = {}, body, isForm } = {}) {
  const token = localStorage.getItem("accessToken");
  const h = new Headers(headers);
  if (!isForm && body && !h.has("Content-Type")) h.set("Content-Type", "application/json");
  if (token && !h.has("Authorization")) h.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: h,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore non-JSON */ }
  if (!res.ok) {
    const err = new Error((data && data.message) || `HTTP ${res.status}`);
    err.status = res.status; err.data = data;
    throw err;
  }
  return data;
}

// ---- helpers ----
function money(n, ccy = "USD") {
  const amt = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: amt % 1 === 0 ? 0 : 2,
    }).format(amt);
  } catch { return `${ccy} ${amt.toFixed(2)}`; }
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

export default function SellerPayments() {
  // filter
  const [orderNo, setOrderNo] = useState("");

  // data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ui state
  const [busyId, setBusyId] = useState(null);

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
                enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1,
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
      const data = await apiRequest(`/api/payments${qs.toString() ? `?${qs}` : ""}`);
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
    const paid = items.filter(p => p?.payment?.status === "paid");
    const pending = items.filter(p => p?.payment?.status === "pending");
    const cancelled = items.filter(p => p?.payment?.status === "cancelled");
    const totalRevenue = paid.reduce((s, p) => s + Number(p?.amounts?.total || 0), 0);
    // currency (best-effort from first record)
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
          : (e?.message || "Failed to update status")
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onChangeStatus(p, next) {
    const cur = p?.payment?.status;
    if (next === cur) return;
    // Bank → Paid uses dedicated endpoint
    if (p?.payment?.method === "bank" && next === "paid") {
      await markPaid(p._id);
      return;
    }
    await updateStatus(p._id, next);
  }

  return (
    <>
    <Header />
      <div id="particles-js" />

      <div className="dashboard-container seller-payments">
+      <SellerSidebar />
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
            <div className="stat-icon"><i className="fas fa-money-bill-wave" /></div>
            <div className="stat-info">
              <h3 id="totalRevenue">{stats.totalRevenue}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-check-circle" /></div>
            <div className="stat-info">
              <h3 id="completedPayments">{stats.completedPayments}</h3>
              <p>Completed Payments</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-clock" /></div>
            <div className="stat-info">
              <h3 id="pendingPayments">{stats.pendingPayments}</h3>
              <p>Pending Approval</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-times-circle" /></div>
            <div className="stat-info">
              <h3 id="cancelledPayments">{stats.cancelledPayments}</h3>
              <p>Cancelled Payments</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="payment-history-section">
          <div className="section-header">
            <h3 className="section-title">All payment transactions</h3>
          </div>

          {err && (
            <div style={{ padding: 12, marginBottom: 8, background: "#b00020", borderRadius: 8 }}>
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
                      <td colSpan={8} style={{ textAlign: "center", padding: 30, color: "#b0b0b0" }}>
                        <i className="fas fa-receipt" style={{ fontSize: 24, marginBottom: 10, display: "block", opacity: 0.5 }} />
                        No payments found with selected filters.
                      </td>
                    </tr>
                  ) : (
                    items.map((p, idx) => {
                      const created = p.createdAt ? new Date(p.createdAt).toLocaleString() : "—";
                      const orderNoCell = p?.orderNo || (p?.orderId?._id || "");
                      const title = p?.orderId?.title || "Product";
                      const buyerName = p?.buyerId?.fullName || "—";
                      const buyerEmail = p?.buyerId?.email || "—";
                      const buyerIdStr = p?.buyerId?._id || p?.buyerId || "";
                      const method = p?.payment?.method || "—";
                      const status = p?.payment?.status || "—";
                      const ccy = p?.currency || "USD";
                      const totalAmt = p?.amounts?.total ?? 0;
                      const slipUrl = slipUrlFromPath(p?.payment?.bankSlipPath);
                      const slipIsImage = isImageUrl(slipUrl);

                      // badge class
                      const badgeClass =
                        status === "paid" ? "status-paid" :
                        status === "pending" ? "status-pending" : "status-cancelled";

                      return (
                        <tr key={p._id || idx}>
                          <td>{created}</td>
                          <td><span className="order-id">{orderNoCell}</span></td>
                          <td>{title}</td>
                          <td>
                            <div className="buyer-info">
                              <div className="buyer-name">{buyerName}</div>
                              <div className="buyer-email">{buyerEmail} · {shortId(buyerIdStr)}</div>
                            </div>
                          </td>
                          <td>{method === "card" ? "Card" : method === "bank" ? "Bank Transfer" : method}</td>
                          <td>
                            {method === "bank" ? (
                              <select
                                className="status-select"
                                value={status}
                                onChange={(e) => onChangeStatus(p, e.target.value)}
                                disabled={busyId === p._id}
                              >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            ) : (
                              <span className={`status ${badgeClass}`}>
                                <i className={`fas ${status === "paid" ? "fa-check-circle" : status === "pending" ? "fa-clock" : "fa-times-circle"}`} />
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            )}
                          </td>
                          <td className="total-amount">{money(totalAmt, ccy)}</td>
                          <td>
                            {slipUrl ? (
                              <>
                                {slipIsImage && (
                                  <a href={slipUrl} target="_blank" rel="noreferrer">
                                    <img src={slipUrl} alt="Bank slip" className="slip-thumb" />
                                  </a>
                                )}
                                {!slipIsImage && (
                                  <a className="order-id" href={slipUrl} target="_blank" rel="noreferrer">View</a>
                                )}
                              </>
                            ) : "—"}
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
