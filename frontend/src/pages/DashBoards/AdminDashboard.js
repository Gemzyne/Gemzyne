// src/Pages/Admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../../Components/Header";
import AdminSidebar from "../../Components/AdminSidebar";
import { api } from "../../api";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // --------- State ---------
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalSellers: 0,
    openComplaints: 0,
  });
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [metrics, setMetrics] = useState(null); // from /admin/metrics

  // NEW: modal states
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, text: "" });
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "" });

  // Keep chart instances to destroy on rerender/unmount
  const chartsRef = useRef({});

  // --------- Handlers ---------
  const handleViewUser = (id) => navigate(`/admin/users/${id}`);

  // Open confirm modal (replaces window.confirm)
  const handleDeleteUser = (id) => {
    setConfirmModal({ open: true, id, text: "Delete this user?" });
  };

  // When user clicks "Delete" in the confirm modal
  const actuallyDeleteUser = async () => {
    const id = confirmModal.id;
    setConfirmModal({ open: false, id: null, text: "" });
    if (!id) return;

    try {
      setDeletingId(id);
      await api.admin.deleteUser(id);

      const refreshed = await api.admin.listUsers({ page: 1, limit: 20 });
      const list = Array.isArray(refreshed?.users)
        ? refreshed.users
        : Array.isArray(refreshed)
        ? refreshed
        : [];
      setUsers(list);

      // Success popup (replaces alert)
      setAlertModal({ open: true, title: "Success", message: "User has been deleted." });
    } catch (e) {
      // Error popup (replaces alert)
      setAlertModal({ open: true, title: "Error", message: e?.message || "Failed to delete user" });
    } finally {
      setDeletingId(null);
    }
  };

  // --------- Guards ---------
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    if (!u) return navigate("/login", { replace: true });
    if (u.role !== "admin") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // --------- Particles ---------
  useEffect(() => {
    const initParticles = () =>
      window.particlesJS?.("particles-js", {
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

    if (window.particlesJS) initParticles();
    else {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.onload = initParticles;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    }
  }, []);

  // --------- Sticky header shadow ---------
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

  // --------- Normalize complaints for the table preview ---------
  const normalizeComplaint = (c) => {
    const id = c._id || c.id;
    const userName =
      c.userName ||
      c.user?.fullName ||
      [c.firstName, c.lastName].filter(Boolean).join(" ") ||
      c.email ||
      "—";

    const subject =
      c.subject ||
      c.title ||
      c.complaintCategory ||
      (Array.isArray(c.categories) ? c.categories[0] : "") ||
      "—";

    const status = (c.status || "open").toLowerCase();
    const createdAt = c.createdAt || c.date || c.created_on || null;

    return { _id: id, userName, subject, status, createdAt };
  };

  // --------- Fetch overview + users + complaints + metrics ---------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [overviewRes, usersRes, complaintsRes, metricsRes] = await Promise.all([
          api.admin.getOverview(), // { totalUsers, totalSellers, openComplaints }
          api.admin.listUsers({ page: 1, limit: 20 }),
          api.admin.listComplaints ? api.admin.listComplaints() : Promise.resolve([]),
          api.admin.getMetrics(),
        ]);

        if (!mounted) return;

        const baseOverview = {
          totalUsers: Number(overviewRes?.totalUsers) || 0,
          totalSellers: Number(overviewRes?.totalSellers) || 0,
          openComplaints: Number(overviewRes?.openComplaints) || 0,
        };

        const ulist = Array.isArray(usersRes?.users)
          ? usersRes.users
          : Array.isArray(usersRes)
          ? usersRes
          : [];
        setUsers(ulist);

        const clistRaw = Array.isArray(complaintsRes?.complaints)
          ? complaintsRes.complaints
          : Array.isArray(complaintsRes)
          ? complaintsRes
          : [];
        const clist = clistRaw.map(normalizeComplaint).sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });
        setComplaints(clist);

        const fallbackOpen = clist.filter(
          (c) => !["resolved", "closed"].includes(String(c.status).toLowerCase())
        ).length;

        setOverview({
          totalUsers: baseOverview.totalUsers,
          totalSellers: baseOverview.totalSellers,
          openComplaints:
            (metricsRes?.complaintsOpenCount ?? null) != null
              ? metricsRes.complaintsOpenCount
              : clist.length
              ? fallbackOpen
              : baseOverview.openComplaints,
        });

        setMetrics(metricsRes || null);
      } catch (e) {
        console.error("Admin fetch error:", e);
        setUsers([]);
        setComplaints([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --------- Charts from backend metrics ---------
  useEffect(() => {
    if (!metrics) return;

    const ensureChartJs = () =>
      new Promise((resolve) => {
        if (window.Chart) return resolve();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = resolve;
        document.body.appendChild(s);
      });

    const draw = async () => {
      await ensureChartJs();
      const Chart = window.Chart;

      // Destroy old instances
      Object.values(chartsRef.current).forEach((c) => {
        try {
          c && c.destroy();
        } catch {}
      });
      chartsRef.current = {};

      const byMonth = metrics.usersByMonth || {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
        values: [4, 6, 5, 7, 10, 12, 9, 13, 11, 15],
      };
      const roles = metrics.usersByRole || {
        labels: ["buyer", "seller", "admin"],
        values: [10, 3, 1],
      };
      const statuses = metrics.usersByStatus || { labels: ["active", "suspended"], values: [10, 1] };
      const comp = metrics.complaintsByStatus || { labels: ["Pending", "Resolved", "Closed"], values: [0, 0, 0] };

      // User Growth
      const ug = document.getElementById("userGrowthChart");
      if (ug) {
        const ctx = ug.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, "rgba(212, 175, 55, 0.8)");
        grad.addColorStop(1, "rgba(212, 175, 55, 0.1)");
        chartsRef.current.ug = new Chart(ctx, {
          type: "bar",
          data: {
            labels: byMonth.labels,
            datasets: [{ label: "New Users", data: byMonth.values, backgroundColor: grad, borderRadius: 5 }],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#f5f5f5" } } },
            scales: {
              y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#b0b0b0" } },
              x: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#b0b0b0" } },
            },
          },
        });
      }

      // Users by Role
      const roleEl = document.getElementById("roleChart");
      if (roleEl) {
        chartsRef.current.role = new Chart(roleEl.getContext("2d"), {
          type: "pie",
          data: {
            labels: roles.labels,
            datasets: [
              {
                data: roles.values,
                backgroundColor: [
                  "rgba(212, 175, 55, 0.8)",
                  "rgba(148, 121, 43, 0.8)",
                  "rgba(212, 175, 55, 0.6)",
                  "rgba(169, 140, 44, 0.8)",
                  "rgba(212, 175, 55, 0.4)",
                ],
                borderColor: [
                  "rgba(212,175,55,1)",
                  "rgba(148,121,43,1)",
                  "rgba(212,175,55,1)",
                  "rgba(169,140,44,1)",
                  "rgba(212,175,55,1)",
                ],
                borderWidth: 1,
                hoverOffset: 6,
              },
            ],
          },
          options: { plugins: { legend: { position: "bottom", labels: { color: "#f5f5f5" } } } },
        });
      }

      // Users by Status
      const statusEl = document.getElementById("statusChart");
      if (statusEl) {
        const ctx = statusEl.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, "rgba(212, 175, 55, 0.6)");
        grad.addColorStop(1, "rgba(212, 175, 55, 0.1)");
        chartsRef.current.status = new Chart(ctx, {
          type: "bar",
          data: { labels: statuses.labels, datasets: [{ label: "Users by Status", data: statuses.values, backgroundColor: grad }] },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#f5f5f5" } } },
            scales: {
              y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#b0b0b0" } },
              x: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#b0b0b0" } },
            },
          },
        });
      }

      // Complaints by Status
      const compEl = document.getElementById("complaintsStatusChart");
      if (compEl) {
        chartsRef.current.comp = new Chart(compEl.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: comp.labels,
            datasets: [
              {
                data: comp.values,
                backgroundColor: [
                  "rgba(212, 175, 55, 0.8)",
                  "rgba(148, 121, 43, 0.8)",
                  "rgba(212, 175, 55, 0.6)",
                  "rgba(169, 140, 44, 0.8)",
                  "rgba(212, 175, 55, 0.4)",
                ],
                borderColor: [
                  "rgba(212,175,55,1)",
                  "rgba(148,121,43,1)",
                  "rgba(212,175,55,1)",
                  "rgba(169,140,44,1)",
                  "rgba(212,175,55,1)",
                ],
                borderWidth: 1,
              },
            ],
          },
          options: { cutout: "55%", plugins: { legend: { position: "bottom", labels: { color: "#f5f5f5" } } } },
        });
      }
    };

    draw();

    return () => {
      Object.values(chartsRef.current).forEach((c) => {
        try {
          c && c.destroy();
        } catch {}
      });
      chartsRef.current = {};
    };
  }, [metrics]);

  // --------- Recent rows (just show 4) ---------
  const usersRows = useMemo(() => (Array.isArray(users) ? users.slice(0, 4) : []), [users]);

  const complaintsRows = useMemo(() => {
    if (!Array.isArray(complaints)) return [];
    return complaints.slice(0, 4);
  }, [complaints]);

  // --------- Render ---------
  return (
    <>
      {/* Particles background */}
      <div id="particles-js"></div>

      <Header />

      <div className="dashboard-container">
        <AdminSidebar />

        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Admin Dashboard</h2>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-users" /></div>
              <div className="stat-info">
                <h3>{overview.totalUsers}</h3>
                <p>Total Users</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-store" /></div>
              <div className="stat-info">
                <h3>{overview.totalSellers}</h3>
                <p>Total Sellers</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-exclamation-circle" /></div>
              <div className="stat-info">
                <h3>{overview.openComplaints}</h3>
                <p>Open Complaints</p>
              </div>
            </div>
          </div>

          {/* Charts: Growth + Role */}
          <div className="chart-container">
            <div className="chart-card">
              <h3 className="chart-title">User Growth</h3>
              <canvas id="userGrowthChart" />
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Users by Role</h3>
              <canvas id="roleChart" />
            </div>
          </div>

          {/* Recent Users */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Users</h3>
              <Link to="/admin/users" className="view-all">View All</Link>
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
                  {usersRows.map((u) => (
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
                        <button className="action-btn btn-view" onClick={() => handleViewUser(u._id)}>View</button>
                        <button
                          className="action-btn btn-delete"
                          onClick={() => handleDeleteUser(u._id)}
                          disabled={deletingId === u._id}
                        >
                          {deletingId === u._id ? "…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!usersRows.length && (
                    <tr>
                      <td colSpan="7" style={{ color: "#b0b0b0" }}>No users yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complaints (preview) */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Complaints</h3>
              <Link to="/admin/feedback-hub" className="view-all">View All</Link>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>User</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {complaintsRows.map((c) => (
                    <tr key={c._id}>
                      <td>#{c._id?.slice?.(-6)?.toUpperCase?.()}</td>
                      <td>{c.userName}</td>
                      <td>{c.subject}</td>
                      <td>
                        <span
                          className={`status ${
                            ["resolved", "closed"].includes(c.status) ? "status-active" : "status-inactive"
                          }`}
                        >
                          {c.status?.charAt(0).toUpperCase() + c.status?.slice(1)}
                        </span>
                      </td>
                      <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                  {!complaintsRows.length && (
                    <tr>
                      <td colSpan="5" style={{ color: "#b0b0b0" }}>No complaints yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Analytics */}
          <div className="dashboard-section">
            <div className="chart-container">
              <div className="chart-card">
                <h3 className="chart-title">Complaints by Status</h3>
                <canvas id="complaintsStatusChart" />
              </div>
              <div className="chart-card">
                <h3 className="chart-title">Users by Status</h3>
                <canvas id="statusChart" />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ---------- Modals (use your CSS classes) ---------- */}
      {/* Confirm Modal */}
      <div className={`modal-overlay ${confirmModal.open ? "active" : ""}`}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal-header">
            <div className="modal-title" id="confirm-title">Confirm</div>
            <button
              className="modal-close"
              aria-label="Close"
              onClick={() => setConfirmModal({ open: false, id: null, text: "" })}
            >
              &times;
            </button>
          </div>
          <div className="modal-body">
            {confirmModal.text || "Are you sure?"}
          </div>
          <div className="modal-actions">
            <button className="action-btn btn-delete" onClick={actuallyDeleteUser}>Delete</button>
            <button
              className="action-btn btn-view"
              onClick={() => setConfirmModal({ open: false, id: null, text: "" })}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <div className={`modal-overlay ${alertModal.open ? "active" : ""}`}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="alert-title">
          <div className="modal-header">
            <div className="modal-title" id="alert-title">{alertModal.title || "Message"}</div>
            <button
              className="modal-close"
              aria-label="Close"
              onClick={() => setAlertModal({ open: false, title: "", message: "" })}
            >
              &times;
            </button>
          </div>
          <div className="modal-body">{alertModal.message}</div>
          <div className="modal-actions">
            <button
              className="action-btn btn-view"
              onClick={() => setAlertModal({ open: false, title: "", message: "" })}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
