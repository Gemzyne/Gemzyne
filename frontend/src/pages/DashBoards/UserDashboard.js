// src/pages/DashBoards/UserDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import "./UserDashboard.css";
import UserSidebar from "../../Components/UserSidebar";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const UserDashboard = () => {
  const navigate = useNavigate();

  /* ================= Particles + sticky header (unchanged) ================= */
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

    const handleScroll = () => {
      const header = document.getElementById("header");
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // simple route guard
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  /* =================== Payment Methods: fetch from backend ================== */
  const [savedCards, setSavedCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState("");

  // === Confirm Delete modal state ===
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, paymentId, cardName, last4 }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // client-only "removed" list so we don't touch backend
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
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "");

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

      // De-duplicate by encrypted PAN when available, else name|last4
      const acc = new Map();
      (data.items || []).forEach((p) => {
        const card = p?.payment?.card;
        if (
          p?.payment?.method === "card" &&
          card &&
          (card.last4 || card.cardCipher)
        ) {
          const id =
            card.cardCipher || `${card.cardName || ""}|${card.last4 || ""}`;
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
  }, []); // load once

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
    if (confirmBusy) return; // avoid closing while deleting
    setConfirmOpen(false);
    setConfirmTarget(null);
  }

  async function confirmDeleteNow() {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    setConfirmError("");
    try {
      await deleteSavedCardOnServer(confirmTarget.paymentId);
      // remove from UI
      setSavedCards((prev) => prev.filter((x) => x.id !== confirmTarget.id));
      closeDeleteConfirm();
    } catch (e) {
      setConfirmError(e.message || "Failed to delete card");
    } finally {
      setConfirmBusy(false);
    }
  }

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

          {/* ====== Stats (unchanged) ====== */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-shopping-bag"></i>
              </div>
              <div className="stat-info">
                <h3>5</h3>
                <p>Total Orders</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-gavel"></i>
              </div>
              <div className="stat-info">
                <h3>3</h3>
                <p>Active Bids</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-star"></i>
              </div>
              <div className="stat-info">
                <h3>12</h3>
                <p>My Reviews</p>
              </div>
            </div>
          </div>

          {/* ====== Recent Orders (unchanged demo data) ====== */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Orders</h3>
              <a href="#" className="view-all">
                View All
              </a>
            </div>
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
                  <tr>
                    <td className="order-id">#GZ78945</td>
                    <td>12 Oct 2023</td>
                    <td>Royal Blue Sapphire</td>
                    <td>$8,450</td>
                    <td>
                      <span className="status status-delivered">Delivered</span>
                    </td>
                    <td>
                      <a href="#" className="view-all">
                        View
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="order-id">#GZ78932</td>
                    <td>08 Oct 2023</td>
                    <td>Emerald Cut Diamond</td>
                    <td>$15,200</td>
                    <td>
                      <span className="status status-processing">
                        Processing
                      </span>
                    </td>
                    <td>
                      <a href="#" className="view-all">
                        View
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="order-id">#GZ78891</td>
                    <td>03 Oct 2023</td>
                    <td>Tanzanite, 2.1ct</td>
                    <td>$3,750</td>
                    <td>
                      <span className="status status-pending">Pending</span>
                    </td>
                    <td>
                      <a href="#" className="view-all">
                        View
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ====== Payment Methods (NOW DYNAMIC) ====== */}
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
                          Saved on: {fmtDate(c.createdAt)}
                        </div>
                      </div>
                      <div className="payment-actions">
                        {/* No edit per your requirement */}
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

          {/* ====== Recent Reviews (unchanged demo) ====== */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Reviews</h3>
              <a href="#" className="view-all">
                View All
              </a>
            </div>
            <div className="reviews-list">
              <div className="review-item">
                <div className="review-header">
                  <div className="review-gem">Royal Blue Sapphire</div>
                  <div className="review-date">October 15, 2023</div>
                </div>
                <div className="review-rating">
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                </div>
                <p className="review-text">
                  Absolutely stunning sapphire! The color is even more vibrant
                  in person…
                </p>
              </div>
              <div className="review-item">
                <div className="review-header">
                  <div className="review-gem">Emerald Cut Diamond</div>
                  <div className="review-date">October 10, 2023</div>
                </div>
                <div className="review-rating">
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star-half-alt"></i>
                </div>
                <p className="review-text">
                  The diamond is exquisite with excellent clarity…
                </p>
              </div>
            </div>
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
