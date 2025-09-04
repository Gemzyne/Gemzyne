import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./AddComplaintPage.css";

const AddComplaintPage = () => {
  // ----- Form state -----
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [product, setProduct]     = useState("");
  const [selectedCategory, setSelectedCategory] = useState(""); // "quality" | "shipping" | ...
  const [details, setDetails]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("0000");

  // ----- Particles -----
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
            value: 0.3, random: true,
            anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false }
          },
          size: {
            value: 3, random: true,
            anim: { enable: true, speed: 3, size_min: 0.1, sync: false }
          },
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

  // ----- Header scroll effect -----
  useEffect(() => {
    const header = document.getElementById("addcomplaint-header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ----- Category info (title + description) -----
  const categoryInfo = useMemo(() => ({
    quality: {
      title: "Product Quality Issue",
      description: "Please describe the issue with your gemstone's quality. Include details about any imperfections, color discrepancies, or other quality concerns."
    },
    shipping: {
      title: "Shipping Issue",
      description: "Please describe the problem you experienced with shipping. Include details about delays, damaged packaging, or other delivery concerns."
    },
    description: {
      title: "Inaccurate Description",
      description: "Please explain how the product differs from its description. Include specific details about what was inaccurate or misleading."
    },
    service: {
      title: "Customer Service Issue",
      description: "Please describe your experience with our customer service team. Include details about the representative you spoke with and the nature of the problem."
    },
    certification: {
      title: "Certification Problem",
      description: "Please describe the issue with your gemstone's certification. Include details about discrepancies or concerns with the documentation."
    },
    other: {
      title: "Other Complaint",
      description: "Please describe your issue in detail. We'll do our best to address your concerns and find an appropriate solution."
    }
  }), []);

  // ----- Submit -----
  const onSubmit = (e) => {
    e.preventDefault();

    // basic validations (mirror your HTML)
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      alert("Please fill in First Name, Last Name, and Email.");
      return;
    }
    if (!orderDate) {
      alert("Please select the Order Date.");
      return;
    }
    if (!selectedCategory) {
      alert("Please select a complaint category.");
      return;
    }
    if (!details.trim()) {
      alert("Please enter complaint details.");
      return;
    }

    // TODO: send to backend
    // const payload = { firstName, lastName, email, phone, orderDate, product, selectedCategory, details }
    // await fetch('/api/complaints', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })

    // success UI
    setRefNumber(String(Math.floor(1000 + Math.random() * 9000)));
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitAnother = () => {
    setSubmitted(false);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setOrderDate("");
    setProduct("");
    setSelectedCategory("");
    setDetails("");
    setTimeout(() => {
      const form = document.getElementById("complaintFormReact");
      if (form) form.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // Category card component
  const CategoryCard = ({ id, icon, title, desc }) => {
    const active = selectedCategory === id;
    return (
      <div
        className={`category-card ${active ? "active" : ""}`}
        onClick={() => setSelectedCategory(id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setSelectedCategory(id)}
      >
        <div className="category-icon"><i className={icon}></i></div>
        <div className="category-title">{title}</div>
        <div className="category-desc">{desc}</div>
      </div>
    );
  };

  return (
    <div className="addcomplaint-root">
      {/* Particles */}
      <div id="particles-js" />

      {/* Header */}
      <header id="addcomplaint-header">
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
        <h1>Submit a Complaint</h1>
        <p>We're here to help resolve any issues you've encountered</p>
      </section>

      {/* Form / Success */}
      <div className="form-container">
        {!submitted ? (
          <form className="complaint-form" id="complaintFormReact" onSubmit={onSubmit}>
            {/* Your Information */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-user-circle"></i>
                Your Information
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input id="firstName" type="text" value={firstName} onChange={(e)=>setFirstName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input id="lastName" type="text" value={lastName} onChange={(e)=>setLastName(e.target.value)} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-receipt"></i>
                Order Information
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="orderDate">Order Date *</label>
                  <input id="orderDate" type="date" value={orderDate} onChange={(e)=>setOrderDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="product">Product (if applicable)</label>
                  <input id="product" type="text" placeholder="Enter product name or description" value={product} onChange={(e)=>setProduct(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Complaint Category */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-exclamation-circle"></i>
                Complaint Category
              </h3>

              <p style={{color:"#b0b0b0", marginBottom: 20}}>Please select the category that best describes your issue:</p>

              <div className="complaint-categories">
                <CategoryCard
                  id="quality"
                  icon="fas fa-gem"
                  title="Product Quality"
                  desc="Issues with gemstone quality, appearance, or characteristics"
                />
                <CategoryCard
                  id="shipping"
                  icon="fas fa-shipping-fast"
                  title="Shipping Issue"
                  desc="Problems with delivery, packaging, or delays"
                />
                <CategoryCard
                  id="description"
                  icon="fas fa-file-alt"
                  title="Inaccurate Description"
                  desc="Product doesn't match the description or images"
                />
                <CategoryCard
                  id="service"
                  icon="fas fa-headset"
                  title="Customer Service"
                  desc="Problems with our support team or communication"
                />
                <CategoryCard
                  id="certification"
                  icon="fas fa-certificate"
                  title="Certification Issues"
                  desc="Problems with gemstone certification or documentation"
                />
                <CategoryCard
                  id="other"
                  icon="fas fa-question-circle"
                  title="Other Issue"
                  desc="Any other problem not listed here"
                />
              </div>
            </div>

            {/* Dynamic details (shows when a category is chosen) */}
            {selectedCategory && (
              <div className="complaint-details active">
                <h3 className="detail-title">{categoryInfo[selectedCategory].title}</h3>
                <p className="detail-description">{categoryInfo[selectedCategory].description}</p>

                <div className="form-group">
                  <label htmlFor="complaintDetailsText">Complaint Details *</label>
                  <textarea
                    id="complaintDetailsText"
                    placeholder="Please describe your issue in detail..."
                    value={details}
                    onChange={(e)=>setDetails(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Upload Supporting Photos (Optional)</label>
                  <div style={{marginTop: 10}}>
                    <label style={{display:"inline-flex", alignItems:"center", gap:8, padding:"10px 15px", background:"rgba(10,10,10,0.5)", borderRadius:8, cursor:"pointer"}}>
                      <i className="fas fa-image"></i>
                      Add Photos
                      <input type="file" accept="image/*" multiple style={{display:"none"}} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="form-submit">
              <button type="submit" className="submit-btn">
                <i className="fas fa-paper-plane"></i>
                Submit Complaint
              </button>
            </div>
          </form>
        ) : (
          <div className="success-message">
            <i className="fas fa-check-circle"></i>
            <h3>Complaint Submitted Successfully!</h3>
            <p>
              We've received your complaint and will respond within 24–48 hours.
              Your reference number is: <strong>LG-{refNumber}</strong>
            </p>
            <button className="btn" onClick={submitAnother}>Submit Another Complaint</button>
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

export default AddComplaintPage;
