// src/pages/MyFeedbackPage/MyFeedbackPage.js
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../Components/Footer";
import "./MyFeedbackPage.css";
import { apiRequest } from "../../lib/api";

const MyFeedbackPage = () => {
  const navigate = useNavigate();

  // particles (unchanged)
  const particlesLoaded = useRef(false);
  useEffect(() => {
    const ensureParticles = () =>
      new Promise((resolve) => {
        if (window.particlesJS) return resolve();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
        s.async = true;
        s.onload = () => resolve();
        document.body.appendChild(s);
      });

    const destroyParticles = () => {
      if (window.pJSDom && window.pJSDom.length) {
        window.pJSDom.forEach((p) => {
          try { p?.pJS?.fn?.vendors?.destroypJS?.(); } catch {}
        });
        window.pJSDom = [];
      }
    };

    ensureParticles().then(() => {
      if (particlesLoaded.current) return;
      particlesLoaded.current = true;
      destroyParticles();
      window.particlesJS("particles-js", {
        particles: {
          number: { value: 80, density: { enable: true, value_area: 800 } },
          color: { value: "#d4af37" },
          shape: { type: "polygon", polygon: { nb_sides: 6 } },
          opacity: { value: 0.3, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false } },
          size: { value: 3, random: true, anim: { enable: true, speed: 3, size_min: 0.1, sync: false } },
          line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.2, width: 1 },
          move: { enable: true, speed: 2, direction: "none", random: true, out_mode: "out" }
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true },
          modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } }, push: { particles_nb: 4 } }
        },
        retina_detect: true
      });
    });

    return () => destroyParticles();
  }, []);

  // header scroll (unchanged)
  useEffect(() => {
    const header = document.getElementById("myfeedback-header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // === fetch data from backend ===
  const [activeTab, setActiveTab] = useState("reviews"); // reviews | complaints
  const [reviews, setReviews] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      // ⬇️ includeHidden=1 so the user can still see their hidden submissions
      const data = await apiRequest("/api/feedback?visibility=all", { method: "GET" });
      const list = Array.isArray(data?.feedback) ? data.feedback : [];

      const mappedReviews = list
        .filter((f) => f.type === "review")
        .map((f) => ({
          id: f._id,
          _raw: f, // keep original doc for editing
          isHidden: !!f.isAdminHidden,
          initials: `${(f.firstName || "U")[0] || "U"}${(f.lastName || "")[0] || ""}`.toUpperCase(),
          name: `${f.firstName || ""} ${f.lastName || ""}`.trim() || "User",
          date: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
          stars: f.rating || 0,
          tags: Array.isArray(f.categories) ? f.categories.map(c => (c?.[0] ? c[0].toUpperCase() + c.slice(1) : c)) : [],
          text: f.feedbackText || "",
          gemImg: "",
          gemDesc: f.productName || f.productId || "—",
          helpful: 0
        }));

      const mappedComplaints = list
        .filter((f) => f.type === "complaint")
        .map((f) => ({
          id: f._id,
          _raw: f,
          isHidden: !!f.isAdminHidden,
          initials: `${(f.firstName || "U")[0] || "U"}${(f.lastName || "")[0] || ""}`.toUpperCase(),
          name: `${f.firstName || ""} ${f.lastName || ""}`.trim() || "User",
          date: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
          status: f.status || "Pending",
          category: f.complaintCategory || (Array.isArray(f.categories) ? f.categories[0] : "") || "Complaint",
          text: f.feedbackText || "",
          gemImg: "",
          gemDesc: f.productName || f.productId || f.orderId || "—"
        }));

      setReviews(mappedReviews);
      setComplaints(mappedComplaints);
    } catch (e) {
      console.error(e);
      alert("Failed to load feedback from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  // delete (calls backend then refreshes state)
  const onDelete = async (id, type) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await apiRequest(`/api/feedback/${id}`, { method: "DELETE" });
      if (type === "review") setReviews((prev) => prev.filter((x) => x.id !== id));
      else setComplaints((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete.");
    }
  };

  return (
    <div className="myfeedback-root">
      <div id="particles-js" />

      <header id="myfeedback-header">
        <div className="logo">GemZyne</div>
        <nav className="nav-links">
          <Link to="/mainhome">Home</Link>
          <Link to="/collection">Collection</Link>
          <Link to="/auction">Auction</Link>
          <Link to="/about">About</Link>
          <Link to="/reviews">Review & Feedback</Link>
        </nav>
        <div className="header-actions">
          <i className="fas fa-search"></i>
          <i className="fas fa-user"></i>
          <i className="fas fa-shopping-bag"></i>
        </div>
      </header>

      <section className="page-header">
        <h1>My Feedback</h1>
        <p>Manage your reviews and complaints</p>
      </section>

      <div className="add-btn-container">
        <button className="add-btn" onClick={() => navigate("/add-feedback")}>
          <i className="fas fa-plus"></i> Share Feedback
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          My Reviews
        </button>
        <button
          className={`tab-btn ${activeTab === "complaints" ? "active" : ""}`}
          onClick={() => setActiveTab("complaints")}
        >
          My Complaints
        </button>
      </div>

      <div className="content-container">
        {loading && <div style={{ padding: 20 }}>Loading…</div>}

        {/* Reviews */}
        {!loading && (
          <div className={`tab-content ${activeTab === "reviews" ? "active" : ""}`} id="reviews-tab">
            <div className="reviews-card">
              <div className="card-header">
                <h3>My Reviews</h3>
                <span>{reviews.length} Reviews</span>
              </div>

              {reviews.length === 0 ? (
                <div className="empty-state" id="reviews-empty">
                  <i className="fas fa-comment-slash"></i>
                  <h3>No Reviews Yet</h3>
                  <p>You haven't submitted any reviews yet. Your feedback helps us improve!</p>
                  <button className="add-btn" style={{ marginTop: 20 }} onClick={() => navigate("/add-feedback")}>
                    <i className="fas fa-plus"></i> Share Your First Review
                  </button>
                </div>
              ) : (
                reviews.map((r) => (
                  <div className="review-item" key={r.id}>
                    <div className="review-header">
                      <div className="reviewer-info">
                        <div className="reviewer-avatar">{r.initials}</div>
                        <div className="reviewer-details">
                          <h4>
                            {r.name}
                            {r.isHidden && <span className="hidden-badge">Hidden</span>}
                          </h4>
                          <p>{r.date}</p>
                        </div>
                      </div>
                      <div className="review-rating">
                        {"★".repeat(r.stars)}
                        {"☆".repeat(5 - r.stars)}
                      </div>
                    </div>

                    <div>
                      {r.tags.map((t, i) => (
                        <span className="review-category" key={`${r.id}-tag-${i}`}>{t}</span>
                      ))}
                    </div>

                    <div className="review-content"><p>{r.text}</p></div>

                    {r.gemDesc && (
                      <div className="review-gem">
                        {r.gemImg ? <img src={r.gemImg} alt="" /> : null}
                        <p>{r.gemDesc}</p>
                      </div>
                    )}

                    <div className="item-actions">
                      <button
                        className="edit-btn"
                        onClick={() => navigate("/add-feedback", { state: { mode: "edit", doc: r._raw } })}
                      >
                        <i className="fas fa-edit"></i> Edit
                      </button>
                      <button className="delete-btn" onClick={() => onDelete(r.id, "review")}>
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Complaints */}
        {!loading && (
          <div className={`tab-content ${activeTab === "complaints" ? "active" : ""}`} id="complaints-tab">
            <div className="reviews-card">
              <div className="card-header">
                <h3>My Complaints</h3>
                <span>{complaints.length} Complaints</span>
              </div>

              {complaints.length === 0 ? (
                <div className="empty-state" id="complaints-empty">
                  <i className="fas fa-comments"></i>
                  <h3>No Complaints Yet</h3>
                  <p>You haven't submitted any complaints. We're glad you're happy with our service!</p>
                </div>
              ) : (
                complaints.map((c) => (
                  <div className="review-item" key={c.id}>
                    <div className="review-header">
                      <div className="reviewer-info">
                        <div className="reviewer-avatar">{c.initials}</div>
                        <div className="reviewer-details">
                          <h4>
                            {c.name}
                            {c.isHidden && <span className="hidden-badge">Hidden</span>}
                          </h4>
                          <p>{c.date}</p>
                        </div>
                      </div>
                      <div className="review-rating">
                        <span className="review-category">{c.category}</span>
                      </div>
                    </div>

                    <span className="review-category">{c.status}</span>

                    <div className="review-content"><p>{c.text}</p></div>

                    {c.gemDesc && (
                      <div className="review-gem">
                        {c.gemImg ? <img src={c.gemImg} alt="" /> : null}
                        <p>{c.gemDesc}</p>
                      </div>
                    )}

                    <div className="item-actions">
                      <button
                        className="edit-btn"
                        onClick={() => navigate("/add-feedback", { state: { mode: "edit", doc: c._raw } })}
                      >
                        <i className="fas fa-edit"></i> Edit
                      </button>
                      <button className="delete-btn" onClick={() => onDelete(c.id, "complaint")}>
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MyFeedbackPage;
