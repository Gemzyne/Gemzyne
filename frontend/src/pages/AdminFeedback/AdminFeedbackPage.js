import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../../lib/api";
import "./AdminFeedbackPage.css";

const initials = (first = "", last = "", email = "") => {
  const a = (first || "").trim()[0];
  const b = (last || "").trim()[0];
  if (a || b) return `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "GG";
};
const fmtDate = (iso) => {
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

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);


export default function AdminFeedbackPage() {
  // UI state
  const [view, setView] = useState("reviews"); // "reviews" | "complaints"
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // raw feedback from API
  const [error, setError] = useState("");

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

  // Header scroll
  useEffect(() => {
    const header = document.getElementById("adminfb-header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiRequest("/api/feedback?visibility=all", { method: "GET" });
        if (mounted) setItems(Array.isArray(data?.feedback) ? data.feedback : []);
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load feedback");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Soft Delete (admin/seller hides from public)
const handleDelete = async (id) => {
  if (!window.confirm("Hide this item from public view?")) return;
  try {
    await apiRequest(`/api/feedback/${id}`, { method: "DELETE" });
    // Instead of removing from state, mark hidden
    setItems((prev) =>
     prev.map((x) => (x._id === id ? { ...x, isAdminHidden: true } : x))
   );
  } catch (e) {
    alert(e.message || "Failed to hide");
  }
};

// Restore (admin can unhide later)
const handleRestore = async (id) => {
  try {
    await apiRequest(`/api/feedback/${id}/restore`, { method: "PATCH" });
    setItems((prev) =>
      prev.map((x) => (x._id === id ? { ...x, isAdminHidden: false } : x))
    );
  } catch (e) {
    alert(e.message || "Failed to restore");
  }
};

  // Derived lists
  const reviews = useMemo(() => items.filter((i) => i.type === "review"), [items]);
  const complaints = useMemo(
    () => items.filter((i) => i.type === "complaint"),
    [items]
  );

  const categoryMatch = (fb) => {
    if (category === "all") return true;
    if (fb.type === "complaint") {
      return (
        (fb.complaintCategory && fb.complaintCategory === category) ||
        (Array.isArray(fb.categories) && fb.categories.includes(category))
      );
    }
    return Array.isArray(fb.categories) && fb.categories.includes(category);
  };

  const shown = (view === "reviews" ? reviews : complaints).filter(categoryMatch);

  // Sidebar stats + rating distribution
  const { totalReviews, totalComplaints, avgRating, dist } = useMemo(() => {
    const totalReviews = reviews.length;
    const totalComplaints = complaints.length;
    const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const avgRating = totalReviews ? (sum / totalReviews).toFixed(1) : "0.0";
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const k = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0)));
      dist[k] += 1;
    });
    return { totalReviews, totalComplaints, avgRating, dist };
  }, [reviews, complaints]);

  const bars = [
    { label: "5 Stars", count: dist[5] || 0 },
    { label: "4 Stars", count: dist[4] || 0 },
    { label: "3 Stars", count: dist[3] || 0 },
    { label: "2 Stars", count: dist[2] || 0 },
    { label: "1 Star", count: dist[1] || 0 },
  ];
  const maxCount = Math.max(1, ...bars.map((b) => b.count));

  return (
    <div className="adminfb-root">
      {/* Particles */}
      <div id="particles-js" />

      {/* Header */}
      <header id="adminfb-header">
        <div className="logo">GemZyne</div>
        <nav className="nav-links">
          <a href="#!">Dashboard</a>
          <a href="#!">Products</a>
          <a href="#!">Orders</a>
          <a href="#!">Customers</a>
          <a href="#!">Settings</a>
        </nav>
        <div className="header-actions">
          <i className="fas fa-bell">
            <span className="cart-count">5</span>
          </i>
          <i className="fas fa-user-circle" />
          <button className="btn">Log Out</button>
        </div>
      </header>

      {/* Page Header */}
      <section className="page-header">
        <h1>Feedback Management</h1>
        <p>Manage customer reviews and complaints by category</p>
      </section>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-group">
          <span className="filter-label">Filter by Category:</span>
          <select
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="quality">Quality</option>
            <option value="website">Website Issues</option>
            <option value="shipping">Shipping</option>
            <option value="packaging">Packaging</option>
            <option value="value">Value</option>
            <option value="authenticity">Authenticity</option>
          </select>
        </div>

        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${view === "reviews" ? "active" : ""}`}
            onClick={() => setView("reviews")}
          >
            Reviews
          </button>
          <button
            className={`view-toggle-btn ${view === "complaints" ? "active" : ""}`}
            onClick={() => setView("complaints")}
          >
            Complaints
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-container">
        {/* List Card */}
        <div className="reviews-card">
          <div className="card-header">
            <h3>{view === "reviews" ? "Customer Reviews" : "Customer Complaints"}</h3>
            {!loading && (
              <span>
                Showing {shown.length} of{" "}
                {view === "reviews" ? reviews.length : complaints.length}{" "}
                {view}
              </span>
            )}
          </div>

          {loading && (
            <div className="review-item">
              <p>Loading…</p>
            </div>
          )}
          {!!error && !loading && (
            <div className="review-item">
              <p style={{ color: "#ff6b6b" }}>{error}</p>
            </div>
          )}
          {!loading && !error && shown.length === 0 && (
            <div className="review-item">
              <p>No items found for this filter.</p>
            </div>
          )}

          {!loading &&
            !error &&
            shown.map((f) => {
              const isReview = f.type === "review";
              const rowClass = isReview ? "review-item" : "complaint-item";
              const name =
                [f.firstName, f.lastName].filter(Boolean).join(" ") ||
                f.email ||
                "Anonymous";
              const cats = [
                ...(isReview ? f.categories || [] : [f.complaintCategory, ...(f.categories || [])])
                ]
                   .filter(Boolean)
                   .map(cap); // use helper we added at top

              const uniqueCats = [...new Set(cats)];
              const rating = Number(f.rating) || 0;
              const orderInfo =
                f.orderId ? ` • Order #${f.orderId}` : f.productName || f.productId ? ` • ${f.productName || f.productId}` : "";

              return (
                <div className={rowClass} key={f._id}>
                  <div className="review-header">
                    <div className="reviewer-info">
                      <div className="reviewer-avatar">
                        {initials(f.firstName, f.lastName, f.email)}
                      </div>
                      <div className="reviewer-details">
                        <h4>{name}</h4>
                        <p>
                          {fmtDate(f.createdAt)}
                          {orderInfo}
                        </p>
                      </div>
                    </div>
                    <div className="review-rating">
                      {isReview
                        ? "★★★★★".slice(0, rating) +
                          "☆☆☆☆☆".slice(0, 5 - rating)
                        : "—"}
                    </div>
                  </div>

                  <div>
                   {uniqueCats.map((c) => (
                     <span
                      key={`${f._id}-${c}`}
                      className={isReview ? "review-category" : "complaint-category"}
                     >
                    {c}
                    </span>
                    ))}
                  </div>

                  <div className="review-content">
                    <p>{f.feedbackText}</p>
                  </div>

                  {(f.productName || f.productId) && (
                    <div className="review-gem">
                      {/* You can add image URLs to FeedbackModel later; left empty now */}
                      {/* <img src="..." alt="" /> */}
                      <p>{f.productName || f.productId}</p>
                    </div>
                  )}

                   <div className="review-actions">
                    {isReview ? (
                    <>
                      <button className="review-action-btn">
                        <i className="fas fa-reply" /> Reply
                      </button>
                      <button className="review-action-btn">
                        <i className="fas fa-flag" /> Flag
                      </button>
                    </>
                ) : (
                 <>
                <button className="review-action-btn">
                <i className="fas fa-reply" /> Respond
               </button>
               <button className="review-action-btn">
               <i className="fas fa-check-circle" /> Resolve
              </button>
                </>
               )}

                {f.isAdminHidden ? (
                  <button
                     className="review-action-btn"
                     onClick={() => handleRestore(f._id)}
                  >
                    <i className="fas fa-undo" /> Restore
                 </button>
                ) : (
                 <button
                     className="review-action-btn delete"
                     onClick={() => handleDelete(f._id)}
                >
                    <i className="fas fa-trash" /> Delete
                 </button>
               )}
                      
                  </div>

                </div>
              );
            })}
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-title">Feedback Overview</div>
          <div className="stats-container">
            <div className="stat-item">
              <span>Total Reviews</span>
              <span className="stat-value">{totalReviews}</span>
            </div>
            <div className="stat-item">
              <span>Total Complaints</span>
              <span className="stat-value complaints">{totalComplaints}</span>
            </div>
            <div className="stat-item">
              <span>Average Rating</span>
              <span className="stat-value">{avgRating}</span>
            </div>
            <div className="stat-item">
              <span>Response Rate</span>
              <span className="stat-value">98%</span>
            </div>
            <div className="stat-item">
              <span>Resolution Rate</span>
              <span className="stat-value">92%</span>
            </div>

            {/* Rating Distribution */}
            <div className="rating-summary">
              <h4 style={{ color: "#d4af37", marginBottom: 15 }}>Rating Distribution</h4>
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

            {/* Complaint categories demo (static — wire if you store counts) */}
            <div className="rating-summary" style={{ marginTop: 30 }}>
              <h4 style={{ color: "#ff6b81", marginBottom: 15 }}>Complaint Categories</h4>
              {[
                ["Quality", 40, 17],
                ["Website", 25, 11],
                ["Shipping", 20, 8],
                ["Packaging", 10, 4],
                ["Other", 5, 2],
              ].map(([label, pct, count]) => (
                <div className="rating-bar" key={label}>
                  <span className="rating-label">{label}</span>
                  <div className="rating-progress">
                    <div
                      className="rating-progress-fill"
                      style={{ width: `${pct}%`, background: "#ff6b81" }}
                    />
                  </div>
                  <span className="rating-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer>
        <div className="footer-grid">
          <div className="footer-col">
            <h3>GemZyne</h3>
            <p>
              Discover the world's most exceptional gemstones, curated for
              discerning collectors.
            </p>
          </div>
          <div className="footer-col">
            <h3>Collections</h3>
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
            <h3>Contact</h3>
            <ul>
              <li>Email: contact@gemzyne.com</li>
              <li>Phone: +1 234 567 890</li>
              <li>Address: 123 Gem Street, New York</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">&copy; 2025 GemZyne. All rights reserved.</div>
      </footer>
    </div>
  );
}
