// src/pages/Settings/AdminUserDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "../../Components/Header";
import AdminSidebar from "../../Components/AdminSidebar";
import { api } from "../../api";
import "../DashBoards/AdminDashboard.css";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // modals
  const [confirmModal, setConfirmModal] = useState({ open: false, text: "", id: null });
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "", onOk: null });

  // form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("buyer");
  const [status, setStatus] = useState("active");
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  // seed inputs ONCE from API so typing won't get overwritten
  const [seeded, setSeeded] = useState(false);

  // guard: admin only
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

  // load user
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await api.admin.getUser(id);
        const u = r?.user || r;
        if (!u) throw new Error("User not found");

        if (cancelled) return;

        setCreatedAt(u.createdAt || "");
        setUpdatedAt(u.updatedAt || "");

        if (!seeded) {
          setFullName(u.fullName || u.name || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setRole(u.role || "buyer");
          setStatus(u.status || "active");
          setSeeded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setAlertModal({
            open: true,
            title: "Error",
            message: e?.message || "Failed to load user",
            onOk: () => setAlertModal({ open: false, title: "", message: "", onOk: null }),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, seeded]);

  // save
  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.admin.updateUser(id, { fullName, email, phone, role, status });
      const u = res?.user || res;
      setUpdatedAt(u?.updatedAt || new Date().toISOString());
      setAlertModal({
        open: true,
        title: "Success",
        message: "User updated successfully.",
        onOk: () => setAlertModal({ open: false, title: "", message: "", onOk: null }),
      });
    } catch (e2) {
      setAlertModal({
        open: true,
        title: "Error",
        message: e2?.message || "Failed to update user",
        onOk: () => setAlertModal({ open: false, title: "", message: "", onOk: null }),
      });
    } finally {
      setSaving(false);
    }
  };

  // delete (opens confirm modal)
  const onDelete = () => {
    setConfirmModal({ open: true, id, text: "Delete this user?" });
  };

  // confirmed delete
  const actuallyDelete = async () => {
    const delId = confirmModal.id;
    setConfirmModal({ open: false, id: null, text: "" });
    if (!delId) return;

    setDeleting(true);
    try {
      await api.admin.deleteUser(delId);
      setAlertModal({
        open: true,
        title: "Deleted",
        message: "User has been deleted.",
        onOk: () => {
          setAlertModal({ open: false, title: "", message: "", onOk: null });
          navigate("/admin/users", { replace: true });
        },
      });
    } catch (e) {
      setAlertModal({
        open: true,
        title: "Error",
        message: e?.message || "Failed to delete user",
        onOk: () => setAlertModal({ open: false, title: "", message: "", onOk: null }),
      });
      setDeleting(false);
    }
  };

  return (
    <>
      <div id="particles-js"></div>
      <Header />

      <div className="dashboard-container">
        <AdminSidebar />

        <main className="dashboard-content">
          <div className="dashboard-header" style={{ alignItems: "center" }}>
            <h2 className="dashboard-title">User Details</h2>
            <div style={{ marginLeft: "auto" }}>
              <Link to="/admin/users" className="btn" style={{ marginRight: 8 }}>
                ← Back to Users
              </Link>
              <button className="btn" onClick={onDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>

          <div className="dashboard-section">
            {loading ? (
              <div style={{ color: "#b0b0b0" }}>Loading…</div>
            ) : (
              <form onSubmit={onSave}>
                <div className="form-grid" style={{ display: "grid", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      className="form-input"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      className="form-input"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      className="form-input"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={saving}
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={saving}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Created</label>
                    <input
                      className="form-input"
                      type="text"
                      value={createdAt ? new Date(createdAt).toLocaleString() : "—"}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Updated</label>
                    <input
                      className="form-input"
                      type="text"
                      value={updatedAt ? new Date(updatedAt).toLocaleString() : "—"}
                      disabled
                    />
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <button className="btn" type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
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
              onClick={() => setConfirmModal({ open: false, text: "", id: null })}
            >
              &times;
            </button>
          </div>
          <div className="modal-body">
            {confirmModal.text || "Are you sure?"}
          </div>
          <div className="modal-actions">
            <button className="action-btn btn-delete" onClick={actuallyDelete}>Delete</button>
            <button
              className="action-btn btn-view"
              onClick={() => setConfirmModal({ open: false, text: "", id: null })}
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
              onClick={() => {
                const cb = alertModal.onOk;
                setAlertModal({ open: false, title: "", message: "", onOk: null });
                cb && cb();
              }}
            >
              &times;
            </button>
          </div>
          <div className="modal-body">{alertModal.message}</div>
          <div className="modal-actions">
            <button
              className="action-btn btn-view"
              onClick={() => {
                const cb = alertModal.onOk;
                setAlertModal({ open: false, title: "", message: "", onOk: null });
                cb && cb();
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
