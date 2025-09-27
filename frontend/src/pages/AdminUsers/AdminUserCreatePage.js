// src/pages/Admin/AdminUserCreatePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../../Components/Header";
import AdminSidebar from "../../Components/AdminSidebar";
import { api } from "../../api";
import "../DashBoards/AdminDashboard.css"; // reuse styles

// [VALIDATION] — simple regex rules (tweak as you like)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/; // letters with spaces/'/-
const PHONE_RE = /^\+?[0-9()\-.\s]{7,15}$/; // optional +; 7–15 digits overall
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // ≥8 chars with 1 letter + 1 number

export default function AdminUserCreatePage() {
  const navigate = useNavigate();

  // guard
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    if (!u) return navigate("/login", { replace: true });
    if (u.role !== "admin") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "buyer",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // [VALIDATION] per-field inline errors
  const [errors, setErrors] = useState({});

  // [VALIDATION] helpers
  const setFieldError = (name, message) =>
    setErrors((e) => ({ ...e, [name]: message }));
  const clearAlerts = () => {
    setErr("");
    setMsg("");
  };

  // [VALIDATION] field validators
  const validateFullName = (v) => {
    const s = (v || "").trim();
    if (!s) return "Full name is required.";
    if (!NAME_RE.test(s)) return "Use letters only (spaces, apostrophes, hyphens allowed).";
    return "";
  };
  const validateEmail = (v) => {
    const s = (v || "").trim();
    if (!s) return "Email is required.";
    if (!EMAIL_RE.test(s)) return "Enter a valid email address.";
    return "";
  };
  const validatePhone = (v) => {
    const s = (v || "").trim();
    if (!s) return ""; // optional
    if (!PHONE_RE.test(s)) return "Use international format, e.g., +94 77 123 4567.";
    return "";
  };
  const validatePassword = (v) => {
    if (!v) return "Password is required.";
    if (!PASSWORD_RE.test(v)) return "Min 8 chars with at least 1 letter and 1 number.";
    return "";
  };
  const validateRole = (v) => (["buyer", "seller", "admin"].includes(v) ? "" : "Invalid role.");
  const validateStatus = (v) => (["active", "suspended"].includes(v) ? "" : "Invalid status.");

  const onSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    // [VALIDATION] run all checks
    const fullNameErr = validateFullName(form.fullName);
    const emailErr = validateEmail(form.email);
    const phoneErr = validatePhone(form.phone);
    const passErr = validatePassword(form.password);
    const roleErr = validateRole(form.role);
    const statusErr = validateStatus(form.status);

    setErrors({
      fullName: fullNameErr,
      email: emailErr,
      phone: phoneErr,
      password: passErr,
      role: roleErr,
      status: statusErr,
    });

    if (fullNameErr || emailErr || phoneErr || passErr || roleErr || statusErr) return;

    try {
      setSaving(true);
      await api.admin.addUser({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setMsg("User created successfully.");
      navigate("/admin/users", { replace: true });
    } catch (e2) {
      setErr(e2.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div id="particles-js"></div>
      <Header />

      <div className="dashboard-container">
        <AdminSidebar />

        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Add New User</h2>
            <Link to="/admin/users" className="btn" style={{ marginLeft: "auto" }}>
              ← Back to Users
            </Link>
          </div>

          {err && (
            <div
              style={{
                background: "rgba(231,76,60,0.15)",
                border: "1px solid rgba(231,76,60,0.35)",
                color: "#ff6b6b",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              {err}
            </div>
          )}
          {msg && (
            <div
              style={{
                background: "rgba(46,204,113,0.15)",
                border: "1px solid rgba(46,204,113,0.35)",
                color: "#2ecc71",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              {msg}
            </div>
          )}

          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">User Details</h3>
            </div>

            <form onSubmit={onSubmit} noValidate>
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  onBlur={(e) => setFieldError("fullName", validateFullName(e.target.value))} // [VALIDATION]
                  aria-invalid={!!errors.fullName}
                  required
                  placeholder="Full Name"
                />
                {errors.fullName && <small className="error">{errors.fullName}</small>}
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onBlur={(e) => setFieldError("email", validateEmail(e.target.value))} // [VALIDATION]
                  aria-invalid={!!errors.email}
                  required
                  placeholder="name@example.com"
                  autoComplete="email"
                />
                {errors.email && <small className="error">{errors.email}</small>}
              </div>

              {/* Phone (optional) */}
              <div className="form-group">
                <label className="form-label">Phone </label>
                <input
                  type="tel"
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onBlur={(e) => setFieldError("phone", validatePhone(e.target.value))} // [VALIDATION]
                  aria-invalid={!!errors.phone}
                  placeholder="+94 77 123 4567" // [VALIDATION] clearer hint; no strict validation required
                  inputMode="tel"
                  autoComplete="tel"
                />
                {errors.phone && <small className="error">{errors.phone}</small>}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onBlur={(e) => setFieldError("password", validatePassword(e.target.value))} // [VALIDATION]
                  aria-invalid={!!errors.password}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                />
                {errors.password && <small className="error">{errors.password}</small>}
              </div>

              {/* Role */}
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  onBlur={(e) => setFieldError("role", validateRole(e.target.value))} // [VALIDATION]
                  aria-invalid={!!errors.role}
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="admin">Admin</option>
                </select>
                {errors.role && <small className="error">{errors.role}</small>}
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  onBlur={(e) => setFieldError("status", validateStatus(e.target.value))} // [VALIDATION]
                  aria-invalid={!!errors.status}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                {errors.status && <small className="error">{errors.status}</small>}
              </div>

              <button className="btn" disabled={saving}>
                {saving ? "Creating…" : "Create User"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
