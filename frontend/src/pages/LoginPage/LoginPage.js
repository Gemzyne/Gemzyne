// src/pages/Auth/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import { api } from "../../api"; // backend unchanged
import "./LoginPage.css";
import { useUser } from "../../context/UserContext";

/* ===============================================================
   Local slideshow loader (unchanged)
   =============================================================== */
function loadLocalShuffleImages() {
  const urls = [];
  // Vite
  try {
    if (typeof import.meta !== "undefined" && import.meta && import.meta.glob) {
      const modules = import.meta.glob(
        "../../Assets/shuffle/*.{jpg,jpeg,png,webp,gif}",
        { eager: true, as: "url" }
      );
      const values = Object.values(modules);
      if (values.length) urls.push(...values);
    }
  } catch (_) {}
  // CRA/Webpack
  if (!urls.length) {
    try {
      const ctx = require.context(
        "../../Assets/shuffle",
        false,
        /\.(png|jpe?g|webp|gif)$/i
      );
      urls.push(...ctx.keys().map(ctx));
    } catch (_) {}
  }
  if (!urls.length) urls.push("/assets/fallback-gem.jpg");
  return urls;
}

/* ===============================================================
   [VALIDATION] Helpers & regex
   =============================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9()\-.\s]{7,15}$/; // allows +, spaces, dashes, dots, ()
const NAME_RE = /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/; // letters with optional separators
const OTP_RE = /^\d{6}$/; // exactly 6 digits
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // ≥8 chars, 1 letter & 1 number

const isEmail = (v) => EMAIL_RE.test(v);
const isPhone = (v) => PHONE_RE.test(v);
const isIdentifier = (v) => isEmail(v) || isPhone(v);

const LoginPage = () => {
  const navigate = useNavigate();
  const { setMe } = useUser();

  // which form is visible
  const [activeForm, setActiveForm] = useState("login"); // login | register | otp | forgot | reset

  // password visibility
  const [showPassword, setShowPassword] = useState({
    login: false,
    register: false,
    registerConfirm: false,
    reset: false,
    resetConfirm: false,
  });

  // form data
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [otpForm, setOtpForm] = useState({ email: "", code: "" });
  const [forgotForm, setForgotForm] = useState({ email: "" });
  const [resetForm, setResetForm] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirm: "",
  });

  // UI feedback
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // [VALIDATION] central small error messages per field (per active form)
  const [errors, setErrors] = useState({});

  const resetAlerts = () => {
    setMsg(null);
    setErr(null);
    setErrors({}); // [VALIDATION] clear inline errors too
  };

  // Lock page scroll only while this page is mounted (desktop widths)
  useEffect(() => {
    const apply = () => {
      if (window.innerWidth >= 993) {
        document.body.classList.add("lock-scroll");
      } else {
        document.body.classList.remove("lock-scroll");
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      document.body.classList.remove("lock-scroll");
    };
  }, []);

  /* ============================
     Fonts + Particles (unchanged)
     ============================ */
  useEffect(() => {
    const id = "particles-cdn";
    if (!document.getElementById("gzyne-fonts")) {
      const fonts = document.createElement("link");
      fonts.id = "gzyne-fonts";
      fonts.href =
        "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@300;400;500;600;700&display=swap";
      fonts.rel = "stylesheet";
      document.head.appendChild(fonts);
    }
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.id = id;
      script.src =
        "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      script.async = true;
      script.onload = () => {
        if (window.particlesJS) {
          window.particlesJS("particles-js", {
            particles: {
              number: {
                value: 80,
                density: { enable: true, value_area: 1000 },
              },
              color: { value: "#d4af37" },
              shape: { type: "circle" },
              opacity: { value: 0.35, random: true },
              size: { value: 3.5, random: true },
              line_linked: {
                enable: true,
                distance: 150,
                color: "#d4af37",
                opacity: 0.18,
                width: 1.5,
              },
              move: { enable: true, speed: 1.2, random: true, out_mode: "out" },
            },
            interactivity: {
              detect_on: "canvas",
              events: {
                onhover: { enable: true, mode: "bubble" },
                onclick: { enable: true, mode: "repulse" },
                resize: true,
              },
              modes: {
                bubble: { distance: 220, size: 6, duration: 2, opacity: 0.8 },
                repulse: { distance: 200, duration: 0.4 },
              },
            },
            retina_detect: true,
          });
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  /* ============================
     Auto-fade slideshow
     ============================ */
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  useEffect(() => {
    const urls = loadLocalShuffleImages();
    setSlides(shuffle(urls).slice(0, 12));
    setCurrent(0);
  }, []);

  useEffect(() => {
    if (!slides.length) return;
    const id = setInterval(() => {
      if (!paused) setCurrent((i) => (i + 1) % slides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [slides, paused]);

  /* ============================
     [VALIDATION] Field validators
     ============================ */
  const setFieldError = (name, message) =>
    setErrors((e) => ({ ...e, [name]: message }));

  // Per-field validators to use onBlur and on submit
  const validateLoginIdentifier = (v) => {
    const id = (v || "").trim();
    if (!id) return "Email or phone is required.";
    if (!isIdentifier(id)) return "Enter a valid email address or phone number.";
    return "";
  };
  const validateRequired = (v, label = "This field") =>
    (v || "").length ? "" : `${label} is required.`;
  const validateFullName = (v) => {
    const s = (v || "").trim();
    if (!s) return "Full name is required.";
    if (!NAME_RE.test(s))
      return "Use letters only (spaces, apostrophes, hyphens allowed).";
    return "";
  };
  const validateEmail = (v) => {
    const s = (v || "").trim();
    if (!s) return "Email is required.";
    if (!isEmail(s)) return "Enter a valid email address.";
    return "";
  };
  const validatePhone = (v) => {
    const s = (v || "").trim();
    if (!s) return "Phone is required.";
    if (!isPhone(s)) return "7–15 digits; +, spaces, dashes allowed.";
    return "";
  };
  const validatePassword = (v, label = "Password") => {
    if (!v) return `${label} is required.`;
    if (!PASSWORD_RE.test(v))
      return "At least 8 characters with 1 letter and 1 number.";
    return "";
  };
  const validateConfirm = (pass, confirm) => {
    if (!confirm) return "Please confirm your password.";
    if (pass !== confirm) return "Passwords do not match.";
    return "";
  };
  const validateOTP = (v) => {
    const s = (v || "").trim();
    if (!s) return "Code is required.";
    if (!OTP_RE.test(s)) return "Enter the 6-digit code (digits only).";
    return "";
  };

  const togglePassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  /* ============================
     Submit Handlers (with inline errors)
     ============================ */

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    resetAlerts();

    // validate
    const idErr = validateLoginIdentifier(loginForm.identifier);
    const pwErr = validateRequired(loginForm.password, "Password");

    setErrors({ loginIdentifier: idErr, loginPassword: pwErr });
    if (idErr || pwErr) return;

    setLoading(true);
    try {
      const res = await api.login({
        identifier: (loginForm.identifier || "").trim(),
        password: loginForm.password,
      });
      if (res?.user) localStorage.setItem("user", JSON.stringify(res.user));
      if (res?.accessToken)
        localStorage.setItem("accessToken", res.accessToken);
      if (res?.user) setMe(res.user);
      setMsg("Logged in!");
      navigate("/mainhome");
    } catch (error) {
      if (error.status === 403 && error?.data?.verifyRequired) {
        const email = (loginForm.identifier || "").trim();
        setErr("Please verify your email to continue.");
        setOtpForm({ email, code: "" });
        setActiveForm("otp");
        try {
          await api.resendVerify(email);
          setMsg("We sent you a new verification code.");
        } catch {}
        setLoading(false);
        return;
      }
      setErr(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // REGISTER
  const handleRegister = async (e) => {
    e.preventDefault();
    resetAlerts();

    const fullName = (registerForm.fullName || "").trim();
    const email = (registerForm.email || "").trim();
    const phone = (registerForm.phone || "").trim();
    const pass = registerForm.password || "";
    const confirm = registerForm.confirm || "";

    // validate
    const fullNameErr = validateFullName(fullName);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    const passErr = validatePassword(pass, "Password");
    const confirmErr = validateConfirm(pass, confirm);

    setErrors({
      regFullName: fullNameErr,
      regEmail: emailErr,
      regPhone: phoneErr,
      regPassword: passErr,
      regConfirm: confirmErr,
    });

    if (fullNameErr || emailErr || phoneErr || passErr || confirmErr) return;

    setLoading(true);
    try {
      await api.register({ fullName, email, phone, password: pass });
      setMsg("Registered. Check your email for the OTP.");
      setOtpForm({ email, code: "" });
      setActiveForm("otp");
    } catch (error) {
      setErr(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // VERIFY OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    resetAlerts();

    const email = (otpForm.email || registerForm.email || "").trim();
    const code = (otpForm.code || "").trim();

    const emailErr = validateEmail(email);
    const codeErr = validateOTP(code);
    setErrors({ otpEmail: emailErr, otpCode: codeErr });
    if (emailErr || codeErr) return;

    setLoading(true);
    try {
      await api.verifyEmail({ email, code });
      setMsg("Email verified! Please log in.");
      setLoginForm((s) => ({ ...s, identifier: email }));
      setActiveForm("login");
    } catch (error) {
      setErr(error.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  // FORGOT
  const handleForgot = async (e) => {
    e.preventDefault();
    resetAlerts();

    const email = (forgotForm.email || "").trim();
    const emailErr = validateEmail(email);
    setErrors({ forgotEmail: emailErr });
    if (emailErr) return;

    setLoading(true);
    try {
      await api.forgotPassword(email);
      setMsg("If the account exists, a code has been sent.");
      setResetForm((s) => ({ ...s, email }));
      setActiveForm("reset");
    } catch {
      // intentionally not revealing existence
      setMsg("If the account exists, a code has been sent.");
    } finally {
      setLoading(false);
    }
  };

  // RESET
  const handleReset = async (e) => {
    e.preventDefault();
    resetAlerts();

    const email = (resetForm.email || "").trim();
    const code = (resetForm.code || "").trim();
    const pass = resetForm.newPassword || "";
    const confirm = resetForm.confirm || "";

    const emailErr = validateEmail(email);
    const codeErr = validateOTP(code);
    const passErr = validatePassword(pass, "New password");
    const confirmErr = validateConfirm(pass, confirm);

    setErrors({
      resetEmail: emailErr,
      resetCode: codeErr,
      resetPassword: passErr,
      resetConfirm: confirmErr,
    });
    if (emailErr || codeErr || passErr || confirmErr) return;

    setLoading(true);
    try {
      await api.resetPassword({ email, code, newPassword: pass });
      setMsg("Password updated. Please log in.");
      setLoginForm({ identifier: email, password: "" });
      setActiveForm("login");
    } catch (error) {
      setErr(error.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  /* ============================
     Render
     ============================ */
  return (
    <>
      <div id="particles-js"></div>
      <Header />

      <div className="premium-auth-container">
        {/* ==== FULLSCREEN SLIDESHOW (no controls) ==== */}
        <div
          className="premium-auth-visual"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="premium-visual-overlay" />
          {slides.map((src, idx) => (
            <div
              key={idx}
              className={`premium-slide ${idx === current ? "active" : ""}`}
              style={{ backgroundImage: `url(${src})` }}
              aria-hidden={idx !== current}
            />
          ))}

          <div className="premium-visual-caption">
            <h2>Exquisite Gemstones</h2>
            <p>Discover the world's most precious collections</p>
          </div>
        </div>

        {/* ==== FIXED RIGHT FORM PANEL ==== */}
        <div className="premium-auth-content">
          <div className="premium-form-container">
            {/* Brand + Welcome */}
            <div className="brand-welcome">
              <div className="brand">
                <i className="fas fa-gem" aria-hidden="true"></i>
                <span>GemZyne</span>
              </div>
              <p className="welcome">
                Access your exclusive account to explore certified Sri Lankan
                gemstones and manage orders.
              </p>
            </div>

            {/* Tabs */}
            {(activeForm === "login" || activeForm === "register") && (
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab ${activeForm === "login" ? "active" : ""}`}
                  onClick={() => {
                    setActiveForm("login");
                    resetAlerts();
                  }}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`auth-tab ${activeForm === "register" ? "active" : ""}`}
                  onClick={() => {
                    setActiveForm("register");
                    resetAlerts();
                  }}
                >
                  Register
                </button>
              </div>
            )}

            {/* Global alerts */}
            {err && <div className="premium-alert error">{err}</div>}
            {msg && <div className="premium-alert success">{msg}</div>}

            {/* LOGIN */}
            {activeForm === "login" && (
              <form className="premium-auth-form active" onSubmit={handleLogin} noValidate>
                <div className="premium-form-group">
                  <label>Email or Phone</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-user"></i>
                    <input
                      type="text"
                      className="premium-form-control"
                      placeholder="Enter email or phone"
                      value={loginForm.identifier}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, identifier: e.target.value })
                      }
                      onBlur={(e) =>
                        setFieldError(
                          "loginIdentifier",
                          validateLoginIdentifier(e.target.value)
                        )
                      } // [VALIDATION]
                      aria-invalid={!!errors.loginIdentifier}
                      required
                      title="Enter a valid email (name@example.com) or phone number (+94 77 123 4567)"
                    />
                  </div>
                  {errors.loginIdentifier && (
                    <small className="error">{errors.loginIdentifier}</small>
                  )}
                </div>

                <div className="premium-form-group">
                  <label>Password</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-lock"></i>
                    <i
                      className={`fas ${
                        showPassword.login ? "fa-eye-slash" : "fa-eye"
                      } password-toggle`}
                      onClick={() => togglePassword("login")}
                      role="button"
                      aria-label="Toggle password visibility"
                    />
                    <input
                      type={showPassword.login ? "text" : "password"}
                      className="premium-form-control"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                      onBlur={(e) =>
                        setFieldError(
                          "loginPassword",
                          validateRequired(e.target.value, "Password")
                        )
                      } // [VALIDATION]
                      aria-invalid={!!errors.loginPassword}
                      required
                      minLength={8}
                      title="At least 8 characters including a letter and a number"
                    />
                  </div>
                  {errors.loginPassword && (
                    <small className="error">{errors.loginPassword}</small>
                  )}
                </div>

                <button
                  type="button"
                  className="premium-forgot-password"
                  onClick={() => {
                    setActiveForm("forgot");
                    resetAlerts();
                  }}
                >
                  Forgot Password?
                </button>

                <button type="submit" className="premium-auth-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Please wait...
                    </>
                  ) : (
                    <>Sign In</>
                  )}
                </button>

                <div className="premium-auth-alt">
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => setActiveForm("register")}>
                    Register Now
                  </button>
                </div>
              </form>
            )}

            {/* REGISTER */}
            {activeForm === "register" && (
              <form className="premium-auth-form active" onSubmit={handleRegister} noValidate>
                <div className="premium-form-group">
                  <label>Full Name</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-user-circle"></i>
                    <input
                      type="text"
                      className="premium-form-control"
                      placeholder="Enter your full name"
                      value={registerForm.fullName}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, fullName: e.target.value })
                      }
                      onBlur={(e) =>
                        setFieldError("regFullName", validateFullName(e.target.value))
                      } // [VALIDATION]
                      aria-invalid={!!errors.regFullName}
                      required
                      pattern="^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$"
                      title="Letters only; spaces, apostrophes, and hyphens allowed"
                    />
                  </div>
                  {errors.regFullName && (
                    <small className="error">{errors.regFullName}</small>
                  )}
                </div>

                <div className="premium-form-group">
                  <label>Email Address</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      className="premium-form-control"
                      placeholder="Enter your email"
                      value={registerForm.email}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, email: e.target.value })
                      }
                      onBlur={(e) =>
                        setFieldError("regEmail", validateEmail(e.target.value))
                      } // [VALIDATION]
                      aria-invalid={!!errors.regEmail}
                      required
                      inputMode="email"
                      autoComplete="email"
                    />
                  </div>
                  {errors.regEmail && <small className="error">{errors.regEmail}</small>}
                </div>

                <div className="premium-form-group">
                  <label>Phone Number</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-phone"></i>
                    <input
                      type="tel"
                      className="premium-form-control"
                      placeholder="+CountryCode PhoneNumber"
                      value={registerForm.phone}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, phone: e.target.value })
                      }
                      onBlur={(e) =>
                        setFieldError("regPhone", validatePhone(e.target.value))
                      } // [VALIDATION]
                      aria-invalid={!!errors.regPhone}
                      required
                      inputMode="tel"
                      pattern="^\+?[0-9()\-\.\s]{7,15}$"
                      title="7–15 digits; you may use +, spaces, dashes, dots, and parentheses"
                    />
                  </div>
                  {errors.regPhone && <small className="error">{errors.regPhone}</small>}
                </div>

                <div className="premium-form-group">
                  <label>Password</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-lock"></i>
                    <i
                      className={`fas ${
                        showPassword.register ? "fa-eye-slash" : "fa-eye"
                      } password-toggle`}
                      onClick={() => togglePassword("register")}
                      role="button"
                      aria-label="Toggle password visibility"
                    />
                    <input
                      type={showPassword.register ? "text" : "password"}
                      className="premium-form-control"
                      placeholder="Create a password"
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, password: e.target.value })
                      }
                      onBlur={(e) =>
                        setFieldError(
                          "regPassword",
                          validatePassword(e.target.value, "Password")
                        )
                      } // [VALIDATION]
                      aria-invalid={!!errors.regPassword}
                      required
                      minLength={8}
                      title="At least 8 characters including a letter and a number"
                    />
                  </div>
                  {errors.regPassword && (
                    <small className="error">{errors.regPassword}</small>
                  )}
                </div>

                <div className="premium-form-group">
                  <label>Confirm Password</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-lock"></i>
                    <i
                      className={`fas ${
                        showPassword.registerConfirm ? "fa-eye-slash" : "fa-eye"
                      } password-toggle`}
                      onClick={() => togglePassword("registerConfirm")}
                      role="button"
                      aria-label="Toggle password visibility"
                    />
                    <input
                      type={showPassword.registerConfirm ? "text" : "password"}
                      className="premium-form-control"
                      placeholder="Confirm your password"
                      value={registerForm.confirm}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, confirm: e.target.value })
                      }
                      onBlur={() =>
                        setFieldError(
                          "regConfirm",
                          validateConfirm(registerForm.password, registerForm.confirm)
                        )
                      } // [VALIDATION]
                      aria-invalid={!!errors.regConfirm}
                      required
                      minLength={8}
                    />
                  </div>
                  {errors.regConfirm && (
                    <small className="error">{errors.regConfirm}</small>
                  )}
                </div>

                <button type="submit" className="premium-auth-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-plus"></i> Create Account
                    </>
                  )}
                </button>

                <div className="premium-auth-alt">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setActiveForm("login")}>
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* VERIFY OTP */}
            {activeForm === "otp" && (
              <form className="premium-auth-form active" onSubmit={handleVerifyOtp} noValidate>
                <h3 className="premium-form-title">Verify Your Email</h3>
                <p className="premium-form-sub">
                  We&apos;ve sent a verification code to{" "}
                  <b>{otpForm.email || registerForm.email}</b>
                </p>

                <div className="premium-form-group">
                  <label>Verification Code</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-key"></i>
                    <input
                      type="text"
                      className="premium-form-control otp-input"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      value={otpForm.code}
                      onChange={(e) => setOtpForm({ ...otpForm, code: e.target.value })}
                      onBlur={(e) => setFieldError("otpCode", validateOTP(e.target.value))} // [VALIDATION]
                      aria-invalid={!!errors.otpCode}
                      required
                      inputMode="numeric"
                      pattern="^\d{6}$"
                      title="Enter the 6-digit code"
                      onKeyDown={(e) => {
                        const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
                        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                      }}
                    />
                  </div>
                  {errors.otpCode && <small className="error">{errors.otpCode}</small>}
                </div>

                <div className="premium-row-inline">
                  <button
                    type="button"
                    className="premium-forgot-password"
                    onClick={async () => {
                      resetAlerts();
                      try {
                        const email = (otpForm.email || registerForm.email || "").trim();
                        if (!isEmail(email)) {
                          setFieldError("otpEmail", "Your email looks invalid.");
                          return;
                        }
                        await api.resendVerify(email);
                        setMsg("Verification code re-sent.");
                      } catch (error) {
                        setErr(error.message || "Could not resend code");
                      }
                    }}
                  >
                    Resend code
                  </button>
                </div>

                <button type="submit" className="premium-auth-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Verifying...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle"></i> Verify & Continue
                    </>
                  )}
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD */}
            {activeForm === "forgot" && (
              <form className="premium-auth-form active" onSubmit={handleForgot} noValidate>
                <h3 className="premium-form-title">Reset Your Password</h3>
                <p className="premium-form-sub">Enter your email to receive a reset code</p>

                <div className="premium-form-group">
                  <label>Email Address</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      className="premium-form-control"
                      placeholder="Enter your email"
                      value={forgotForm.email}
                      onChange={(e) => setForgotForm({ email: e.target.value })}
                      onBlur={(e) => setFieldError("forgotEmail", validateEmail(e.target.value))} // [VALIDATION]
                      aria-invalid={!!errors.forgotEmail}
                      required
                      inputMode="email"
                      autoComplete="email"
                    />
                  </div>
                  {errors.forgotEmail && <small className="error">{errors.forgotEmail}</small>}
                </div>

                <button type="submit" className="premium-auth-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Sending...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Send Reset Code
                    </>
                  )}
                </button>

                <div className="premium-auth-alt">
                  Remember your password?{" "}
                  <button type="button" onClick={() => setActiveForm("login")}>
                    Back to Login
                  </button>
                </div>
              </form>
            )}

            {/* RESET PASSWORD */}
            {activeForm === "reset" && (
              <form className="premium-auth-form active" onSubmit={handleReset} noValidate>
                <h3 className="premium-form-title">Create New Password</h3>

                {/* Email (pre-filled from Forgot flow, still editable) */}
                <div className="premium-form-group">
                  <label>Email</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      className="premium-form-control"
                      placeholder="Enter your email"
                      value={resetForm.email}
                      onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                      onBlur={(e) => setFieldError("resetEmail", validateEmail(e.target.value))} // [VALIDATION]
                      aria-invalid={!!errors.resetEmail}
                      required
                      inputMode="email"
                      autoComplete="email"
                    />
                  </div>
                  {errors.resetEmail && <small className="error">{errors.resetEmail}</small>}
                </div>

                <div className="premium-form-group">
                  <label>Code (from email)</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-key"></i>
                    <input
                      type="text"
                      className="premium-form-control"
                      placeholder="Enter verification code"
                      maxLength={6}
                      value={resetForm.code}
                      onChange={(e) => setResetForm({ ...resetForm, code: e.target.value })}
                      onBlur={(e) => setFieldError("resetCode", validateOTP(e.target.value))} // [VALIDATION]
                      aria-invalid={!!errors.resetCode}
                      required
                      inputMode="numeric"
                      pattern="^\d{6}$"
                      title="6 digits only"
                      onKeyDown={(e) => {
                        const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
                        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                      }}
                    />
                  </div>
                  {errors.resetCode && <small className="error">{errors.resetCode}</small>}
                </div>

                <div className="premium-form-group">
                  <label>New Password</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-lock"></i>
                    <i
                      className={`fas ${showPassword.reset ? "fa-eye-slash" : "fa-eye"} password-toggle`}
                      onClick={() => togglePassword("reset")}
                      role="button"
                      aria-label="Toggle password visibility"
                    />
                    <input
                      type={showPassword.reset ? "text" : "password"}
                      className="premium-form-control"
                      placeholder="Enter new password"
                      value={resetForm.newPassword}
                      onChange={(e) =>
                        setResetForm({ ...resetForm, newPassword: e.target.value })
                      }
                      onBlur={(e) =>
                        setFieldError("resetPassword", validatePassword(e.target.value, "New password"))
                      } // [VALIDATION]
                      aria-invalid={!!errors.resetPassword}
                      required
                      minLength={8}
                      title="At least 8 characters including a letter and a number"
                    />
                  </div>
                  {errors.resetPassword && (
                    <small className="error">{errors.resetPassword}</small>
                  )}
                </div>

                <div className="premium-form-group">
                  <label>Confirm New Password</label>
                  <div className="premium-input-wrapper">
                    <i className="fas fa-lock"></i>
                    <i
                      className={`fas ${
                        showPassword.resetConfirm ? "fa-eye-slash" : "fa-eye"
                      } password-toggle`}
                      onClick={() => togglePassword("resetConfirm")}
                      role="button"
                      aria-label="Toggle password visibility"
                    />
                    <input
                      type={showPassword.resetConfirm ? "text" : "password"}
                      className="premium-form-control"
                      placeholder="Confirm new password"
                      value={resetForm.confirm}
                      onChange={(e) => setResetForm({ ...resetForm, confirm: e.target.value })}
                      onBlur={() =>
                        setFieldError(
                          "resetConfirm",
                          validateConfirm(resetForm.newPassword, resetForm.confirm)
                        )
                      } // [VALIDATION]
                      aria-invalid={!!errors.resetConfirm}
                      required
                      minLength={8}
                    />
                  </div>
                  {errors.resetConfirm && (
                    <small className="error">{errors.resetConfirm}</small>
                  )}
                </div>

                <button type="submit" className="premium-auth-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sync-alt"></i> Update Password
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default LoginPage;
