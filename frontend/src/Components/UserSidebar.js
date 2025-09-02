// src/Components/UserSidebar.jsx
import React, { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "./Sidebar.css";

export default function UserSidebar() {
  const { me, loadingUser, logout } = useUser();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const confirmLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <aside className="dashboard-sidebar">
        <div className="user-profile">
          <div className="user-avatar"><i className="fas fa-user"></i></div>
          <h3 className="user-name">{loadingUser ? "Loading..." : me?.fullName || "—"}</h3>
          <p className="user-email">{loadingUser ? "" : me?.email || ""}</p>
        </div>

        <ul className="dashboard-menu">
          <li><NavLink to="/udashboard"><i className="fas fa-th-large"></i> Dashboard</NavLink></li>
          <li><a href="#"><i className="fas fa-shopping-bag"></i> Orders</a></li>
          <li><NavLink to=""><i className="fas fa-credit-card"></i> Payments</NavLink></li>
          <li><a href="#"><i className="fas fa-gavel"></i> Auctions</a></li>
          <li><a href="#"><i className="fas fa-star"></i> Reviews</a></li>
          <li><NavLink to="/settings"><i className="fas fa-cog"></i> Settings</NavLink></li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowLogoutModal(true); }}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </a>
          </li>
        </ul>
      </aside>

      {showLogoutModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Logout</h3>
              <button className="modal-close" onClick={() => setShowLogoutModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Are you sure you want to log out?</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn" style={{ background: "grey" }} onClick={() => setShowLogoutModal(false)}>Cancel</button>
                <button className="btn" onClick={confirmLogout}>Yes, Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
