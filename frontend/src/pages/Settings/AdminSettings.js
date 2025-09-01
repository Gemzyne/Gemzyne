// src/pages/Settings/AdminSettings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import { api } from "../../api";
import { useUser } from "../../context/UserContext";

// If you already have an AdminSidebar component, use it.
// Otherwise make a simple placeholder or duplicate your SellerSidebar styling.
import AdminSidebar from "../../Components/AdminSidebar";

// Reuse your dashboard styles (forms/buttons/modals)
import "../DashBoards/SellerDashboard.css";

export default function AdminSettings() {
  const navigate = useNavigate();
  const { me, setMe } = useUser();

  // ui state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  // ---- guard: only admins
  useEffect(() => {
    const raw = localStorage.getItem("user");
    const u = raw ? JSON.parse(raw) : null;
    if (!u) return navigate("/login", { replace: true });
    if (u.role !== "admin") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // ---- particles bg (same config you use elsewhere)
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

  // ---- sticky header
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

  // ---- seed form ONCE from me (won't overwrite typing)
  useEffect(() => {
    if (me) {
      setFullName((prev) => (prev !== "" ? prev : me.fullName || me.name || ""));
      setPhone((prev) => (prev !== "" ? prev : me.phone || ""));
    }
  }, [me]);

  // ---- fetch /users/me on mount
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

  // ---- save profile
  const onSaveProfile = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");
    setSavingProfile(true);
    try {
      const res = await api.updateMe({ fullName, phone });
      const user = res?.user || res;
      setMe(user); // update context -> sidebar updates instantly

      // keep localStorage in sync
      const cached = localStorage.getItem("user");
      if (cached) {
        const parsed = JSON.parse(cached);
        localStorage.setItem("user", JSON.stringify({ ...parsed, ...user }));
      }
      setSuccessMsg("Profile updated successfully");
    } catch (e) {
      setErr(e.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ---- request email change
  const onRequestEmailChange = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");
    setSavingEmail(true);
    try {
      await api.me.requestEmailChange({ newEmail });
      setEmailRequested(true);
      setSuccessMsg("Verification code sent to your new email");
    } catch (e) {
      setErr(e.message || "Failed to request email change");
    } finally {
      setSavingEmail(false);
    }
  };

  // ---- confirm email change
  const onConfirmEmailChange = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");
    setSavingEmail(true);
    try {
      const res = await api.me.confirmEmailChange({ code: emailOtp });
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
    } catch (e) {
      setErr(e.message || "Failed to confirm email change");
    } finally {
      setSavingEmail(false);
    }
  };

  // ---- change password
  const onChangePassword = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");

    if (newPassword !== confirmPassword) {
      setErr("New password and confirmation do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await api.me.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg("Password changed successfully");
    } catch (e) {
      setErr(e.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
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
            <form onSubmit={onSaveProfile}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={savingProfile}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={savingProfile}
                />
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
              <form onSubmit={onRequestEmailChange}>
                <div className="form-group">
                  <label className="form-label">New Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={savingEmail}
                  />
                </div>
                <button className="btn" disabled={savingEmail || !newEmail}>
                  {savingEmail ? "Sending..." : "Send Verification Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={onConfirmEmailChange}>
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
                    disabled={savingEmail}
                    placeholder="6-digit code"
                  />
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
            <form onSubmit={onChangePassword}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPassword}
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPassword}
                />
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
