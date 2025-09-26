import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";           // shared header (already sticky)
import UserSidebar from "../../Components/UserSidebar"; // your separate user sidebar
import { apiRequest } from "../../lib/api";
import "./MyFeedbackPage.css";                          // CLEAN, scoped styles

export default function MyFeedbackPage() {
  const navigate = useNavigate();

  // particles (scoped id so it can't collide)
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
      window.particlesJS("mf-particles", {
        particles: {
          number: { value: 80, density: { enable: true, value_area: 800 } },
          color: { value: "#d4af37" },
          shape: { type: "polygon", polygon: { nb_sides: 6 } },
          opacity: { value: 0.3, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false } },
          size: { value: 3, random: true, anim: { enable: true, speed: 3, size_min: 0.1, sync: false } },
          line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.2, width: 1 },
          move: { enable: true, speed: 2, random: true, out_mode: "out" }
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

  // data
  const [activeTab, setActiveTab] = useState("reviews"); // reviews | complaints
  const [reviews, setReviews] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("/api/feedback?includeHidden=1&mine=1", { method: "GET" });
      const list = Array.isArray(data?.feedback) ? data.feedback : [];

      const mappedReviews = list.filter(f => f.type === "review").map(f => ({
        id: f._id,
        _raw: f,
        initials: `${(f.firstName || "U")[0] || "U"}${(f.lastName || "")[0] || ""}`.toUpperCase(),
        name: `${f.firstName || ""} ${f.lastName || ""}`.trim() || "User",
        date: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
        stars: Number(f.rating) || 0,
        tags: Array.isArray(f.categories) ? f.categories.map(c => (c ? c.charAt(0).toUpperCase()+c.slice(1) : c)) : [],
        text: f.feedbackText || "",
        gemImg: "",
        gemDesc: f.productName || f.productId || "—",
      }));

      const mappedComplaints = list.filter(f => f.type === "complaint").map(f => ({
        id: f._id,
        _raw: f,
        initials: `${(f.firstName || "U")[0] || "U"}${(f.lastName || "")[0] || ""}`.toUpperCase(),
        name: `${f.firstName || ""} ${f.lastName || ""}`.trim() || "User",
        date: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
        status: f.status || "Pending",
        category: f.complaintCategory || (Array.isArray(f.categories) ? f.categories[0] : "") || "Complaint",
        text: f.feedbackText || "",
        gemImg: "",
        gemDesc: f.productName || f.productId || f.orderId || "—",
        adminReply: f.adminReply || null,
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

  useEffect(() => { loadFeedback(); }, []);

  const onDelete = async (id, type) => {
    try {
      await apiRequest(`/api/feedback/my/${id}`, { method: "DELETE" });
      setConfirmId(null);
      if (type === "review") setReviews(prev => prev.filter(x => x.id !== id));
      else setComplaints(prev => prev.filter(x => x.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete.");
    }
  };

  return (
    <div className="mf-root">
      <div id="mf-particles" />

      {/* Shared sticky header (no extra styles here) */}
      <Header />

      <div className="mf-shell">
        {/* Fixed user sidebar placed under header */}
        <UserSidebar />

        <main className="mf-main">
          {/* Page banner */}
          <section className="mf-page-header">
            <h1>My Feedback</h1>
            <p>Manage your reviews and complaints</p>
          </section>

          {/* CTA */}
          <div className="mf-add">
            <button className="mf-btn" onClick={() => navigate("/add-feedback")}>
              <i className="fas fa-plus" /> Share Feedback
            </button>
          </div>

          {/* Tabs */}
          <div className="mf-tabs">
            <button
              className={`mf-tab ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              My Reviews
            </button>
            <button
              className={`mf-tab ${activeTab === "complaints" ? "active" : ""}`}
              onClick={() => setActiveTab("complaints")}
            >
              My Complaints
            </button>
          </div>

          <div className="mf-content">
            {loading && <div className="mf-loading">Loading…</div>}

            {/* Reviews */}
            {!loading && activeTab === "reviews" && (
              <div className="mf-card">
                <div className="mf-card__head">
                  <h3>My Reviews</h3>
                  <span>{reviews.length} Reviews</span>
                </div>

                {reviews.length === 0 ? (
                  <div className="mf-empty">
                    <i className="fas fa-comment-slash" />
                    <h3>No Reviews Yet</h3>
                    <p>You haven't submitted any reviews yet. Your feedback helps us improve!</p>
                    <button className="mf-btn" onClick={() => navigate("/add-feedback")}>
                      <i className="fas fa-plus" /> Share Your First Review
                    </button>
                  </div>
                ) : (
                  reviews.map(r => (
                    <div className="mf-item" key={r.id}>
                      <div className="mf-row">
                        <div className="mf-user">
                          <div className="mf-ava">{r.initials}</div>
                          <div>
                            <h4 className="mf-name">{r.name}</h4>
                            <p className="mf-meta">{r.date}</p>
                          </div>
                        </div>
                        <div className="mf-stars">
                          {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
                        </div>
                      </div>

                      <div className="mf-chips">
                        {r.tags.map((t, i) => (
                          <span className="mf-chip" key={`${r.id}-tag-${i}`}>{t}</span>
                        ))}
                      </div>

                      <div className="mf-text"><p>{r.text}</p></div>

                      {r.gemDesc && (
                        <div className="mf-gem">
                          {r.gemImg ? <img src={r.gemImg} alt="" /> : null}
                          <p>{r.gemDesc}</p>
                        </div>
                      )}

                      <div className="mf-actions">
                        <button
                          className="mf-btn--pill mf-btn--gold"
                          onClick={() => navigate("/add-feedback", { state: { mode: "edit", doc: r._raw } })}
                        >
                          <i className="fas fa-edit" /> Edit
                        </button>

                        {confirmId === r.id ? (
                          <>
                            <button className="mf-btn--pill mf-btn--red" onClick={() => onDelete(r.id, "review")}>
                              Confirm
                            </button>
                            <button className="mf-btn--pill mf-btn--red" onClick={() => setConfirmId(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button className="mf-btn--pill mf-btn--red" onClick={() => setConfirmId(r.id)}>
                            <i className="fas fa-trash" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Complaints */}
            {!loading && activeTab === "complaints" && (
              <div className="mf-card">
                <div className="mf-card__head">
                  <h3>My Complaints</h3>
                  <span>{complaints.length} Complaints</span>
                </div>

                {complaints.length === 0 ? (
                  <div className="mf-empty">
                    <i className="fas fa-comments" />
                    <h3>No Complaints Yet</h3>
                    <p>You haven't submitted any complaints. We're glad you're happy with our service!</p>
                  </div>
                ) : (
                  complaints.map(c => (
                    <div className="mf-item" key={c.id}>
                      <div className="mf-row">
                        <div className="mf-user">
                          <div className="mf-ava">{c.initials}</div>
                          <div>
                            <h4 className="mf-name">{c.name}</h4>
                            <p className="mf-meta">{c.date}</p>
                          </div>
                        </div>
                      </div>

                      {/* status & category */}
                      <div className="mf-chips">
                        <span className="mf-chip mf-chip--warn">{c.status}</span>
                        {c.category && <span className="mf-chip">{c.category}</span>}
                      </div>

                      {/* seller/admin reply */}
                      {c.adminReply?.text && (
                        <div className="mf-reply">
                          <strong>Seller reply:</strong> {c.adminReply.text}
                        </div>
                      )}

                      <div className="mf-text"><p>{c.text}</p></div>

                      {c.gemDesc && (
                        <div className="mf-gem">
                          {c.gemImg ? <img src={c.gemImg} alt="" /> : null}
                          <p>{c.gemDesc}</p>
                        </div>
                      )}

                      <div className="mf-actions">
                        <button
                          className="mf-btn--pill mf-btn--gold"
                          onClick={() => navigate("/add-feedback", { state: { mode: "edit", doc: c._raw } })}
                        >
                          <i className="fas fa-edit" /> Edit
                        </button>

                        {confirmId === c.id ? (
                          <>
                            <button className="mf-btn--pill mf-btn--red" onClick={() => onDelete(c.id, "complaint")}>
                              Confirm
                            </button>
                            <button className="mf-btn--pill mf-btn--red" onClick={() => setConfirmId(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button className="mf-btn--pill mf-btn--red" onClick={() => setConfirmId(c.id)}>
                            <i className="fas fa-trash" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
