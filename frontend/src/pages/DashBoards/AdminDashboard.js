import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../../Components/Header";
import AdminSidebar from "../../Components/AdminSidebar";
import { api } from "../../api";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalOrders: 0,
    openComplaints: 0,
  });
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const handleViewUser = (id) => navigate(`/admin/users/${id}`);

  const handleDeleteUser = async (id) => {
    const ok = window.confirm("Delete this user?");
    if (!ok) return;
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
    } catch (e) {
      console.error("Delete failed:", e);
      alert(e.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  // Guard: only admins
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    if (!u) return navigate("/login", { replace: true });
    if (u.role !== "admin") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // Fetch overview + users + complaints
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [overviewRes, usersRes, complaintsRes] = await Promise.all([
          api.admin.getOverview(),
          api.admin.listUsers({ page: 1, limit: 20 }),
          api.admin.listComplaints({ page: 1, limit: 20 }),
        ]);

        if (!mounted) return;

        const ov = overviewRes?.overview || overviewRes || {};
        setOverview({
          totalUsers: Number(ov.totalUsers) || 0,
          totalSellers: Number(ov.totalSellers) || 0,
          totalOrders: Number(ov.totalOrders) || 0,
          openComplaints: Number(ov.openComplaints) || 0,
        });

        const ulist = Array.isArray(usersRes?.users)
          ? usersRes.users
          : Array.isArray(usersRes)
          ? usersRes
          : [];
        setUsers(ulist);

        const clist = Array.isArray(complaintsRes?.complaints)
          ? complaintsRes.complaints
          : Array.isArray(complaintsRes)
          ? complaintsRes
          : [];
        setComplaints(clist);
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

  const usersRows = useMemo(
    () => (Array.isArray(users) ? users.slice(0, 4) : []),
    [users]
  );
  const complaintsRows = useMemo(
    () => (Array.isArray(complaints) ? complaints.slice(0, 4) : []),
    [complaints]
  );

  return (
    <>
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
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-info">
                <h3>{overview.totalUsers}</h3>
                <p>Total Users</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-store"></i>
              </div>
              <div className="stat-info">
                <h3>{overview.totalSellers}</h3>
                <p>Total Sellers</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-shopping-bag"></i>
              </div>
              <div className="stat-info">
                <h3>{overview.totalOrders}</h3>
                <p>Total Orders</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <div className="stat-info">
                <h3>{overview.openComplaints}</h3>
                <p>Open Complaints</p>
              </div>
            </div>
          </div>

          {/* Recent Users */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Users</h3>
              <Link to="/admin/users" className="view-all">
                View All
              </Link>
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
                        <span
                          className={`status ${
                            u.status === "active"
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          {u.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <button
                          className="action-btn btn-view"
                          onClick={() => handleViewUser(u._id)}
                        >
                          View
                        </button>
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
                      <td colSpan="7" style={{ color: "#b0b0b0" }}>
                        No users yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complaints */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Complaints</h3>
              <Link to="/admin/complaints" className="view-all">
                View All
              </Link>
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
                      <td>{c.userName || c.user?.fullName || "—"}</td>
                      <td>{c.subject || "—"}</td>
                      <td>{c.status || "open"}</td>
                      <td>
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {!complaintsRows.length && (
                    <tr>
                      <td colSpan="5" style={{ color: "#b0b0b0" }}>
                        No complaints yet.
                      </td>
                    </tr>
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
