import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import { api } from "../../api";
import "./LoginPage.css";

const LoginPage = () => {
  const navigate = useNavigate();

  // which form is visible
  const [activeForm, setActiveForm] = useState("login"); // login | register | otp | forgot | reset

  // password visibility toggles
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
  const [resetForm, setResetForm] = useState({ email: "", code: "", newPassword: "", confirm: "" });

  // UI feedback
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const authGemRef = useRef(null);

  const resetAlerts = () => { setMsg(null); setErr(null); };

  // === Particles background ===
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
    script.onload = () => {
      if (window.particlesJS) {
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
            events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true }
          },
          retina_detect: true
        });
      }
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // === 3D Gem ===
  useEffect(() => {
    const container = authGemRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(10, 10, 10);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x3498db, 1.5);
    fillLight.position.set(-10, 10, 5);
    scene.add(fillLight);
    const rim = new THREE.PointLight(0xd4af37, 2, 50);
    rim.position.set(-5, -5, 5);
    scene.add(rim);

    const loader = new GLTFLoader();
    let gem = null;
    let frameId;

    loader.load(
      "/gem.glb",
      (gltf) => {
        gem = gltf.scene;
        gem.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.metalness = 0.7;
            child.material.roughness = 0.12;
            if ("emissive" in child.material) {
              child.material.emissive = new THREE.Color(0xaaaaaa);
              child.material.emissiveIntensity = 0.45;
            }
          }
        });
        gem.scale.set(3, 3, 3);
        gem.position.y = -0.5;
        gem.rotation.x = Math.PI / 6;
        scene.add(gem);

        const animate = () => {
          frameId = requestAnimationFrame(animate);
          if (gem) gem.rotation.y += 0.005;
          renderer.render(scene, camera);
        };
        animate();

        const l = container.querySelector(".loader");
        if (l) l.style.display = "none";
      },
      undefined,
      (err) => {
        console.error("Error loading gem:", err);
        const l = container.querySelector(".loader");
        if (l) l.style.display = "none";
        container.innerHTML =
          '<div style="color:#d4af37;text-align:center;padding-top:40%;font-size:18px;">Gem Preview</div>';
      }
    );

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      if (gem) scene.remove(gem);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, []);

  const togglePassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // ===== Handlers =====
  const handleLogin = async (e) => {
    e.preventDefault();
    resetAlerts();
    setLoading(true);
    try {
      const res = await api.login({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });
      if (res?.user) localStorage.setItem("user", JSON.stringify(res.user));
      if (res?.accessToken) localStorage.setItem("accessToken", res.accessToken);

      setMsg("Logged in!");
      if (res?.user) localStorage.setItem("user", JSON.stringify(res.user));
      navigate("/mainhome"); // go home; your profile icon can route by role
    } catch (error) {
      setErr(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    resetAlerts();
    if (registerForm.password !== registerForm.confirm) {
      setErr("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.register({
        fullName: registerForm.fullName.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        password: registerForm.password,
      });
      setMsg("Registered. Check your email for the OTP.");
      setOtpForm({ email: registerForm.email.trim(), code: "" });
      setActiveForm("otp");
    } catch (error) {
      setErr(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    resetAlerts();
    setLoading(true);
    try {
      await api.verifyEmail({ email: otpForm.email.trim(), code: otpForm.code.trim() });
      setMsg("Email verified! Please log in.");
      setLoginForm((s) => ({ ...s, identifier: otpForm.email.trim() }));
      setActiveForm("login");
    } catch (error) {
      setErr(error.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    resetAlerts();
    setLoading(true);
    try {
      await api.forgotPassword(forgotForm.email.trim());
      setMsg("If the account exists, a code has been sent.");
      setResetForm((s) => ({ ...s, email: forgotForm.email.trim() }));
      setActiveForm("reset");
    } catch {
      setMsg("If the account exists, a code has been sent.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    resetAlerts();
    if (resetForm.newPassword !== resetForm.confirm) {
      setErr("Passwords do not match");
      return;
    }
    if (!resetForm.code || resetForm.code.length !== 6) {
      setErr("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword({
        email: resetForm.email.trim(),
        code: resetForm.code.trim(),
        newPassword: resetForm.newPassword,
      });
      setMsg("Password updated. Please log in.");
      setLoginForm({ identifier: resetForm.email.trim(), password: "" });
      setActiveForm("login");
    } catch (error) {
      setErr(error.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div id="particles-js"></div>
      <Header />

      <div className="auth-container">
        <div className="auth-gem" ref={authGemRef}>
          <div className="loader"></div>
        </div>

        <div className="auth-content">
          {(activeForm === "login" || activeForm === "register") && (
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${activeForm === "login" ? "active" : ""}`}
                onClick={() => { setActiveForm("login"); resetAlerts(); }}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-tab ${activeForm === "register" ? "active" : ""}`}
               onClick={() => { setActiveForm("register"); resetAlerts(); }}
              >
                Register
              </button>
            </div>
          )}

          {/* Alerts */}
          {err && <div style={{ color: "#ff6b6b", marginBottom: 12 }}>{err}</div>}
          {msg && <div style={{ color: "#6bff95", marginBottom: 12 }}>{msg}</div>}

          {/* LOGIN */}
          {activeForm === "login" && (
            <form className="auth-form active" onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email or Phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter email or phone"
                  value={loginForm.identifier}
                  onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="input-with-icon">
                  <input
                    type={showPassword.login ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                  <i
                    className={`fas ${showPassword.login ? "fa-eye-slash" : "fa-eye"}`}
                    onClick={() => togglePassword("login")}
                    role="button"
                    aria-label="Toggle password visibility"
                  />
                </div>
              </div>
              <button
                type="button"
                className="forgot-password"
                onClick={() => setActiveForm("forgot")}
              >
                Forgot Password?
              </button>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Please wait..." : "Login"}
              </button>
              <div className="auth-alt">
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => setActiveForm("register")}>
                  Register Now
                </button>
              </div>
            </form>
          )}

          {/* REGISTER */}
          {activeForm === "register" && (
            <form className="auth-form active" onSubmit={handleRegister}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={registerForm.fullName}
                  onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="input-with-icon">
                  <input
                    type={showPassword.register ? "text" : "password"}
                    className="form-control"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    required
                  />
                  <i
                    className={`fas ${showPassword.register ? "fa-eye-slash" : "fa-eye"}`}
                    onClick={() => togglePassword("register")}
                    role="button"
                    aria-label="Toggle password visibility"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-with-icon">
                  <input
                    type={showPassword.registerConfirm ? "text" : "password"}
                    className="form-control"
                    value={registerForm.confirm}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirm: e.target.value })}
                    required
                  />
                  <i
                    className={`fas ${showPassword.registerConfirm ? "fa-eye-slash" : "fa-eye"}`}
                    onClick={() => togglePassword("registerConfirm")}
                    role="button"
                    aria-label="Toggle password visibility"
                  />
                </div>
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </button>
              <div className="auth-alt">
                Already have an account?{" "}
                <button type="button" onClick={() => setActiveForm("login")}>Login</button>
              </div>
            </form>
          )}

          {/* VERIFY OTP */}
          {activeForm === "otp" && (
            <form className="auth-form active" onSubmit={handleVerifyOtp}>
              <h3 style={{ textAlign: "center", color: "#d4af37" }}>Verify Your Email</h3>
              <p style={{ textAlign: "center", color: "#b0b0b0" }}>
                We&apos;ve sent a verification code to <b>{otpForm.email || registerForm.email}</b>
              </p>
              <div className="form-group">
                <label>Verification Code</label>
                <input
                  type="text"
                  className="form-control otp-input"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  value={otpForm.code}
                  onChange={(e) => setOtpForm({ ...otpForm, code: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {activeForm === "forgot" && (
            <form className="auth-form active" onSubmit={handleForgot}>
              <h3 style={{ textAlign: "center", color: "#d4af37" }}>Reset Your Password</h3>
              <p style={{ textAlign: "center", color: "#b0b0b0" }}>Enter your email to receive a reset code</p>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={forgotForm.email}
                  onChange={(e) => setForgotForm({ email: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
              <div className="auth-alt">
                Remember your password?{" "}
                <button type="button" onClick={() => setActiveForm("login")}>Back to Login</button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD */}
          {activeForm === "reset" && (
            <form className="auth-form active" onSubmit={handleReset}>
              <h3 style={{ textAlign: "center", color: "#d4af37" }}>Create New Password</h3>
              <div className="form-group">
                <label>Code (from email)</label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={6}
                  value={resetForm.code}
                  onChange={(e) => setResetForm({ ...resetForm, code: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="input-with-icon">
                  <input
                    type={showPassword.reset ? "text" : "password"}
                    className="form-control"
                    value={resetForm.newPassword}
                    onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                    required
                  />
                  <i
                    className={`fas ${showPassword.reset ? "fa-eye-slash" : "fa-eye"}`}
                    onClick={() => togglePassword("reset")}
                    role="button"
                    aria-label="Toggle password visibility"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="input-with-icon">
                  <input
                    type={showPassword.resetConfirm ? "text" : "password"}
                    className="form-control"
                    value={resetForm.confirm}
                    onChange={(e) => setResetForm({ ...resetForm, confirm: e.target.value })}
                    required
                  />
                  <i
                    className={`fas ${showPassword.resetConfirm ? "fa-eye-slash" : "fa-eye"}`}
                    onClick={() => togglePassword("resetConfirm")}
                    role="button"
                    aria-label="Toggle password visibility"
                  />
                </div>
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default LoginPage;
