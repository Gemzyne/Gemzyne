// src/pages/AddFeedbackPage/AddFeedbackPage.js
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./AddFeedbackPage.css";
import { apiRequest } from "../../lib/api";
import { useUser } from "../../context/UserContext"; // ⬅️ NEW

const AddFeedbackPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation() || {};
  const isEdit = state?.mode === "edit";
  const editDoc = state?.doc || null;

  // logged-in user (provided by your friend's user mgmt)
  const { me } = useUser(); // { _id, fullName, email, phone, ... }

  // form state
  const [type, setType] = useState("review"); // "review" | "complaint"
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [product,   setProduct]   = useState("");
  const [categories, setCategories] = useState([]);
  const [rating,    setRating]    = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [successTitle, setSuccessTitle] = useState("Thank You for Your Review!");
  const [successDescription, setSuccessDescription] = useState(
    "Your review has been submitted successfully. It will be published after verification."
  );

  // ===== Prefill from logged-in user (no backend changes needed) =====
  useEffect(() => {
    if (!me) return;
    // Try to split fullName into first/last (fallbacks included)
    let f = "", l = "";
    if (me.fullName && typeof me.fullName === "string") {
      const parts = me.fullName.trim().split(/\s+/);
      if (parts.length === 1) {
        f = parts[0];
      } else if (parts.length > 1) {
        f = parts[0];
        l = parts.slice(1).join(" ");
      }
    }
    setFirstName((prev) => prev || f || "");
    setLastName((prev)  => prev || l || "");
    setEmail((prev)     => prev || me.email || "");
    setPhone((prev)     => prev || me.phone || "");
  }, [me]);

  // particles
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
          opacity: { value: 0.3, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false } },
          size: { value: 3, random: true, anim: { enable: true, speed: 3, size_min: 0.1, sync: false } },
          line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.2, width: 1 },
          move: { enable: true, speed: 2, random: true, out_mode: "out" }
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true },
          modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } } }
        },
        retina_detect: true
      });
    });
    return () => destroyParticles();
  }, []);

  // header scroll
  useEffect(() => {
    const header = document.getElementById("addfeedback-header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // categories UI
  const categoryOptions = useMemo(
    () => [
      { key: "quality",      icon: "fas fa-gem",            label: "Quality" },
      { key: "website",      icon: "fas fa-desktop",        label: "Website Issues" },
      { key: "shipping",     icon: "fas fa-shipping-fast",  label: "Shipping" },
      { key: "packaging",    icon: "fas fa-gift",           label: "Packaging" },
      { key: "value",        icon: "fas fa-coins",          label: "Value" },
      { key: "authenticity", icon: "fas fa-certificate",    label: "Authenticity" },
    ],
    []
  );

  const toggleCategory = (key) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const switchType = (newType) => {
    if (isEdit) return;
    setType(newType);
    if (newType === "review") {
      setSuccessTitle("Thank You for Your Review!");
      setSuccessDescription(
        "Your review has been submitted successfully. It will be published after verification."
      );
    } else {
      setSuccessTitle("Complaint Submitted Successfully!");
      setSuccessDescription(
        `We've received your complaint and will respond within 24–48 hours. Your reference number is: LG-${Math.floor(1000 + Math.random() * 9000)}`
      );
    }
  };

  // Prefill when editing
  useEffect(() => {
    if (!isEdit || !editDoc) return;
    setType(editDoc.type || "review");
    setFirstName(editDoc.firstName || firstName);
    setLastName(editDoc.lastName || lastName);
    setEmail(editDoc.email || email);
    setPhone(editDoc.phone || phone);
    setProduct(editDoc.productName || editDoc.productId || "");
    setCategories(Array.isArray(editDoc.categories) ? editDoc.categories : []);
    setRating(editDoc.type === "review" ? editDoc.rating || 0 : 0);
    setFeedbackText(editDoc.feedbackText || "");

    if (editDoc.type === "review") {
      setSuccessTitle("Review Updated!");
      setSuccessDescription("Your review has been updated successfully.");
    } else {
      setSuccessTitle("Complaint Updated!");
      setSuccessDescription("Your complaint has been updated successfully.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editDoc]);

  // submit
  const onSubmit = async (e) => {
    e.preventDefault();

    // Use profile values if present; otherwise fall back to the form inputs
    const effectiveFirst = me?.fullName ? (me.fullName.split(/\s+/)[0] || firstName) : firstName;
    const effectiveLast  = me?.fullName ? (me.fullName.split(/\s+/).slice(1).join(" ") || lastName) : lastName;
    const effectiveEmail = me?.email || email;
    const effectivePhone = me?.phone ?? phone;

    if (categories.length === 0) {
      alert("Please select at least one category.");
      return;
    }
    if (type === "review" && rating === 0) {
      alert("Please provide an overall rating.");
      return;
    }
    if (!feedbackText.trim()) {
      alert("Please enter your feedback.");
      return;
    }

    // Build payload as your controller expects
    const payload = {
      type, // "review" | "complaint"
      user: me?._id, // ⬅️ optional; backend will ignore if not in schema/controller
      firstName: effectiveFirst,
      lastName: effectiveLast,
      email: effectiveEmail,
      phone: effectivePhone,
      productName: product || undefined,
      categories,
      feedbackText,
      images: [],
      rating: type === "review" ? rating : undefined,
      complaintCategory:
        type === "complaint"
          ? (editDoc?.complaintCategory || categories[0] || "other")
          : undefined,
      orderId: type === "complaint" ? editDoc?.orderId : undefined,
      orderDate: type === "complaint" ? editDoc?.orderDate : undefined,
      status: type === "complaint" ? editDoc?.status : undefined,
    };

    try {
      if (isEdit && editDoc?._id) {
        await apiRequest(`/api/feedback/${editDoc._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/feedback", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setSubmitted(true);
      setTimeout(() => {
        navigate("/my-feedback");
      }, 600);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to submit. Please try again.");
    }
  };

  const submitAnother = () => {
    setSubmitted(false);
    setType("review");
    setProduct(""); setCategories([]); setRating(0); setFeedbackText("");
    setSuccessTitle("Thank You for Your Review!");
    setSuccessDescription("Your review has been submitted successfully. It will be published after verification.");
    setTimeout(() => {
      const form = document.getElementById("feedbackFormReact");
      if (form) form.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="addfeedback-root">
      <div id="particles-js" />

      <header id="addfeedback-header">
        <div className="logo">GemZyne</div>
        <nav className="nav-links">
          <Link to="/mainhome">Home</Link>
          <Link to="/collection">Collection</Link>
          <Link to="/auction">Auction</Link>
          <Link to="/about">About</Link>
          <Link to="/reviews">Review & Feedback</Link>
        </nav>
        <div className="header-actions">
          <i className="fas fa-search" />
          <i className="fas fa-user" />
          <i className="fas fa-shopping-bag" />
        </div>
      </header>

      <section className="page-header">
        <h1>{isEdit ? "Edit Your Feedback" : "Share Your Feedback"}</h1>
        <p>We value your opinion and are committed to improving our service</p>
      </section>

      <div className="feedback-type-selector">
        <button
          type="button"
          className={`feedback-type-btn ${type === "review" ? "active" : ""}`}
          onClick={() => switchType("review")}
          disabled={isEdit}
          style={isEdit ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
        >
          <i className="fas fa-star" />
          <h3>Write a Review</h3>
          <p>Share your positive experience with our products</p>
        </button>
        <button
          type="button"
          className={`feedback-type-btn ${type === "complaint" ? "active" : ""}`}
          onClick={() => switchType("complaint")}
          disabled={isEdit}
          style={isEdit ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
        >
          <i className="fas fa-exclamation-circle" />
          <h3>Submit a Complaint</h3>
          <p>Let us know about any issues you've encountered</p>
        </button>
      </div>

      <div className="form-container">
        {!submitted ? (
          <form className="feedback-form" id="feedbackFormReact" onSubmit={onSubmit}>
            {/* Personal (read-only from profile) */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-user-circle"></i>
                Personal Information
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input id="firstName" value={firstName} readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input id="lastName" value={lastName} readOnly />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input id="email" type="email" value={email} readOnly />
                </div>
                <div className="form-group" id="phoneField">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" value={phone} readOnly />
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
                These details come from your account profile.
              </p>
            </div>

            {/* Product */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-gem"></i>
                Product Information
              </h3>
              <div className="form-group">
                <label htmlFor="product">Product Name (Optional)</label>
                <input
                  id="product"
                  placeholder="Enter product name or description"
                  value={product}
                  onChange={(e)=>setProduct(e.target.value)}
                />
              </div>
            </div>

            {/* Category */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-tag"></i>
                Category
              </h3>
              <div className="form-group">
                <label>Select one or more categories *</label>
                <div className="category-selector">
                  {categoryOptions.map((opt) => {
                    const selected = categories.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        className={`category-item ${selected ? "selected" : ""}`}
                        onClick={() => toggleCategory(opt.key)}
                      >
                        <div className="category-icon"><i className={opt.icon} /></div>
                        <div className="category-name">{opt.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rating (only for reviews) */}
            {type === "review" && (
              <div className="form-section" id="ratingSection">
                <h3 className="form-section-title">
                  <i className="fas fa-star"></i>
                  Your Rating
                </h3>
                <div className="form-group">
                  <label>Overall Rating *</label>
                  <div className="star-rating">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <span
                        key={n}
                        className={`star ${rating >= n ? "active" : ""}`}
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
            )}

            {/* Feedback */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-edit"></i>
                Your Feedback
              </h3>
              <div className="form-group">
                <label htmlFor="feedbackText">Your Feedback *</label>
                <textarea
                  id="feedbackText"
                  placeholder={type === "review"
                    ? "Share your experience with this product..."
                    : "Please describe your issue in detail..."}
                  value={feedbackText}
                  onChange={(e)=>setFeedbackText(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-submit">
              <button type="submit" className="submit-btn">
                <i className="fas fa-paper-plane" />
                {isEdit ? "Update Feedback" : "Submit Feedback"}
              </button>
            </div>
          </form>
        ) : (
          <div className="success-message">
            <i className="fas fa-check-circle" />
            <h3>{successTitle}</h3>
            <p>{successDescription}</p>
            <button className="btn" onClick={() => navigate("/my-feedback")}>
              Go to My Feedback
            </button>
            {!isEdit && (
              <button className="btn" style={{ marginLeft: 10 }} onClick={submitAnother}>
                Submit Another Feedback
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer>
        <div className="footer-grid">
          <div className="footer-col">
            <h3>GemZyne</h3>
            <p>Discover the world's most exceptional gemstones, curated for discerning collectors.</p>
          </div>
          <div className="footer-col">
            <h3>Collections</h3>
            <ul>
              <li><a href="#!"><i className="fas fa-gem" /> Sapphires</a></li>
              <li><a href="#!"><i className="fas fa-gem" /> Rubies</a></li>
              <li><a href="#!"><i className="fas fa-gem" /> Emeralds</a></li>
              <li><a href="#!"><i className="fas fa-gem" /> Diamonds</a></li>
              <li><a href="#!"><i className="fas fa-gem" /> Rare Gems</a></li>
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
};

export default AddFeedbackPage;
