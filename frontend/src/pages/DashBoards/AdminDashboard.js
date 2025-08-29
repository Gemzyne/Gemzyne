import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import AdminSidebar from "../../Components/AdminSidebar";
import { api } from "../../api";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalOrders: 0,
    openComplaints: 0,
  });
  const [users, setUsers] = useState([]);          // array
  const [complaints, setComplaints] = useState([]); // array

  // Guard: only admins
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    if (!u) return navigate("/login", { replace: true });
    if (u.role !== "admin") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // Particles
  useEffect(() => {
    const initParticles = () => {
      window.particlesJS("particles-js", {
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
    };
    if (window.particlesJS) initParticles();
    else {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.onload = initParticles;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    }
  }, []);

  // Sticky header
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

  // Fetch me + overview + users + complaints
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [meRes, overviewRes, usersRes, complaintsRes] = await Promise.all([
          api.getMe(),                  // -> { user: {...} } or {...}
          api.admin.getOverview(),      // -> { totalUsers, ... } or { overview: {...} }
          api.admin.listUsers({ page: 1, limit: 20 }),
          api.admin.listComplaints({ page: 1, limit: 20 }),
        ]);

        if (!mounted) return;

        // current admin
        const meUser = meRes?.user || meRes;
        setMe(meUser || null);

        // overview (accept both shapes)
        const ov = overviewRes?.overview || overviewRes || {};
        setOverview({
          totalUsers: Number(ov.totalUsers) || 0,
          totalSellers: Number(ov.totalSellers) || 0,
          totalOrders: Number(ov.totalOrders) || 0,
          openComplaints: Number(ov.openComplaints) || 0,
        });

        // users
        const ulist = Array.isArray(usersRes?.users)
          ? usersRes.users
          : (Array.isArray(usersRes) ? usersRes : []);
        setUsers(ulist);

        // complaints
        const clist = Array.isArray(complaintsRes?.complaints)
          ? complaintsRes.complaints
          : (Array.isArray(complaintsRes) ? complaintsRes : []);
        setComplaints(clist);
      } catch (e) {
        console.error("Admin fetch error:", e);
        setUsers([]);
        setComplaints([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Charts (same visuals, just drawn once)
  useEffect(() => {
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

      // User Growth
      const ug = document.getElementById("userGrowthChart");
      if (ug) {
        const ctx = ug.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, "rgba(212, 175, 55, 0.8)");
        grad.addColorStop(1, "rgba(212, 175, 55, 0.1)");
        new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"],
            datasets: [{
              label: "New Users",
              data: [85,112,98,125,140,165,190,210,195,230],
              backgroundColor: grad,
              borderRadius: 5,
              borderWidth: 0
            }],
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

      // Platform Revenue
      const pr = document.getElementById("platformRevenueChart");
      if (pr) {
        const ctx = pr.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, "rgba(249, 242, 149, 0.6)");
        grad.addColorStop(1, "rgba(212, 175, 55, 0.1)");
        new Chart(ctx, {
          type: "line",
          data: {
            labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"],
            datasets: [{
              label: "Platform Revenue ($)",
              data: [28500,31200,29800,33400,36700,41200,45600,49800,52300,56800],
              borderColor: "#d4af37",
              backgroundColor: grad,
              tension: 0.3,
              fill: true,
              pointBackgroundColor: "#d4af37",
              pointBorderColor: "#0a0a0a",
              pointRadius: 4,
            }],
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

      // Traffic Sources
      const ts = document.getElementById("trafficChart");
      if (ts) {
        const ctx = ts.getContext("2d");
        new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["Direct","Organic Search","Social Media","Referral","Email"],
            datasets: [{
              data: [35,25,20,15,5],
              backgroundColor: [
                "rgba(212,175,55,0.8)",
                "rgba(52,152,219,0.8)",
                "rgba(155,89,182,0.8)",
                "rgba(46,204,113,0.8)",
                "rgba(241,196,15,0.8)"
              ],
              borderWidth: 0,
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: "bottom", labels: { color: "#f5f5f5" } } },
          },
        });
      }

      // Conversion
      const cv = document.getElementById("conversionChart");
      if (cv) {
        const ctx = cv.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, "rgba(212, 175, 55, 0.6)");
        grad.addColorStop(1, "rgba(212, 175, 55, 0.1)");
        new Chart(ctx, {
          type: "line",
          data: {
            labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"],
            datasets: [{
              label: "Conversion Rate (%)",
              data: [2.8,3.2,3.5,3.7,3.9,4.0,4.1,4.2,4.2,4.3],
              borderColor: "#d4af37",
              backgroundColor: grad,
              tension: 0.3,
              fill: true,
              pointBackgroundColor: "#d4af37",
              pointBorderColor: "#0a0a0a",
              pointRadius: 4,
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#f5f5f5" } } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "rgba(255,255,255,0.1)" },
                ticks: { color: "#b0b0b0", callback: (v) => v + "%" },
              },
              x: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#b0b0b0" } },
            },
          },
        });
      }
    };

    draw();
  }, []);

  const confirmLogout = async (e) => {
    e?.preventDefault?.();
    if (!window.confirm("Are you sure you want to log out?")) return;
    try { await api.logout(); } catch {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const usersRows = useMemo(() => (Array.isArray(users) ? users.slice(0, 4) : []), [users]);
  const complaintsRows = useMemo(() => (Array.isArray(complaints) ? complaints.slice(0, 4) : []), [complaints]);

  return (
    <>
      {/* Particles */}
      <div id="particles-js"></div>

      {/* Header */}
      <Header />

      {/* Dashboard */}
      <div className="dashboard-container">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main */}
        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Admin Dashboard</h2>
          </div>

          {/* Stats Overview */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-users"></i></div>
              <div className="stat-info"><h3>{overview.totalUsers}</h3><p>Total Users</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-store"></i></div>
              <div className="stat-info"><h3>{overview.totalSellers}</h3><p>Total Sellers</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-shopping-bag"></i></div>
              <div className="stat-info"><h3>{overview.totalOrders}</h3><p>Total Orders</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-exclamation-circle"></i></div>
              <div className="stat-info"><h3>{overview.openComplaints}</h3><p>Open Complaints</p></div>
            </div>
          </div>

          {/* Charts */}
          <div className="chart-container">
            <div className="chart-card">
              <h3 className="chart-title">User Growth</h3>
              <canvas id="userGrowthChart"></canvas>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Platform Revenue</h3>
              <canvas id="platformRevenueChart"></canvas>
            </div>
          </div>

          {/* Recent Users (preview) */}
<div className="dashboard-section">
  <div className="section-header">
    <h3 className="section-title">Recent Users</h3>
    <a href="/admin/users" className="view-all">View All</a>
  </div>

  <div className="tabs">
    <div className="tab active">All</div>
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
        {users.slice(0, 4).map((u) => (
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

        {!users.length && (
          <tr><td colSpan="7" style={{ color: "#b0b0b0" }}>No users yet.</td></tr>
        )}
      </tbody>
    </table>
  </div>
</div>


          {/* Complaints */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Complaints Management</h3>
              <a href="#" className="view-all">View All</a>
            </div>

            <div className="tabs">
              <div className="tab active">Open Complaints</div>
              <div className="tab">In Progress</div>
              <div className="tab">Resolved</div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Complaint ID</th><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaintsRows.map((c) => (
                    <tr key={c._id}>
                      <td>#{c._id?.slice?.(-6)?.toUpperCase?.()}</td>
                      <td>{c.userName || c.user?.fullName || c.user?.email || "—"}</td>
                      <td>{c.subject}</td>
                      <td>{c.priority}</td>
                      <td>
                        <span className={`status ${
                          c.status === "resolved" ? "status-resolved" :
                          c.status === "open" ? "status-open" : "status-processing"
                        }`}>{c.status}</span>
                      </td>
                      <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                      <td>
                        <button className="action-btn btn-view">View</button>
                        {c.status !== "resolved" && <button className="action-btn btn-resolve">Resolve</button>}
                      </td>
                    </tr>
                  ))}
                  {!complaintsRows.length && (
                    <tr><td colSpan="7" style={{ color: "#b0b0b0" }}>No complaints.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Analytics (static visuals) */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">System Analytics</h3>
              <button className="btn">Generate Report</button>
            </div>

            <div className="chart-container">
              <div className="chart-card">
                <h3 className="chart-title">Traffic Sources</h3>
                <canvas id="trafficChart"></canvas>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">Conversion Rates</h3>
                <canvas id="conversionChart"></canvas>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon"><i className="fas fa-eye"></i></div><div className="stat-info"><h3>24.5K</h3><p>Monthly Visits</p></div></div>
              <div className="stat-card"><div className="stat-icon"><i className="fas fa-shopping-cart"></i></div><div className="stat-info"><h3>4.2%</h3><p>Conversion Rate</p></div></div>
              <div className="stat-card"><div className="stat-icon"><i className="fas fa-clock"></i></div><div className="stat-info"><h3>3m 42s</h3><p>Avg. Session Duration</p></div></div>
              <div className="stat-card"><div className="stat-icon"><i className="fas fa-redo"></i></div><div className="stat-info"><h3>38.7%</h3><p>Bounce Rate</p></div></div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
