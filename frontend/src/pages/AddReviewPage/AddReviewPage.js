import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "./AddReviewPage.css";
import { apiRequest } from "../../lib/api";


const AddReviewPage = () => {

  // ---------- Form State ----------
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]  = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [categories, setCategories] = useState([]);   // ["quality", "service", ...]
  const [images, setImages] = useState([]);           // File previews
  const [submitted, setSubmitted] = useState(false);

  // ---------- Particles ----------
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

  // ---------- Header scroll effect ----------
  useEffect(() => {
    const header = document.getElementById("addreview-header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---------- Categories ----------
  const categoryOptions = useMemo(() => ([
    { key: "quality",       icon: "fas fa-gem",             label: "Quality" },
    { key: "service",       icon: "fas fa-concierge-bell",  label: "Service" },
    { key: "shipping",      icon: "fas fa-shipping-fast",   label: "Shipping" },
    { key: "packaging",     icon: "fas fa-gift",            label: "Packaging" },
    { key: "value",         icon: "fas fa-coins",           label: "Value" },
    { key: "authenticity",  icon: "fas fa-certificate",     label: "Authenticity" },
  ]), []);

  const toggleCategory = (key) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ---------- Image Upload (preview only) ----------
  const onImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setImages((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (url) => {
    setImages((prev) => prev.filter((im) => im.url !== url));
    URL.revokeObjectURL(url);
  };

  // ---------- Submit ----------
const onSubmit = async (e) => {
  e.preventDefault();

  // Basic validations
  if (!firstName.trim() || !lastName.trim() || !email.trim()) {
    alert("Please fill in First Name, Last Name, and Email.");
    return;
  }
  if (rating === 0) {
    alert("Please provide an overall rating.");
    return;
  }
  if (categories.length === 0) {
    alert("Please select at least one review category.");
    return;
  }
  if (!reviewText.trim()) {
    alert("Please enter your review.");
    return;
  }

  try {
    const payload = {
      firstName,
      lastName,
      email,
      rating,
      categories,
      reviewText,
      images: [], // skipping uploads for now
      productId: "GEM-123",
      productName: "Ceylon Blue Sapphire"
    };

    const result = await apiRequest("/api/reviews", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log("Review saved:", result);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error("Error saving review:", err.message);
    alert("Failed to submit review. Please try again.");
  }
};


  const submitAnother = () => {
    setSubmitted(false);
    setFirstName("");
    setLastName("");
    setEmail("");
    setRating(0);
    setReviewText("");
    setCategories([]);
    images.forEach((im) => URL.revokeObjectURL(im.url));
    setImages([]);
    setTimeout(() => {
      const form = document.getElementById("addReviewForm");
      if (form) form.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="addreview-root">
      {/* Particles */}
      <div id="particles-js" />

      {/* Header */}
      <header id="addreview-header">
        <div className="logo">LUX GEMS</div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/collection">Collection</Link>
          <Link to="/about">About</Link>
          <Link to="/certification">Certification</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/reviews">Reviews</Link>
        </nav>
        <div className="header-actions">
          <i className="fas fa-search"></i>
          <i className="fas fa-user"></i>
          <i className="fas fa-shopping-bag"></i>
          <button className="btn">View Collection</button>
        </div>
      </header>

      {/* Page Header */}
      <section className="page-header">
        <h1>Share Your Experience</h1>
        <p>Your feedback helps us improve and assists other customers</p>
      </section>

      {/* Form or Success */}
      <div className="form-container">
        {!submitted ? (
          <form className="review-form" id="addReviewForm" onSubmit={onSubmit}>
            {/* Personal Information */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-user-circle"></i>
                Personal Information
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Review Category */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-tag"></i>
                Review Category
              </h3>

              <div className="form-group">
                <label>Select one or more categories that best describe your review *</label>
                <div className="category-selector">
                  {categoryOptions.map((opt) => (
                    <label
                       key={opt.key}
                       className={`category-item ${categories.includes(opt.key) ? "selected" : ""}`}
>
                       <input
                         type="checkbox"
                         checked={categories.includes(opt.key)}
                         onChange={() => toggleCategory(opt.key)}
                       />
                        <div className="category-icon">
                        <i className={opt.icon}></i>
                       </div>
                       <div className="category-name">{opt.label}</div>
                       </label>

                  ))}
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-star"></i>
                Your Rating
              </h3>

              <div className="form-group">
                <label>Overall Rating *</label>
                <div className="star-rating">
                  {[5,4,3,2,1].map((n) => (
                    <span
                      key={n}
                      className={`star ${rating >= n ? "active" : ""}`}
                      data-value={n}
                      onClick={() => setRating(n)}
                      role="button"
                      aria-label={`Rate ${n}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Content */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-edit"></i>
                Your Review
              </h3>

              <div className="form-group">
                <label htmlFor="reviewText">Your Review *</label>
                <textarea
                  id="reviewText"
                  placeholder="Share your experience with this product"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Upload Photos (Optional)</label>
                <div className="image-upload">
                  {/* Upload box */}
                  <label className="upload-box" htmlFor="imageUpload">
                    <i className="fas fa-plus"></i>
                    <span>Add Photo</span>
                  </label>
                  <input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    multiple
                    onChange={onImageChange}
                  />

                  {/* Previews */}
                  {images.map((im) => (
                    <div className="upload-preview" key={im.url}>
                      <img src={im.url} alt="preview" />
                      <span className="remove-image" onClick={() => removeImage(im.url)}>×</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="form-submit">
              <button type="submit" className="submit-btn">
                <i className="fas fa-paper-plane"></i>
                Submit Review
              </button>
            </div>
          </form>
        ) : (
          <div className="success-message">
            <i className="fas fa-check-circle"></i>
            <h3>Thank You for Your Feedback!</h3>
            <p>Your review has been submitted successfully. It will be published after verification.</p>
            <button className="btn" onClick={submitAnother}>Submit Another Review</button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer>
        <div className="footer-grid">
          <div className="footer-col">
            <h3>LUX GEMS</h3>
            <p>Discover the world's most exceptional gemstones, curated for discerning collectors.</p>
          </div>
          <div className="footer-col">
            <h3>Gemstones</h3>
            <ul>
              <li><a href="#!"><i className="fas fa-gem"></i> Sapphires</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Rubies</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Emeralds</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Diamonds</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Rare Gems</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Information</h3>
            <ul>
              <li><a href="#!"><i className="fas fa-info-circle"></i> About Us</a></li>
              <li><a href="#!"><i className="fas fa-certificate"></i> Certification</a></li>
              <li><a href="#!"><i className="fas fa-leaf"></i> Ethical Sourcing</a></li>
              <li><a href="#!"><i className="fas fa-book"></i> Care Guide</a></li>
              <li><a href="#!"><i className="fas fa-question-circle"></i> FAQ</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Contact</h3>
            <ul>
              <li><a href="#!"><i className="fas fa-map-marker-alt"></i> 123 Diamond Street</a></li>
              <li><a href="#!"><i className="fas fa-phone"></i> +1 (555) 123-4567</a></li>
              <li><a href="#!"><i className="fas fa-envelope"></i> contact@luxgems.com</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2023 LUX GEMS. All rights reserved. Premium Gemstone Collection.</p>
        </div>
      </footer>
    </div>
  );
};

export default AddReviewPage;
