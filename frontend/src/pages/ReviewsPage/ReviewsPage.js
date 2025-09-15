// src/pages/ReviewsPage/ReviewsPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./ReviewsPage.css";
import { apiRequest } from "../../lib/api";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1606760227093-899b6c7e5eeb?auto=format&fit=crop&w=800&q=80";

function initialsFromName(first = "", last = "", email = "") {
  const a = (first || "").trim()[0];
  const b = (last || "").trim()[0];
  if (a || b) return `${a ?? ""}${b ?? ""}`.toUpperCase();
  // fallback to email initials
  if (email) return email.slice(0, 2).toUpperCase();
  return "GG";
}

function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

const ReviewsPage = () => {
  // ---- Particles.js loader & init ----
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
          events: {
            onhover: { enable: true, mode: "grab" },
            onclick: { enable: true, mode: "push" },
            resize: true,
          },
          modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } } },
        },
        retina_detect: true,
      });
    });

    return () => destroyParticles();
  }, []);

  // ---- Header scroll effect ----
  useEffect(() => {
    const header = document.getElementById("reviews-header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---- Fetch reviews from API ----
  const [reviews, setReviews] = useState([]);       // normalized for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiRequest("/api/reviews"); // GET (success:true,reviews:[...])
        const items = (data?.reviews ?? []).map((r) => ({
          id: r._id,
          initials: initialsFromName(r.firstName, r.lastName, r.email),
          name:
            [r.firstName, r.lastName].filter(Boolean).join(" ") ||
            r.email ||
            "Anonymous",
          date: formatDate(r.createdAt),
          stars: Number(r.rating) || 0,
          tags: (r.categories || []).map((t) => capFirst(t)),
          text: r.reviewText || "",
          gemImg: (r.images && r.images[0]) || PLACEHOLDER_IMG,
          gemDesc:
            (r.productName
              ? `${r.productName}`
              : r.productId
              ? `${r.productId}`
              : "Gemstone") + (r.productId ? ` • ${r.productId}` : ""),
          helpful: 0, // you can wire this later
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

  // ---- Sidebar stats from live data ----
  const { total, avg, dist } = useMemo(() => {
    const total = reviews.length;
    const sum = reviews.reduce((s, r) => s + (r.stars || 0), 0);
    const avg = total ? (sum / total).toFixed(1) : "0.0";
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const k = Math.max(1, Math.min(5, Math.round(r.stars || 0)));
      dist[k] += 1;
    });
    return { total, avg, dist };
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
      <header id="reviews-header">
        <div className="logo">LUX GEMS</div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/collection">Collection</Link>
          <Link to="/about">About</Link>
          <Link to="/certification">Certification</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <div className="header-actions">
          <i className="fas fa-search" />
          <i className="fas fa-user" />
          <i className="fas fa-shopping-bag">
            <span className="cart-count">3</span>
          </i>
          <button className="btn">View Collection</button>
        </div>
      </header>

      {/* Page Header */}
      <section className="page-header">
        <h1>Customer Feedback</h1>
        <p>Read reviews and manage customer feedback</p>
      </section>

      {/* Main */}
      <div className="content-container">
        {/* Reviews */}
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
                  <span className="review-category" key={t}>
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

              <div className="review-actions">
                <button className="review-action-btn">
                  <i className="fas fa-thumbs-up" /> Helpful ({r.helpful})
                </button>
                <button className="review-action-btn">
                  <i className="fas fa-comment" /> Reply
                </button>
                <button className="review-action-btn">
                  <i className="fas fa-flag" /> Report
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-title">Feedback Overview</div>
          <div className="stats-container">
            <div className="stat-item">
              <span>Total Reviews</span>
              <span className="stat-value">{total}</span>
            </div>
            <div className="stat-item">
              <span>Average Rating</span>
              <span className="stat-value">{avg}</span>
            </div>
            {/* You can compute real “Positive Reviews %” if you want.
                For now, show percent of 4★ and 5★ */}
            <div className="stat-item">
              <span>Positive Reviews</span>
              <span className="stat-value">
                {total ? Math.round(((dist[4] + dist[5]) / total) * 100) : 0}%
              </span>
            </div>
            <div className="stat-item">
              <span>Response Rate</span>
              <span className="stat-value">98%</span>
            </div>

            <div className="rating-summary">
              <h4 style={{ color: "#d4af37", marginBottom: 15 }}>
                Rating Distribution
              </h4>

              {bars.map((row) => {
                const widthPct =
                  maxCount === 0 ? "0%" : `${(row.count / maxCount) * 100}%`;
                return (
                  <div className="rating-bar" key={row.label}>
                    <span className="rating-label">{row.label}</span>
                    <div className="rating-progress">
                      <div
                        className="rating-progress-fill"
                        style={{ width: widthPct }}
                      />
                    </div>
                    <span className="rating-count">{row.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom buttons */}
      <div className="action-buttons-bottom">
        <Link to="/add-review" className="action-btn">
          <i className="fas fa-star" /> Add Review
        </Link>
        <Link to="/add-complaint" className="action-btn secondary">
          <i className="fas fa-exclamation-circle" /> Add Complaint
        </Link>
      </div>

      {/* Footer */}
      <footer>
        <div className="footer-grid">
          <div className="footer-col">
            <h3>LUX GEMS</h3>
            <p>
              Discover the world&apos;s most exceptional gemstones, curated for
              discerning collectors.
            </p>
          </div>
          <div className="footer-col">
            <h3>Gemstones</h3>
            <ul>
              <li>
                <a href="#!">
                  <i className="fas fa-gem" /> Sapphires
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-gem" /> Rubies
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-gem" /> Emeralds
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-gem" /> Diamonds
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-gem" /> Rare Gems
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Information</h3>
            <ul>
              <li>
                <a href="#!">
                  <i className="fas fa-info-circle" /> About Us
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-certificate" /> Certification
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-leaf" /> Ethical Sourcing
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-book" /> Care Guide
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-question-circle" /> FAQ
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Contact</h3>
            <ul>
              <li>
                <a href="#!">
                  <i className="fas fa-map-marker-alt" /> 123 Diamond Street
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-phone" /> +1 (555) 123-4567
                </a>
              </li>
              <li>
                <a href="#!">
                  <i className="fas fa-envelope" /> contact@luxgems.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            &copy; 2023 LUX GEMS. All rights reserved. Premium Gemstone
            Collection.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ReviewsPage;
