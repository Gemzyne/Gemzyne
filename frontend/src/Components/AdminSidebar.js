// src/Components/AdminSidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "../pages/DashBoards/AdminDashboard.css";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { me, logout, loadingUser } = useUser();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const doLogout = async () => {
    await logout();                  // uses centralized logout (clears tokens + context, aborts fetches)
    navigate("/login", { replace: true });
  };

  const role = (me?.role || "admin").toString();
  const rolePretty = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <>
      <aside className="dashboard-sidebar">
        <div className="user-profile">
          <div className="user-avatar">
            <i className="fas fa-user-shield"></i>
          </div>
          <h3 className="user-name">{loadingUser ? "Loading..." : (me?.fullName || me?.name || "Admin")}</h3>
          <p className="user-email">{loadingUser ? "" : (me?.email || "")}</p>
          <span className="user-role">{rolePretty}</span>
        </div>

        <ul className="dashboard-menu">
          <li>
            <NavLink to="/admin-dashboard" end className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-th-large"></i> Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-users"></i> User Management
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/complaints" className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-exclamation-circle"></i> Complaints
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/analytics" className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-chart-bar"></i> Analytics
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? "active" : "")}>
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

      {showLogoutModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Logout</h3>
              <button className="modal-close" onClick={() => setShowLogoutModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Are you sure you want to log out?</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn" style={{ background: "grey" }} onClick={() => setShowLogoutModal(false)}>
                  Cancel
                </button>
                <button className="btn" onClick={doLogout}>Yes, Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
