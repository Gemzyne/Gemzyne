// src/pages/ReviewsPage/ReviewsPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ReviewsPage.css";
import { apiRequest } from "../../lib/api";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1606760227093-899b6c7e5eeb?auto=format&fit=crop&w=800&q=80";

function initialsFromName(first = "", last = "", email = "") {
  const a = (first || "").trim()[0];
  const b = (last || "").trim()[0];
  if (a || b) return `${a ?? ""}${b ?? ""}`.toUpperCase();
  return email ? email.slice(0, 2).toUpperCase() : "GG";
}
const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const ReviewsPage = () => {
  // Particles
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
          try {
            p?.pJS?.fn?.vendors?.destroypJS?.();
          } catch {}
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
          opacity: {
            value: 0.3,
            random: true,
            anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false },
          },
          size: {
            value: 3,
            random: true,
            anim: { enable: true, speed: 3, size_min: 0.1, sync: false },
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: "#d4af37",
            opacity: 0.2,
            width: 1,
          },
          move: { enable: true, speed: 2, random: true, out_mode: "out" },
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true },
          modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } } },
        },
        retina_detect: true,
      });
    });

    return () => destroyParticles();
  }, []);

  // Optional header scroll effect
  useEffect(() => {
    const header = document.querySelector("header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch reviews
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiRequest("/api/feedback?type=review");
        const list = Array.isArray(data?.feedback) ? data.feedback : [];
        const items = list.map((f) => ({
          id: f._id,
          initials: initialsFromName(f.firstName, f.lastName, f.email),
          name:
            [f.firstName, f.lastName].filter(Boolean).join(" ") ||
            f.email ||
            "Anonymous",
          date: formatDate(f.createdAt),
          stars: Number(f.rating) || 0,
          tags: (f.categories || []).map(capFirst),
          text: f.feedbackText || "",
          gemImg: (f.images && f.images[0]) || PLACEHOLDER_IMG,
          gemDesc: f.productName || f.productId || "Gemstone",
          helpful: 0,
        }));
        if (mounted) setReviews(items);
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load reviews");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Only keep rating distribution for sidebar
  const { dist } = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const k = Math.max(1, Math.min(5, Math.round(r.stars || 0)));
      dist[k] += 1;
    });
    return { dist };
  }, [reviews]);

  const bars = [
    { label: "5 Stars", count: dist[5] || 0 },
    { label: "4 Stars", count: dist[4] || 0 },
    { label: "3 Stars", count: dist[3] || 0 },
    { label: "2 Stars", count: dist[2] || 0 },
    { label: "1 Star", count: dist[1] || 0 },
  ];
  const maxCount = Math.max(1, ...bars.map((b) => b.count));

  return (
    <div className="reviews-root">
      {/* Particle Background */}
      <div id="particles-js" />

      {/* Header */}
      <Header />

      {/* Page Header */}
      <section className="page-header">
        <h1>Customer Feedback</h1>
        <p>Read reviews and manage customer feedback</p>
      </section>

      {/* Main */}
      <div className="content-container">
        {/* Reviews list */}
        <div className="reviews-card">
          <div className="card-header">
            <h3>Customer Reviews</h3>
          </div>

          {loading && (
            <div className="review-item">
              <p>Loading reviews…</p>
            </div>
          )}
          {!!error && !loading && (
            <div className="review-item">
              <p style={{ color: "#f88" }}>Error: {error}</p>
            </div>
          )}
          {!loading && !error && reviews.length === 0 && (
            <div className="review-item">
              <p>No reviews yet. Be the first to leave feedback!</p>
            </div>
          )}

          {reviews.map((r) => (
            <div className="review-item" key={r.id}>
              <div className="review-header">
                <div className="reviewer-info">
                  <div className="reviewer-avatar">{r.initials}</div>
                  <div className="reviewer-details">
                    <h4>{r.name}</h4>
                    <p>{r.date}</p>
                  </div>
                </div>
                <div className="review-rating">
                  {"★".repeat(r.stars)}
                  {"☆".repeat(5 - r.stars)}
                </div>
              </div>

              <div>
                {r.tags.map((t) => (
                  <span className="review-category" key={`${r.id}-${t}`}>
                    {t}
                  </span>
                ))}
              </div>

              <div className="review-content">
                <p>{r.text}</p>
              </div>

              <div className="review-gem">
                <img src={r.gemImg} alt="Gem" />
                <p>{r.gemDesc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar: ONLY rating distribution */}
       <aside className="sidebar">
  <div className="feedback-card">
    <div className="feedback-card__header">
      <h3>Feedback Overview</h3>
    </div>

    <div className="rating-summary">
      <h4 className="rating-summary__title">Rating Distribution</h4>

      {bars.map((row) => {
        const widthPct = maxCount === 0 ? "0%" : `${(row.count / maxCount) * 100}%`;
        return (
          <div className="rating-bar" key={row.label}>
            <span className="rating-label">{row.label}</span>
            <div className="rating-progress">
              <div className="rating-progress-fill" style={{ width: widthPct }} />
            </div>
            <span className="rating-count">{row.count}</span>
          </div>
        );
      })}
    </div>
  </div>
</aside>

      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ReviewsPage;
