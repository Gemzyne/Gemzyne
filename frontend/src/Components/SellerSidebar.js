// frontend/src/Components/SellerSidebar.js
import React, { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { api } from "../api";
import { useUser } from "../context/UserContext";
import "../pages/DashBoards/SellerDashboard.css"; // reuse same style

export default function SellerSidebar() {
  const { me, setMe } = useUser(); // just read from context
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await api.getMe(); // { user: {...} }
        if (!cancelled) setMe(data?.user || null);
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const doLogout = async () => {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <>
      <aside className="dashboard-sidebar">
        <div className="user-profile">
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <h3 className="user-name">
            {loading ? "Loading..." : me?.fullName || "—"}
          </h3>
          <p className="user-email">{loading ? "" : me?.email || ""}</p>
          <span className="user-role">Seller</span>
          {err && (
            <p style={{ color: "#ff6b6b", fontSize: 12, marginTop: 6 }}>
              {err}
            </p>
          )}
        </div>

        <ul className="dashboard-menu">
          <li>
            <NavLink to="/seller-dashboard">
              <i className="fas fa-th-large"></i> Dashboard
            </NavLink>
          </li>
          <li>
            <a href="#">
              <i className="fas fa-gem"></i> Gems
            </a>
          </li>
          <li>
            <a href="#">
              <i className="fas fa-shopping-bag"></i> Orders
            </a>
          </li>
          <li>
            <NavLink to="">
              <i className="fas fa-credit-card"></i> Payments
            </NavLink>
          </li>
          <li>
            <a href="#">
              <i className="fas fa-star"></i> Reviews
            </a>
          </li>
          <li>
            <NavLink to="/seller/settings">
              <i className="fas fa-cog"></i> Settings
            </NavLink>
          </li>
          <li>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowLogoutModal(true);
              }}
            >
              <i className="fas fa-sign-out-alt"></i> Logout
            </a>
          </li>
        </ul>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Logout</h3>
              <button
                className="modal-close"
                onClick={() => setShowLogoutModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "20px" }}>
                Are you sure you want to log out?
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  className="btn"
                  style={{ background: "grey" }}
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>
                <button className="btn" onClick={doLogout}>
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
