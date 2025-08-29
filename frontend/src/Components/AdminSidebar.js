import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api"; // adjust if your api path is different
import "../pages/DashBoards/AdminDashboard.css"; // reuse same styles

export default function AdminSidebar() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.getMe(); // { user: {...} } or {...}
        if (!mounted) return;
        setMe(r?.user || r || null);
      } catch {
        // if token invalid, bounce to login
        navigate("/login", { replace: true });
      }
    })();
    return () => (mounted = false);
  }, [navigate]);

  const confirmLogout = async (e) => {
    e?.preventDefault?.();
    if (!window.confirm("Are you sure you want to log out?")) return;
    try { await api.logout(); } catch {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="user-profile">
        <div className="user-avatar"><i className="fas fa-user-shield"></i></div>
        <h3 className="user-name">{me?.fullName || me?.name || "Admin"}</h3>
        <p className="user-email">{me?.email || ""}</p>
        <span className="user-role">
          {((me?.role || "admin").toString().charAt(0).toUpperCase()) + (me?.role || "admin").toString().slice(1)}
        </span>
      </div>

      <ul className="dashboard-menu">
        <li>
          <NavLink to="/admin-dashboard" end className={({isActive}) => isActive ? "active" : ""}>
            <i className="fas fa-th-large"></i> Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/users" className={({isActive}) => isActive ? "active" : ""}>
            <i className="fas fa-users"></i> User Management
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/complaints" className={({isActive}) => isActive ? "active" : ""}>
            <i className="fas fa-exclamation-circle"></i> Complaints
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/analytics" className={({isActive}) => isActive ? "active" : ""}>
            <i className="fas fa-chart-bar"></i> Analytics
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/settings" className={({isActive}) => isActive ? "active" : ""}>
            <i className="fas fa-cog"></i> System Settings
          </NavLink>
        </li>
        <li>
          <a href="#" onClick={confirmLogout}><i className="fas fa-sign-out-alt"></i> Logout</a>
        </li>
      </ul>
    </aside>
  );
}
