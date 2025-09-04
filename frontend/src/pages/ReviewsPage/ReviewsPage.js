import React, { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "./ReviewsPage.css";

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

    // destroy previous instances (in case of navigating back)
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
          move: {
            enable: true,
            speed: 2,
            random: true,
            straight: false,
            out_mode: "out",
          },
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

  // ---- Static reviews ----
  const reviews = useMemo(
    () => [
      {
        initials: "SJ",
        name: "Sarah Johnson",
        date: "October 15, 2023",
        stars: 5,
        tags: ["Quality", "Service"],
        text:
          "Absolutely stunning blue sapphire! The color is even more vibrant in person than in the photos. The cut is perfect and it sparkles from every angle. Excellent customer service throughout the process.",
        gemImg:
          "https://images.unsplash.com/photo-1599643478517-a313f52cc3c3?auto=format&fit=crop&w=1074&q=80",
        gemDesc: "Royal Blue Sapphire • 3.25 Carat • Oval Cut",
        helpful: 12,
      },
      {
        initials: "MC",
        name: "Michael Chen",
        date: "October 12, 2023",
        stars: 4,
        tags: ["Shipping", "Documentation"],
        text:
          "Beautiful ruby with excellent clarity. The cut is precise and the color is a rich red. Shipping was faster than expected. The only reason I'm not giving 5 stars is that the certificate took a few extra days to arrive.",
        gemImg:
          "https://images.unsplash.com/photo-1605102106749-5b935d968c56?auto=format&fit=crop&w=1170&q=80",
        gemDesc: "Premium Ruby • 2.75 Carat • Cushion Cut",
        helpful: 5,
      },
      {
        initials: "EW",
        name: "Emma Wilson",
        date: "October 8, 2023",
        stars: 5,
        tags: ["Quality", "Service", "Packaging"],
        text:
          "This Padparadscha sapphire is exceptional! The unique color is exactly as described and the cut highlights its beauty perfectly. The customer service team was incredibly helpful in answering all my questions. Highly recommend!",
        gemImg:
          "https://images.unsplash.com/photo-1572314493769-03a6b2672354?auto=format&fit=crop&w=1170&q=80",
        gemDesc: "Padparadscha Sapphire • 2.10 Carat • Emerald Cut",
        helpful: 8,
      },
      {
        initials: "RK",
        name: "Robert Kim",
        date: "October 5, 2023",
        stars: 4,
        tags: ["Value", "Authenticity"],
        text:
          "The Alexandrite is beautiful and changes color nicely in different lighting. The certificate of authenticity was detailed and gave me confidence in my purchase. While it's a bit pricey, the quality justifies the cost.",
        gemImg:
          "https://images.unsplash.com/photo-1631603086892-5e4fbe4e9fd9?auto=format&fit=crop&w=1074&q=80",
        gemDesc: "Alexandrite • 2.50 Carat • Round Cut",
        helpful: 6,
      },
      {
        initials: "LP",
        name: "Lisa Patel",
        date: "October 3, 2023",
        stars: 5,
        tags: ["Packaging", "Service"],
        text:
          "Exceptional service! The packaging was luxurious and secure. The gemstone arrived in a beautiful presentation box that made it feel like a special gift. The customer service representative was knowledgeable and helped me choose the perfect stone.",
        gemImg:
          "https://images.unsplash.com/photo-1606760227093-899b6c7e5eeb?auto=format&fit=crop&w=1074&q=80",
        gemDesc: "Cat's Eye Chrysoberyl • 1.85 Carat • Cabochon Cut",
        helpful: 9,
      },
    ],
    []
  );

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

          {reviews.map((r, idx) => (
            <div className="review-item" key={idx}>
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
              <span className="stat-value">247</span>
            </div>
            <div className="stat-item">
              <span>Average Rating</span>
              <span className="stat-value">4.7</span>
            </div>
            <div className="stat-item">
              <span>Positive Reviews</span>
              <span className="stat-value">92%</span>
            </div>
            <div className="stat-item">
              <span>Response Rate</span>
              <span className="stat-value">98%</span>
            </div>

            <div className="rating-summary">
              <h4 style={{ color: "#d4af37", marginBottom: 15 }}>
                Rating Distribution
              </h4>

              {[
                { label: "5 Stars", width: "75%", count: 185 },
                { label: "4 Stars", width: "17%", count: 42 },
                { label: "3 Stars", width: "5%", count: 12 },
                { label: "2 Stars", width: "2%", count: 5 },
                { label: "1 Star", width: "1%", count: 3 },
              ].map((row) => (
                <div className="rating-bar" key={row.label}>
                  <span className="rating-label">{row.label}</span>
                  <div className="rating-progress">
                    <div
                      className="rating-progress-fill"
                      style={{ width: row.width }}
                    />
                  </div>
                  <span className="rating-count">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom buttons — now Links, not modals */}
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

