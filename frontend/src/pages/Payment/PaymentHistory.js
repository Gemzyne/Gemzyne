import React, { useEffect, useMemo, useState } from "react";
import "./PaymentHistory.css";

import Header from "../../Components/Header";
import UserSidebar from "../../Components/UserSidebar";

// --- API base + tiny wrapper (adds Authorization, handles JSON) ---
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
    /* ignore non-JSON */
  }

  if (!res.ok) {
    const err = new Error((data && data.message) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// --- helpers ---
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
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  // "15 Oct 2023"
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PaymentHistory() {
  const [filter, setFilter] = useState("all");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Stats (pulled server-side so they’re correct regardless of current filter)
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  // particles bg once
  useEffect(() => {
    const scriptId = "particlesjs-cdn";
    const initParticles = () => {
      if (!window.particlesJS) return;
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
    };

    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.async = true;
      s.onload = initParticles;
      document.body.appendChild(s);
    } else {
      initParticles();
    }
  }, []);

  // fetch stats (3 tiny calls that only read totals)
  async function fetchStats() {
    try {
      const [all, paid, pending] = await Promise.all([
        apiRequest(`/api/payments/my?limit=1`),
        apiRequest(`/api/payments/my?status=paid&limit=1`),
        apiRequest(`/api/payments/my?status=pending&limit=1`),
      ]);
      setStats({
        total: all.total || 0,
        completed: paid.total || 0,
        pending: pending.total || 0,
      });
    } catch (e) {
      // non-blocking for the page
      console.warn("stats error", e);
    }
  }

  // fetch list (respects filter)
  async function fetchItems(status = "all") {
    try {
      setLoading(true);
      setErr("");
      const qs = new URLSearchParams();
      if (status && status !== "all") qs.set("status", status);
      // you can pass pagination later: qs.set("page", "1"); qs.set("limit","20");
      const data = await apiRequest(
        `/api/payments/my${qs.toString() ? `?${qs}` : ""}`
      );
      setItems(data.items || []);
    } catch (e) {
      setErr(e?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    fetchStats();
    fetchItems(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-fetch when filter changes
  useEffect(() => {
    fetchItems(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // currency fallback from the first record
  const currency = items[0]?.currency || "USD";

  return (
    <>
      <Header />
      <div id="particles-js" />

      <div className="dashboard-container">
        <UserSidebar />
        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Payment History</h2>
            <div className="dashboard-controls">
              <select
                className="filter-select"
                id="statusFilter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="stats-summary">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-receipt" />
              </div>
              <div className="stat-info">
                <h3 id="totalPayments">{stats.total}</h3>
                <p>Total Payments</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-check-circle" />
              </div>
              <div className="stat-info">
                <h3 id="completedPayments">{stats.completed}</h3>
                <p>Completed</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-clock" />
              </div>
              <div className="stat-info">
                <h3 id="pendingPayments">{stats.pending}</h3>
                <p>Pending</p>
              </div>
            </div>
          </div>

          <div className="payment-history-section">
            <div className="section-header">
              <h3 className="section-title">
                All your purchases with status and totals.
              </h3>
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
              <div className="ph-loader">Loading…</div>
            ) : (
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order No</th>
                    <th>Product</th>
                    <th>Payment Type</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
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
                        No payments found with selected status.
                      </td>
                    </tr>
                  ) : (
                    items.map((p) => {
                      const status = p?.payment?.status || "—";
                      const method = p?.payment?.method || "—";
                      const title = p?.orderId?.title || "Product";
                      const orderNo =
                        p?.orderNo ||
                        p?.orderId?.orderNo ||
                        p?.orderId?._id ||
                        "—";
                      const total = money(
                        p?.amounts?.total ?? 0,
                        p?.currency || currency
                      );

                      const statusClass =
                        status === "paid"
                          ? "status-paid"
                          : status === "pending"
                          ? "status-pending"
                          : "status-cancelled";
                      const statusIcon =
                        status === "paid"
                          ? "fa-check-circle"
                          : status === "pending"
                          ? "fa-clock"
                          : "fa-times-circle";
                      const statusText =
                        status === "paid"
                          ? "Paid"
                          : status === "pending"
                          ? "Pending"
                          : "Cancelled";

                      return (
                        <tr key={p._id}>
                          <td>{fmtDate(p?.createdAt)}</td>
                          <td>
                            <span className="order-id">
                              <i className="fas fa-hashtag" />
                              {orderNo}
                            </span>
                          </td>
                          <td>{title}</td>
                          <td>
                            {method === "card"
                              ? "Card"
                              : method === "bank"
                              ? "Bank Transfer"
                              : method}
                          </td>
                          <td>
                            <span className={`status ${statusClass}`}>
                              <i className={`fas ${statusIcon}`} />
                              {statusText}
                            </span>
                          </td>
                          <td className="total-amount">{total}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Font Awesome (skip if already globally included) */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
    </>
  );
}
