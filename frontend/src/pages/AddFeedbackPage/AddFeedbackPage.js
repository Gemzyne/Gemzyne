import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AddFeedbackPage.css";
import { apiRequest } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";

const AddFeedbackPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation() || {};
  const isEdit = state?.mode === "edit";
  const editDoc = state?.doc || null;

  const { me } = useUser();

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

  // Prefill from logged-in user
  useEffect(() => {
    if (!me) return;
    let f = "", l = "";
    if (me.fullName && typeof me.fullName === "string") {
      const parts = me.fullName.trim().split(/\s+/);
      if (parts.length === 1) f = parts[0];
      else if (parts.length > 1) { f = parts[0]; l = parts.slice(1).join(" "); }
    }
    setFirstName((prev) => prev || f || "");
    setLastName((prev)  => prev || l || "");
    setEmail((prev)     => prev || me.email || "");
    setPhone((prev)     => prev || me.phone || "");
  }, [me]);

  // Particles (unique container id)
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
        window.pJSDom.forEach((p) => { try { p?.pJS?.fn?.vendors?.destroypJS?.(); } catch {} });
        window.pJSDom = [];
      }
    };
    ensureParticles().then(() => {
      destroyParticles();
      window.particlesJS("af-particles", {
        particles: {
          number: { value: 80, density: { enable: true, value_area: 800 } },
          color: { value: "#d4af37" },
          shape: { type: "polygon", polygon: { nb_sides: 6 } },
          opacity: { value: 0.3, random: true },
          size: { value: 3, random: true },
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
      setSuccessDescription("Your review has been submitted successfully. It will be published after verification.");
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

  const onSubmit = async (e) => {
    e.preventDefault();

    const effectiveFirst = me?.fullName ? (me.fullName.split(/\s+/)[0] || firstName) : firstName;
    const effectiveLast  = me?.fullName ? (me.fullName.split(/\s+/).slice(1).join(" ") || lastName) : lastName;
    const effectiveEmail = me?.email || email;
    const effectivePhone = me?.phone ?? phone;

    if (categories.length === 0) return alert("Please select at least one category.");
    if (type === "review" && rating === 0) return alert("Please provide an overall rating.");
    if (!feedbackText.trim()) return alert("Please enter your feedback.");

    const payload = {
      type,
      user: me?._id,
      firstName: effectiveFirst,
      lastName: effectiveLast,
      email: effectiveEmail,
      phone: effectivePhone,
      productName: product || undefined,
      categories,
      feedbackText,
      images: [],
      rating: type === "review" ? rating : undefined,
      complaintCategory: type === "complaint" ? (editDoc?.complaintCategory || categories[0] || "other") : undefined,
      orderId: type === "complaint" ? editDoc?.orderId : undefined,
      orderDate: type === "complaint" ? editDoc?.orderDate : undefined,
      status: type === "complaint" ? editDoc?.status : undefined,
    };

    try {
      if (isEdit && editDoc?._id) {
        await apiRequest(`/api/feedback/${editDoc._id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiRequest("/api/feedback", { method: "POST", body: JSON.stringify(payload) });
      }
      setSubmitted(true);
      setTimeout(() => navigate("/my-feedback"), 600);
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
      document.getElementById("feedbackFormReact")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="addfeedback-root">
      {/* Particles */}
      <div id="af-particles" />

      {/* Shared site header (sticky handled by the component’s own CSS) */}
      <Header />

      {/* Page Header */}
      <section className="af-page-header">
        <h1>{isEdit ? "Edit Your Feedback" : "Share Your Feedback"}</h1>
        <p>We value your opinion and are committed to improving our service</p>
      </section>

      {/* Type selector */}
      <div className="af-type-selector">
        <button
          type="button"
          className={`af-type-btn ${type === "review" ? "active" : ""}`}
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
          className={`af-type-btn ${type === "complaint" ? "active" : ""}`}
          onClick={() => switchType("complaint")}
          disabled={isEdit}
          style={isEdit ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
        >
          <i className="fas fa-exclamation-circle" />
          <h3>Submit a Complaint</h3>
          <p>Let us know about any issues you've encountered</p>
        </button>
      </div>

      {/* Form */}
      <div className="af-form-wrap">
        {!submitted ? (
          <form className="af-form" id="feedbackFormReact" onSubmit={onSubmit}>
            {/* Personal (read-only from profile) */}
            <div className="af-section">
              <h3 className="af-section-title"><i className="fas fa-user-circle" />Personal Information</h3>
              <div className="af-row">
                <div className="af-group">
                  <label htmlFor="firstName">First Name</label>
                  <input id="firstName" value={firstName} readOnly />
                </div>
                <div className="af-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input id="lastName" value={lastName} readOnly />
                </div>
              </div>
              <div className="af-row">
                <div className="af-group">
                  <label htmlFor="email">Email Address</label>
                  <input id="email" type="email" value={email} readOnly />
                </div>
                <div className="af-group" id="phoneField">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" value={phone} readOnly />
                </div>
              </div>
              <p className="af-help">These details come from your account profile.</p>
            </div>

            {/* Product & Category (side-by-side on wide) */}
            <div className="af-row af-row--balanced">
              <div className="af-section">
                <h3 className="af-section-title"><i className="fas fa-gem" />Product</h3>
                <div className="af-group">
                  <label htmlFor="product">Product Name (Optional)</label>
                  <input
                    id="product"
                    placeholder="Enter product name or description"
                    value={product}
                    onChange={(e)=>setProduct(e.target.value)}
                  />
                </div>
              </div>

              <div className="af-section">
                <h3 className="af-section-title"><i className="fas fa-tag" />Category</h3>
                <div className="af-group">
                  <label>Select one or more categories *</label>
                  <div className="af-cats">
                    {categoryOptions.map((opt) => {
                      const selected = categories.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={`af-cat ${selected ? "selected" : ""}`}
                          onClick={() => toggleCategory(opt.key)}
                        >
                          <div className="af-cat-ico"><i className={opt.icon} /></div>
                          <div className="af-cat-name">{opt.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Rating (only for reviews) */}
            {type === "review" && (
              <div className="af-section" id="ratingSection">
                <h3 className="af-section-title"><i className="fas fa-star" />Your Rating</h3>
                <div className="af-group">
                  <label>Overall Rating *</label>
                  <div className="af-stars">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <span
                        key={n}
                        className={`af-star ${rating >= n ? "active" : ""}`}
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
            <div className="af-section">
              <h3 className="af-section-title"><i className="fas fa-edit" />Your Feedback</h3>
              <div className="af-group">
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

            <div className="af-submit">
              <button type="submit" className="af-submit-btn">
                <i className="fas fa-paper-plane" />
                {isEdit ? "Update Feedback" : "Submit Feedback"}
              </button>
            </div>
          </form>
        ) : (
          <div className="af-success">
            <i className="fas fa-check-circle" />
            <h3>{successTitle}</h3>
            <p>{successDescription}</p>
            <button className="af-btn" onClick={() => navigate("/my-feedback")}>
              Go to My Feedback
            </button>
            {!isEdit && (
              <button className="af-btn" style={{ marginLeft: 10 }} onClick={submitAnother}>
                Submit Another Feedback
              </button>
            )}
          </div>
        )}
      </div>

      {/* Shared site footer */}
      <Footer />
    </div>
  );
};

export default AddFeedbackPage;
