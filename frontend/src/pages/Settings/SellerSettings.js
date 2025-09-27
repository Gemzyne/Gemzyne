// src/pages/Settings/SellerSettings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import SellerSidebar from "../../Components/SellerSidebar";
import { api } from "../../api";
import { useUser } from "../../context/UserContext";
import "../DashBoards/SellerDashboard.css";

/* ============================
   [VALIDATION] helpers & regex
   ============================ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE  = /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/; // letters + optional space/'/-
const PHONE_RE = /^\+?[0-9()\-.\s]{7,15}$/;         // optional +; 7–15 digits
const OTP_RE   = /^\d{6}$/;                          // exactly 6 digits
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // ≥8 chars, 1 letter + 1 number

export default function SellerSettings() {
  const navigate = useNavigate();
  const { me, setMe } = useUser();
  const [seededUserId, setSeededUserId] = useState(null);

  // ui state
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
  });
  const setFieldError = (k, v) => setErrors((e) => ({ ...e, [k]: v })); // [VALIDATION]
  const clearAlerts = () => { setErr(""); setSuccessMsg(""); };          // [VALIDATION]

  // profile form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // email change (OTP)
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailRequested, setEmailRequested] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // guard: only sellers
  useEffect(() => {
    const raw = localStorage.getItem("user");
    const u = raw ? JSON.parse(raw) : null;
    if (!u) return navigate("/login", { replace: true });
    if (u.role !== "seller") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // particles bg
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

  // ✅ Seed form ONCE from me when it first arrives (won't overwrite your typing)
  useEffect(() => {
    if (!me) return;
    if (seededUserId !== me._id) {
      setFullName(me.fullName || me.name || "");
      setPhone(me.phone || "");
      setSeededUserId(me._id || "no-id"); // fallback if _id missing
    }
  }, [me, seededUserId]);

  // fetch /users/me on mount (ensures freshness)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const data = await api.getMe();
        const user = data?.user || null;
        if (!cancelled) setMe(user);
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
  }, [navigate, setMe]);

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

  // save profile
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
      setMe(user); // updates context -> sidebar reflects immediately

      // keep localStorage in sync (optional)
      const cached = localStorage.getItem("user");
      if (cached) {
        const parsed = JSON.parse(cached);
        localStorage.setItem("user", JSON.stringify({ ...parsed, ...user }));
      }
      setSuccessMsg("Profile updated successfully");
    } catch (e2) {
      setErr(e2.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // request email change
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

  // confirm email change
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
      const cached = localStorage.getItem("user");
      if (cached) {
        const parsed = JSON.parse(cached);
        localStorage.setItem("user", JSON.stringify({ ...parsed, ...user }));
      }
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

  // change password
  const onChangePassword = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");

    // [VALIDATION] run checks
    const curErr = currentPassword ? "" : "Current password is required.";
    const newErr = validatePassword(newPassword, "New password");
    const cfErr  = validateConfirm(newPassword, confirmPassword);
    const sameErr =
      !curErr && !newErr && currentPassword === newPassword
        ? "New password must be different from current password."
        : "";

    setFieldError("pw_current", curErr);               // [VALIDATION]
    setFieldError("pw_new", sameErr || newErr);        // [VALIDATION]
    setFieldError("pw_confirm", cfErr);                // [VALIDATION]
    if (curErr || newErr || cfErr || sameErr) return;  // [VALIDATION]

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

  return (
    <>
      <div id="particles-js"></div>
      <Header />
      <div className="dashboard-container">
        <SellerSidebar />
        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Account Settings</h2>
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
          {successMsg && (
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
              {successMsg}
            </div>
          )}

          {/* Profile */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Profile</h3>
            </div>
            <form onSubmit={onSaveProfile} /* noValidate */>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={(e) => setFieldError("profile_fullName", validateFullName(e.target.value))} // [VALIDATION]
                  aria-invalid={!!errors.profile_fullName} // [VALIDATION]
                  disabled={savingProfile}
                  placeholder="Full Name" // [VALIDATION] hint
                />
                {errors.profile_fullName && <small className="error">{errors.profile_fullName}</small>}{/* [VALIDATION] */}
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
                  disabled={savingProfile}
                  placeholder="+94 77 123 4567" // [VALIDATION] hint (no strict enforcement)
                  inputMode="tel" // [VALIDATION]
                  autoComplete="tel" // [VALIDATION]
                />
                {errors.profile_phone && <small className="error">{errors.profile_phone}</small>}{/* [VALIDATION] */}
              </div>
              <button className="btn" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          {/* Change Email (OTP) */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Change Email</h3>
            </div>

            {!emailRequested ? (
              <form onSubmit={onRequestEmailChange} /* noValidate */>
                <div className="form-group">
                  <label className="form-label">New Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onBlur={(e) => setFieldError("email_new", validateEmail(e.target.value))} // [VALIDATION]
                    aria-invalid={!!errors.email_new} // [VALIDATION]
                    disabled={savingEmail}
                    placeholder="name@example.com" // [VALIDATION] hint
                    inputMode="email" // [VALIDATION]
                    autoComplete="email" // [VALIDATION]
                  />
                  {errors.email_new && <small className="error">{errors.email_new}</small>}{/* [VALIDATION] */}
                </div>
                <button className="btn" disabled={savingEmail || !newEmail}>
                  {savingEmail ? "Sending..." : "Send Verification Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={onConfirmEmailChange} /* noValidate */>
                <div className="form-group">
                  <label className="form-label">
                    Enter Code (sent to {newEmail})
                  </label>
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    onBlur={(e) => setFieldError("email_code", validateOtp(e.target.value))} // [VALIDATION]
                    aria-invalid={!!errors.email_code} // [VALIDATION]
                    disabled={savingEmail}
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
                  {errors.email_code && <small className="error">{errors.email_code}</small>}{/* [VALIDATION] */}
                </div>
                <button className="btn" disabled={savingEmail || !emailOtp}>
                  {savingEmail ? "Verifying..." : "Confirm Email Change"}
                </button>
              </form>
            )}
          </div>

          {/* Change Password */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Change Password</h3>
            </div>
            <form onSubmit={onChangePassword} /* noValidate */>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onBlur={(e) => setFieldError("pw_current", currentPassword ? "" : "Current password is required.")} // [VALIDATION]
                  aria-invalid={!!errors.pw_current} // [VALIDATION]
                  disabled={savingPassword}
                />
                {errors.pw_current && <small className="error">{errors.pw_current}</small>}{/* [VALIDATION] */}
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
                  disabled={savingPassword}
                  placeholder="Minimum 8 characters (include a letter & a number)" // [VALIDATION] hint
                />
                {errors.pw_new && <small className="error">{errors.pw_new}</small>}{/* [VALIDATION] */}
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
                  disabled={savingPassword}
                />
                {errors.pw_confirm && <small className="error">{errors.pw_confirm}</small>}{/* [VALIDATION] */}
              </div>
              <button className="btn" disabled={savingPassword}>
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
