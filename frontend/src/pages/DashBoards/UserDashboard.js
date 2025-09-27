// src/pages/DashBoards/UserDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import "./UserDashboard.css";
import UserSidebar from "../../Components/UserSidebar";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// money formatting helper
const money = (n, ccy = "USD") => {
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
};

const UserDashboard = () => {
  const navigate = useNavigate();

  /* ============== Particles + sticky header (unchanged) ============== */
  useEffect(() => {
    const initParticles = () => {
      window.particlesJS &&
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

    if (!window.particlesJS) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.onload = initParticles;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    }
    initParticles();
  }, []);

  // simple route guard
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  /* ================= Dashboard (bids + reviews + orders) ================= */
  const [summary, setSummary] = useState({
    totals: { activeBids: 0, myReviews: 0, totalOrders: 0 },
    recent: { reviews: [], orders: [] },
  });
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState("");

  // Fallback orders state if /api/dashboard/me doesn’t return orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "");
  const stars = (n) => {
    const full = Math.floor(n);
    const half = n - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return (
      <>
        {Array(full)
          .fill(0)
          .map((_, i) => (
            <i key={`f${i}`} className="fas fa-star" />
          ))}
        {half ? <i className="fas fa-star-half-alt" /> : null}
        {Array(empty)
          .fill(0)
          .map((_, i) => (
            <i key={`e${i}`} className="far fa-star" />
          ))}
      </>
    );
  };

  async function loadDashboard() {
    setDashLoading(true);
    setDashError("");
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return navigate("/login", { replace: true });

      const res = await fetch(`${API_BASE}/api/dashboard/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.status === 401) return navigate("/login", { replace: true });

      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Failed to load dashboard");

      const totals = {
        activeBids: data?.totals?.activeBids ?? 0,
        myReviews: data?.totals?.myReviews ?? 0,
        totalOrders: data?.totals?.totalOrders ?? 0,
      };
      const recent = {
        reviews: Array.isArray(data?.recent?.reviews) ? data.recent.reviews : [],
        orders: Array.isArray(data?.recent?.orders) ? data.recent.orders : [],
      };

      setSummary({ totals, recent });

      // If the backend didn't include orders, fall back to /api/orders/mine
      if (!recent.orders.length || totals.totalOrders === 0) {
        loadMyOrdersFallback();
      }
    } catch (e) {
      setDashError(e.message || "Failed to load dashboard");
    } finally {
      setDashLoading(false);
    }
  }

  async function loadMyOrdersFallback() {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return navigate("/login", { replace: true });

      const res = await fetch(`${API_BASE}/api/orders/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.status === 401) return navigate("/login", { replace: true });

      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Failed to load orders");

      setOrders(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setOrdersError(e.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  /* =================== Payment Methods (existing) =================== */
  const [savedCards, setSavedCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, paymentId, cardName, last4 }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const HIDDEN_KEY = "hiddenSavedCards";
  const [hidden, setHidden] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const visibleCards = useMemo(
    () => savedCards.filter((c) => !hidden.includes(c.id)),
    [savedCards, hidden]
  );

  const mask = (last4) => `•••• •••• •••• ${String(last4 || "").slice(-4)}`;
  const fmtDate2 = (iso) => (iso ? new Date(iso).toLocaleDateString() : "");

  async function loadSavedCards() {
    setCardsLoading(true);
    setCardsError("");
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }
      const res = await fetch(`${API_BASE}/api/payments/my?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Failed to load");

      const acc = new Map();
      (data.items || []).forEach((p) => {
        const card = p?.payment?.card;
        if (p?.payment?.method === "card" && card && (card.last4 || card.cardCipher)) {
          const id = card.cardCipher || `${card.cardName || ""}|${card.last4 || ""}`;
          if (!acc.has(id)) {
            acc.set(id, {
              id,
              cardName: card.cardName || "Saved card",
              last4: card.last4 || "••••",
              provider: card.provider || "card",
              createdAt: p.createdAt,
              paymentId: p._id,
            });
          }
        }
      });
      setSavedCards(Array.from(acc.values()));
    } catch (e) {
      setCardsError(e.message);
    } finally {
      setCardsLoading(false);
    }
  }

  useEffect(() => {
    loadSavedCards();
  }, []);

  async function deleteSavedCardOnServer(paymentId) {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API_BASE}/api/payments/${paymentId}/card`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || "Delete failed");
    return true;
  }

  function openDeleteConfirm(card) {
    setConfirmTarget(card);
    setConfirmError("");
    setConfirmOpen(true);
  }
  function closeDeleteConfirm() {
    if (confirmBusy) return;
    setConfirmOpen(false);
    setConfirmTarget(null);
  }

  async function confirmDeleteNow() {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    setConfirmError("");
    try {
      await deleteSavedCardOnServer(confirmTarget.paymentId);
      setSavedCards((prev) => prev.filter((x) => x.id !== confirmTarget.id));
      closeDeleteConfirm();
    } catch (e) {
      setConfirmError(e.message || "Failed to delete card");
    } finally {
      setConfirmBusy(false);
    }
  }

  /* =================== Derived UI data =================== */
  const recentReviews = Array.isArray(summary?.recent?.reviews)
    ? summary.recent.reviews
    : [];

  // Prefer orders from /api/dashboard/me; otherwise use fallback
  const dashboardOrders = Array.isArray(summary?.recent?.orders)
    ? summary.recent.orders
    : [];
  const fallbackRecentOrders = (orders || []).slice(0, 3);
  const recentOrders =
    dashboardOrders.length > 0 ? dashboardOrders : fallbackRecentOrders;

  // Stat card: prefer totalOrders from dashboard; else fallback to orders.length
  const totalOrders =
    typeof summary?.totals?.totalOrders === "number" && summary.totals.totalOrders > 0
      ? summary.totals.totalOrders
      : orders.length;

  const renderOrderBadge = (order) => {
    const ps = String(order.paymentStatus || "").toLowerCase();
    const os = String(order.orderStatus || "").toLowerCase();
    if (ps === "paid") return <span className="status status-delivered">Paid</span>;
    if (ps === "cancelled") return <span className="status status-pending">Cancelled</span>;
    if (os === "shipped") return <span className="status status-processing">Shipped</span>;
    if (os === "completed") return <span className="status status-delivered">Completed</span>;
    return <span className="status status-processing">Processing</span>;
  };

  return (
    <>
      <div id="particles-js"></div>
      <Header />

      <div className="dashboard-container">
        <UserSidebar />

        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Dashboard</h2>
          </div>

          {dashLoading && <p>Loading…</p>}
          {!dashLoading && dashError && (
            <p className="error" style={{ color: "#e74c3c" }}>{dashError}</p>
          )}

          {/* ====== Stats ====== */}
          <div className="stats-grid">
            {/* Total Orders (wired) */}
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-shopping-bag"></i>
              </div>
              <div className="stat-info">
                <h3>
                  {dashLoading ? "…" : totalOrders}
                </h3>
                <p>Total Orders</p>
              </div>
            </div>

            {/* Active Bids */}
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-gavel"></i>
              </div>
              <div className="stat-info">
                <h3>{dashLoading ? "…" : summary?.totals?.activeBids ?? 0}</h3>
                <p>Active Bids</p>
              </div>
            </div>

            {/* My Reviews */}
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-star"></i>
              </div>
              <div className="stat-info">
                <h3>{dashLoading ? "…" : summary?.totals?.myReviews ?? 0}</h3>
                <p>My Reviews</p>
              </div>
            </div>
          </div>

          {/* ====== Recent Orders (wired) ====== */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Orders</h3>
              <a href="/my-orders" className="view-all">View All</a>
            </div>

            {(ordersLoading && dashboardOrders.length === 0) && (
              <p>Loading your orders…</p>
            )}
            {ordersError && dashboardOrders.length === 0 && (
              <p className="error" style={{ color: "#e74c3c" }}>{ordersError}</p>
            )}

            <div className="table-responsive">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(!recentOrders || recentOrders.length === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ color: "#b0b0b0", textAlign: "center", padding: 16 }}>
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="order-id">#{o.orderNo || o.id}</td>
                        <td>{fmtDate(o.createdAt)}</td>
                        <td>
                          {o.title ||
                            (o.selections?.type
                              ? `${o.selections.type} ${o.selections.shape || ""}`.trim()
                              : "Custom Order")}
                        </td>
                        <td>{money(o.amount, o.currency)}</td>
                        <td>{renderOrderBadge(o)}</td>
                        <td>
                          <a
                            className="view-all"
                            href={`/orders/${o.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/orders/${o.id}`);
                            }}
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ====== Payment Methods (dynamic) ====== */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Payment Methods</h3>
            </div>

            {cardsLoading && <p>Loading saved cards…</p>}
            {!cardsLoading && cardsError && (
              <p className="error" style={{ color: "#e74c3c" }}>
                {cardsError}
              </p>
            )}

            {!cardsLoading && !cardsError && (
              <div className="payment-methods">
                {visibleCards.length > 0 ? (
                  visibleCards.map((c, idx) => (
                    <div
                      className={`payment-card ${idx === 0 ? "default" : ""}`}
                      key={c.id}
                    >
                      <div className="payment-card-header">
                        <div className="payment-type">
                          <div className="payment-icon">
                            <i className="far fa-credit-card"></i>
                          </div>
                          <div className="payment-name">
                            {c.cardName || "Saved card"}
                          </div>
                        </div>
                        {idx === 0 && (
                          <span className="default-badge">Default</span>
                        )}
                      </div>
                      <div className="payment-details">
                        <div className="card-number">{mask(c.last4)}</div>
                        <div className="card-expiry">
                          Saved on: {fmtDate2(c.createdAt)}
                        </div>
                      </div>
                      <div className="payment-actions">
                        <button
                          className="payment-btn btn-remove"
                          onClick={() => openDeleteConfirm(c)}
                          title="Delete saved card"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div>
                    <p style={{ marginBottom: 8 }}>
                      You don’t have any saved cards yet.
                    </p>
                    <p style={{ color: "#b0b0b0", fontSize: 14 }}>
                      Tip: cards are saved when you pay by card and tick
                      “Remember”.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ====== Recent Reviews (wired) ====== */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Reviews</h3>
              <a href="/my-feedback" className="view-all">
                View All
              </a>
            </div>

            {dashLoading && <p>Loading your reviews…</p>}
            {!dashLoading && (
              <div className="reviews-list">
                {recentReviews.length === 0 ? (
                  <div style={{ color: "#b0b0b0" }}>No reviews yet.</div>
                ) : (
                  recentReviews.map((r) => {
                    const title =
                      r.title ||
                      r.productName ||
                      r.gemName ||
                      r.productId ||
                      (r.orderId ? `Order #${r.orderId}` : "Item");

                    const rating = Number(r.rating) || 0;
                    const text =
                      r.text || r.feedbackText || r.comment || "(no text)";
                    const when = r.date || r.createdAt;

                    return (
                      <div className="review-item" key={r.id || r._id || title}>
                        <div className="review-header">
                          <div className="review-gem">{title}</div>
                          <div className="review-date">{fmtDate(when)}</div>
                        </div>
                        <div className="review-rating">{stars(rating)}</div>
                        <p className="review-text">{text}</p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {confirmOpen && (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="confirm-modal">
            <div className="confirm-header">
              <h3 id="confirm-title">Delete saved card?</h3>
              <button
                className="confirm-close"
                onClick={closeDeleteConfirm}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="confirm-body">
              <p>
                This will remove the saved card from your account for this
                payment.
                {confirmTarget?.cardName && (
                  <>
                    {" "}
                    <br />
                    <strong>{confirmTarget.cardName}</strong>
                  </>
                )}
                {confirmTarget?.last4 && (
                  <>
                    {" "}
                    <br />
                    •••• •••• •••• {String(confirmTarget.last4).slice(-4)}
                  </>
                )}
              </p>
              {confirmError && <p className="confirm-error">{confirmError}</p>}
            </div>

            <div className="confirm-actions">
              <button
                className="btn btn-secondary"
                onClick={closeDeleteConfirm}
                disabled={confirmBusy}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDeleteNow}
                disabled={confirmBusy}
              >
                {confirmBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDashboard;
