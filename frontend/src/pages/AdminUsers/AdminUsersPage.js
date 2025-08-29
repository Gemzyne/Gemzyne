import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import AdminSidebar from "../../Components/AdminSidebar";
import { api } from "../../api";
import "../DashBoards/AdminDashboard.css"; // reuse same styles

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all"); // all | buyer | seller | admin
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // guard
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    if (!u) return navigate("/login", { replace: true });
    if (u.role !== "admin") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // particles
  useEffect(() => {
    const init = () =>
      window.particlesJS?.("particles-js", {
        particles: {
          number: { value: 60, density: { enable: true, value_area: 800 } },
          color: { value: "#d4af37" },
          shape: { type: "circle" },
          opacity: { value: 0.3, random: true },
          size: { value: 3, random: true },
          line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1 },
          move: { enable: true, speed: 1 },
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true },
        },
        retina_detect: true,
      });
    if (window.particlesJS) init();
    else {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.onload = init;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    }
  }, []);

  // sticky header
  useEffect(() => {
    const onScroll = () => {
      const h = document.getElementById("header");
      if (!h) return;
      if (window.scrollY > 100) h.classList.add("scrolled");
      else h.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // fetch users
  const loadUsers = async (roleFilter) => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter && roleFilter !== "all") params.role = roleFilter;
      const r = await api.admin.listUsers(params);
      const list = Array.isArray(r?.users) ? r.users : (Array.isArray(r) ? r : []);
      setUsers(list);
    } catch (e) {
      console.error("listUsers error", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(tab === "all" ? undefined : (tab === "buyer" ? "buyer" : tab === "seller" ? "seller" : "admin")); }, [tab]);

  const visible = useMemo(() => users, [users]);

  return (
    <>
      <div id="particles-js"></div>
      <Header />

      <div className="dashboard-container">
        <AdminSidebar />

        <main className="dashboard-content">
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">User Management</h3>
              <button className="btn">Add New User</button>
            </div>

            <div className="tabs">
              <div className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All Users</div>
              <div className={`tab ${tab === "buyer" ? "active" : ""}`} onClick={() => setTab("buyer")}>Buyers</div>
              <div className={`tab ${tab === "seller" ? "active" : ""}`} onClick={() => setTab("seller")}>Sellers</div>
              <div className={`tab ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")}>Admins</div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan="7" style={{ color: "#b0b0b0" }}>Loading users…</td></tr>
                  )}

                  {!loading && visible.map((u) => (
                    <tr key={u._id}>
                      <td>#{u._id?.slice?.(-6)?.toUpperCase?.()}</td>
                      <td>{u.fullName || u.name || "—"}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        <span className={`status ${u.status === "active" ? "status-active" : "status-inactive"}`}>
                          {u.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                      <td>
                        <button className="action-btn btn-view">View</button>
                        <button className="action-btn btn-edit">Edit</button>
                      </td>
                    </tr>
                  ))}

                  {!loading && !visible.length && (
                    <tr><td colSpan="7" style={{ color: "#b0b0b0" }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
