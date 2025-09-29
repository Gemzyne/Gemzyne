// src/pages/Settings/UserSettings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import { api } from "../../api";
import { useUser } from "../../context/UserContext";
import "../DashBoards/UserDashboard.css";
import UserSidebar from "../../Components/UserSidebar";

/* ============================
   [VALIDATION] helpers & regex
   ============================ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;             // basic email pattern
const NAME_RE  = /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/;        // letters + optional space/'/-
const PHONE_RE = /^\+?[0-9()\-.\s]{7,15}$/;               // optional +; 7–15 digits
const OTP_RE   = /^\d{6}$/;                                // exactly 6 digits
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;       // ≥8 chars, 1 letter + 1 number

export default function UserSettings() {
  const navigate = useNavigate();

  // profile data
  const { me, setMe } = useUser();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // [VALIDATION] per-field errors
  const [errors, setErrors] = useState({
    profile_fullName: "",
    profile_phone: "",
    email_new: "",
    email_code: "",
    pw_current: "",
    pw_new: "",
    pw_confirm: "",
  }); // [VALIDATION]
  const setFieldError = (k, v) => setErrors((e) => ({ ...e, [k]: v })); // [VALIDATION]
  const clearAlerts = () => { setErr(""); setSuccessMsg(""); };          // [VALIDATION]

  // profile form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // email change form
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailRequested, setEmailRequested] = useState(false);

  // loading flags
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  //delete account UI state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ===== load profile
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getMe();
        const user = data?.user || null;
        if (!cancelled) {
          setMe(user);
          setFullName(user?.fullName || "");
          setPhone(user?.phone || "");
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e.message || "Failed to load profile");
          if (String(e.message).includes("401")) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
            navigate("/login", { replace: true });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
          events: {
            onhover: { enable: true, mode: "repulse" },
            onclick: { enable: true, mode: "push" },
            resize: true,
          },
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

  /* ============================
     [VALIDATION] field validators
     ============================ */
  const validateFullName = (v) => {
    const s = (v || "").trim();
    if (!s) return "Full name is required.";
    if (!NAME_RE.test(s)) return "Use letters only (spaces, apostrophes, hyphens allowed).";
    return "";
  };
  const validatePhone = (v) => {
    const s = (v || "").trim();
    if (!s) return ""; // optional
    if (!PHONE_RE.test(s)) return "Use intl. format, e.g., +94 77 123 4567.";
    return "";
  };
  const validateEmail = (v) => {
    const s = (v || "").trim();
    if (!s) return "Email is required.";
    if (!EMAIL_RE.test(s)) return "Enter a valid email address.";
    return "";
  };
  const validateOtp = (v) => {
    const s = (v || "").trim();
    if (!s) return "Code is required.";
    if (!OTP_RE.test(s)) return "Enter the 6-digit code (digits only).";
    return "";
  };
  const validatePassword = (v, label = "Password") => {
    if (!v) return `${label} is required.`;
    if (!PASSWORD_RE.test(v)) return "Min 8 chars with at least 1 letter and 1 number.";
    return "";
  };
  const validateConfirm = (pw, cf) => {
    if (!cf) return "Please confirm your new password.";
    if (pw !== cf) return "Passwords do not match.";
    return "";
  };

  // ===== save profile
  const onSaveProfile = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");

    // [VALIDATION] run checks
    const fullNameErr = validateFullName(fullName);
    const phoneErr = validatePhone(phone);
    setFieldError("profile_fullName", fullNameErr); // [VALIDATION]
    setFieldError("profile_phone", phoneErr);       // [VALIDATION]
    if (fullNameErr || phoneErr) return;            // [VALIDATION]

    setSavingProfile(true);
    try {
      const res = await api.updateMe({ fullName: fullName.trim(), phone: phone.trim() }); // [VALIDATION] trim
      const user = res?.user || res;
      setMe(user);
      setSuccessMsg("Profile updated successfully");
    } catch (e2) {
      setErr(e2.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ===== change password
  const onChangePassword = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");

    // [VALIDATION] run checks
    const curErr = currentPassword ? "" : "Current password is required."; // [VALIDATION]
    const newErr = validatePassword(newPassword, "New password");          // [VALIDATION]
    const cfErr  = validateConfirm(newPassword, confirmPassword);          // [VALIDATION]
    const sameErr =
      !curErr && !newErr && currentPassword === newPassword
        ? "New password must be different from current password."
        : "";                                                               // [VALIDATION]

    setFieldError("pw_current", curErr);              // [VALIDATION]
    setFieldError("pw_new", sameErr || newErr);       // [VALIDATION]
    setFieldError("pw_confirm", cfErr);               // [VALIDATION]
    if (curErr || newErr || cfErr || sameErr) return; // [VALIDATION]

    setSavingPassword(true);
    try {
      await api.me.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg("Password changed successfully");
    } catch (e2) {
      setErr(e2.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  // ===== request email change
  const onRequestEmailChange = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");

    // [VALIDATION] email format
    const newEmailErr = validateEmail(newEmail);
    setFieldError("email_new", newEmailErr);
    if (newEmailErr) return;

    setSavingEmail(true);
    try {
      await api.me.requestEmailChange({ newEmail: newEmail.trim() }); // [VALIDATION] trim
      setEmailRequested(true);
      setSuccessMsg("Verification code sent to your new email");
    } catch (e2) {
      setErr(e2.message || "Failed to request email change");
    } finally {
      setSavingEmail(false);
    }
  };

  // ===== confirm email change
  const onConfirmEmailChange = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");

    // [VALIDATION] 6-digit code
    const codeErr = validateOtp(emailOtp);
    setFieldError("email_code", codeErr);
    if (codeErr) return;

    setSavingEmail(true);
    try {
      const res = await api.me.confirmEmailChange({ code: emailOtp.trim() }); // [VALIDATION] trim
      const user = res?.user || me;
      setMe(user);
      setEmailRequested(false);
      setNewEmail("");
      setEmailOtp("");
      setSuccessMsg("Email updated successfully");
    } catch (e2) {
      setErr(e2.message || "Failed to confirm email change");
    } finally {
      setSavingEmail(false);
    }
  };

  // ===== delete account (soft)
  const onDeleteAccount = async () => {
    setErr("");
    setSuccessMsg("");
    setDeleting(true);
    try {
      await api.me.deleteMe(deleteReason || "user requested");
      // clear local state + storage
      setMe(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      setShowDeleteModal(false);
      navigate("/login", { replace: true });
    } catch (e) {
      setErr(e.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div id="particles-js"></div>
      <Header />
      <div className="dashboard-container">
        <UserSidebar />
        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Account Settings</h2>
          </div>

          {err && (
            <div style={{ color: "#ff6b6b", marginBottom: 16 }}>{err}</div>
          )}
          {successMsg && (
            <div style={{ color: "#2ecc71", marginBottom: 16 }}>
              {successMsg}
            </div>
          )}

          {/* Profile */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Profile</h3>
            </div>
            <form onSubmit={onSaveProfile}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={(e) => setFieldError("profile_fullName", validateFullName(e.target.value))} // [VALIDATION]
                  aria-invalid={!!errors.profile_fullName} // [VALIDATION]
                  placeholder="Full Name" // [VALIDATION] hint
                />
                {errors.profile_fullName && (
                  <small className="error">{errors.profile_fullName}</small>
                )}{/* [VALIDATION] */}
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={(e) => setFieldError("profile_phone", validatePhone(e.target.value))} // [VALIDATION]
                  aria-invalid={!!errors.profile_phone} // [VALIDATION]
                  placeholder="+94 77 123 4567" // [VALIDATION] hint (no strict enforcement)
                  inputMode="tel" // [VALIDATION]
                  autoComplete="tel" // [VALIDATION]
                />
                {errors.profile_phone && (
                  <small className="error">{errors.profile_phone}</small>
                )}{/* [VALIDATION] */}
              </div>
              <button className="btn" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          {/* Email change */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Change Email</h3>
            </div>
            {!emailRequested ? (
              <form onSubmit={onRequestEmailChange}>
                <div className="form-group">
                  <label className="form-label">New Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onBlur={(e) => setFieldError("email_new", validateEmail(e.target.value))} // [VALIDATION]
                    aria-invalid={!!errors.email_new} // [VALIDATION]
                    placeholder="name@example.com" // [VALIDATION] hint
                    inputMode="email" // [VALIDATION]
                    autoComplete="email" // [VALIDATION]
                  />
                  {errors.email_new && (
                    <small className="error">{errors.email_new}</small>
                  )}{/* [VALIDATION] */}
                </div>
                <button className="btn" disabled={savingEmail}>
                  {savingEmail ? "Sending..." : "Send Verification Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={onConfirmEmailChange}>
                <div className="form-group">
                  <label className="form-label">
                    Enter Code (sent to {newEmail})
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    onBlur={(e) => setFieldError("email_code", validateOtp(e.target.value))} // [VALIDATION]
                    aria-invalid={!!errors.email_code} // [VALIDATION]
                    placeholder="6-digit code"
                    maxLength={6} // [VALIDATION]
                    inputMode="numeric" // [VALIDATION]
                    pattern="^\d{6}$" // [VALIDATION]
                    title="Enter the 6-digit code" // [VALIDATION]
                    onKeyDown={(e) => {
                      const ok = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
                      if (!ok.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                    }} // [VALIDATION]
                  />
                  {errors.email_code && (
                    <small className="error">{errors.email_code}</small>
                  )}{/* [VALIDATION] */}
                </div>
                <button className="btn" disabled={savingEmail}>
                  {savingEmail ? "Verifying..." : "Confirm Email Change"}
                </button>
              </form>
            )}
          </div>

          {/* Password */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Change Password</h3>
            </div>
            <form onSubmit={onChangePassword}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onBlur={(e) => setFieldError("pw_current", currentPassword ? "" : "Current password is required.")} // [VALIDATION]
                  aria-invalid={!!errors.pw_current} // [VALIDATION]
                />
                {errors.pw_current && (
                  <small className="error">{errors.pw_current}</small>
                )}{/* [VALIDATION] */}
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={(e) =>
                    setFieldError(
                      "pw_new",
                      currentPassword && newPassword === currentPassword
                        ? "New password must be different from current password."
                        : validatePassword(newPassword, "New password")
                    )
                  } // [VALIDATION]
                  aria-invalid={!!errors.pw_new} // [VALIDATION]
                  placeholder="Minimum 8 characters (include a letter & a number)" // [VALIDATION] hint
                />
                {errors.pw_new && (
                  <small className="error">{errors.pw_new}</small>
                )}{/* [VALIDATION] */}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={(e) => setFieldError("pw_confirm", validateConfirm(newPassword, confirmPassword))} // [VALIDATION]
                  aria-invalid={!!errors.pw_confirm} // [VALIDATION]
                />
                {errors.pw_confirm && (
                  <small className="error">{errors.pw_confirm}</small>
                )}{/* [VALIDATION] */}
              </div>
              <button className="btn" disabled={savingPassword}>
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Delete Account */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title" style={{ color: "#ff6b6b" }}>
                Delete Account
              </h3>
            </div>
            <p style={{ marginBottom: 12, color: "#b0b0b0" }}>
              This will delete your account. You can re-register
              later with the same email to restore your data.
            </p>
            <button
              className="btn"
              style={{ background: "#e74c3c" }}
              onClick={() => setShowDeleteModal(true)}
            >
              Delete my account
            </button>
          </div>
        </main>
      </div>

      {/* Confirm Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Deletion</h3>
              <button
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>
                Are you sure you want to delete your account?
              </p>
              <p style={{ marginBottom: 16, fontSize: 13, color: "#aaa" }}>
                You can re-register later with the same email to restore your
                data.
              </p>
              <div className="form-group">
                <label className="form-label">Reason (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Why are you leaving?"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  disabled={deleting}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <button
                  className="btn"
                  style={{ background: "grey" }}
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  style={{ background: "#e74c3c" }}
                  onClick={onDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, delete my account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
