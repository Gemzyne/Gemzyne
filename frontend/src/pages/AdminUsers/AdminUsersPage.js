// src/pages/Settings/AdminUsersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import AdminSidebar from "../../Components/AdminSidebar";
import { api } from "../../api";
import "../DashBoards/AdminDashboard.css"; // reuse same styles

// tiny debounce helper (in-component)
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all"); // all | buyer | seller | admin
  const [q, setQ] = useState("");        //  search query
  const debouncedQ = useDebounce(q, 400);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  //  modal states
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, text: "" });
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "" });

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
  const loadUsers = async (roleFilter, query) => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter && roleFilter !== "all") params.role = roleFilter;
      if (query) params.q = query.trim();
      const r = await api.admin.listUsers(params);
      const list = Array.isArray(r?.users) ? r.users : Array.isArray(r) ? r : [];
      setUsers(list);
    } catch (e) {
      console.error("listUsers error", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // reload on tab or debounced search change
  useEffect(() => {
    const role =
      tab === "all" ? undefined :
      tab === "buyer" ? "buyer" :
      tab === "seller" ? "seller" : "admin";
    loadUsers(role, debouncedQ);
  }, [tab, debouncedQ]);

  const visible = useMemo(() => users, [users]);

  // open confirm modal instead of window.confirm
  const askDeleteUser = (id) => {
    setConfirmModal({ open: true, id, text: "Delete this user?" });
  };

  // called when clicking Delete inside modal
  const actuallyDeleteUser = async () => {
    const id = confirmModal.id;
    setConfirmModal({ open: false, id: null, text: "" });
    if (!id) return;

    try {
      setDeletingId(id);
      await api.admin.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setAlertModal({ open: true, title: "Success", message: "User has been deleted." });
    } catch (e) {
      console.error("deleteUser error", e);
      setAlertModal({ open: true, title: "Error", message: e?.message || "Failed to delete user" });
    } finally {
      setDeletingId(null);
    }
  };

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
              <button className="btn" onClick={() => navigate("/admin/users/new")}>
                Add New User
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 16,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative", flex: "1 1 320px", maxWidth: 420 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by name, email, or phone…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      loadUsers(
                        tab === "all"
                          ? undefined
                          : tab === "buyer"
                          ? "buyer"
                          : tab === "seller"
                          ? "seller"
                          : "admin",
                        q
                      );
                    }
                  }}
                  style={{ paddingLeft: 38 }}
                />
                <i
                  className="fas fa-search"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#b0b0b0",
                  }}
                />
                {q && (
                  <button
                    type="button"
                    className="action-btn"
                    title="Clear search"
                    onClick={() => setQ("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                    }}
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>

              {/* Small result count / loading hint */}
              <div style={{ color: "#b0b0b0" }}>
                {loading ? "Searching…" : `${visible.length} result${visible.length === 1 ? "" : "s"}`}
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <div className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
                All Users
              </div>
              <div className={`tab ${tab === "buyer" ? "active" : ""}`} onClick={() => setTab("buyer")}>
                Buyers
              </div>
              <div className={`tab ${tab === "seller" ? "active" : ""}`} onClick={() => setTab("seller")}>
                Sellers
              </div>
              <div className={`tab ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")}>
                Admins
              </div>
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
                    <tr>
                      <td colSpan="7" style={{ color: "#b0b0b0" }}>
                        Loading users…
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    visible.map((u) => (
                      <tr key={u._id}>
                        <td>#{u._id?.slice?.(-6)?.toUpperCase?.()}</td>
                        <td>{u.fullName || u.name || "—"}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>
                          <span
                            className={`status ${
                              u.status === "active" ? "status-active" : "status-inactive"
                            }`}
                          >
                            {u.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <button
                            className="action-btn btn-view"
                            onClick={() => navigate(`/admin/users/${u._id}`)}
                          >
                            View
                          </button>
                          <button
                            className="action-btn btn-delete"
                            onClick={() => askDeleteUser(u._id)}
                            disabled={deletingId === u._id}
                          >
                            {deletingId === u._id ? "…" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}

                  {!loading && !visible.length && (
                    <tr>
                      <td colSpan="7" style={{ color: "#b0b0b0" }}>
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ---------- Modals ---------- */}
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
