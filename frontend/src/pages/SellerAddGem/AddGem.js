import React, { useEffect, useRef, useState, useMemo } from "react";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import "./AddGem.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const AddGem = () => {
  const particlesLoaded = useRef(false);

  // --- Prefill from query params (useful for a future "Edit" flow) ---
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialFromQuery = (key, fallback = "") => params.get(key) ?? fallback;

  // --- Form State ---
  const [gemName, setGemName] = useState(initialFromQuery("name"));
  const [gemId, setGemId] = useState(initialFromQuery("id"));
  const [gemType, setGemType] = useState(initialFromQuery("type", ""));
  const [carat, setCarat] = useState(initialFromQuery("carat", ""));
  const [dimensions, setDimensions] = useState(initialFromQuery("dimensions", ""));
  const [clarity, setClarity] = useState(initialFromQuery("clarity", ""));
  const [colorGrade, setColorGrade] = useState(initialFromQuery("color", ""));
  const [cutQuality, setCutQuality] = useState(initialFromQuery("cut", ""));
  const [shape, setShape] = useState(initialFromQuery("shape", ""));
  const [treatment, setTreatment] = useState(initialFromQuery("treatment", "unheated"));
  const [certification, setCertification] = useState(initialFromQuery("certification", ""));
  const [certNumber, setCertNumber] = useState(initialFromQuery("certNumber", ""));
  const [price, setPrice] = useState(initialFromQuery("price", ""));
  const [status, setStatus] = useState(initialFromQuery("status", "in-stock"));
  const [description, setDescription] = useState(initialFromQuery("description", ""));

  // Previews + original files
  const [gemImages, setGemImages] = useState([]);           // previews (data URLs)
  const [gemImageFiles, setGemImageFiles] = useState([]);   // File[]
  const [certImage, setCertImage] = useState(null);         // preview
  const [certImageFile, setCertImageFile] = useState(null); // File

  // Cancel confirmation modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Success toast (custom JS message)
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // --- Particles.js loader ---
  useEffect(() => {
    const initParticles = () => {
      if (window.particlesJS && !particlesLoaded.current) {
        window.particlesJS("particles-js", {
          particles: {
            number: { value: 60, density: { enable: true, value_area: 800 } },
            color: { value: "#d4af37" },
            shape: { type: "circle" },
            opacity: { value: 0.3, random: true },
            size: { value: 3, random: true },
            line_linked: {
              enable: true,
              distance: 150,
              color: "#d4af37",
              opacity: 0.1,
              width: 1,
            },
            move: { enable: true, speed: 1, direction: "none", random: true, straight: false, out_mode: "out", bounce: false },
          },
          interactivity: {
            detect_on: "canvas",
            events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true },
          },
          retina_detect: true,
        });
        particlesLoaded.current = true;
      }
    };

    if (!window.particlesJS) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      script.async = true;
      script.onload = initParticles;
      document.head.appendChild(script);
      return () => document.head.removeChild(script);
    } else {
      initParticles();
    }
  }, []);

  // --- Auto ID generation (only if no id provided via query) ---
  const generateGemId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `GM${timestamp}${randomNum}`;
  };
  useEffect(() => {
    if (!gemId || gemId.trim() === "") setGemId(generateGemId());
  }, [gemId]);

  // --- Image helpers ---
  const gemInputRef = useRef(null);
  const certInputRef = useRef(null);

  const onGemImagesSelected = (files) => {
    Array.from(files).forEach((file) => {
      if (!file.type.match("image.*")) return;
      // keep original file
      setGemImageFiles((prev) => [...prev, file]);
      // make preview
      const reader = new FileReader();
      reader.onload = (e) => setGemImages((prev) => [...prev, e.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const onCertImageSelected = (file) => {
    if (!file || !file.type.match("image.*")) return;
    setCertImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCertImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleGemDrop = (e) => {
    e.preventDefault();
    onGemImagesSelected(e.dataTransfer.files);
  };
  const handleCertDrop = (e) => {
    e.preventDefault();
    onCertImageSelected(e.dataTransfer.files?.[0]);
  };

  // --- Submit / Cancel ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // images required
    if (gemImageFiles.length < 1) {
      alert("Please upload at least one gem image (max 4).");
      return;
    }
    if (!certImageFile) {
      alert("Please upload the certificate image.");
      return;
    }

    const fd = new FormData();
    fd.append("name", gemName);
    fd.append("type", String(gemType || "").toLowerCase());
    fd.append("carat", String(carat));
    fd.append("dimensionsMm", dimensions);
    fd.append("colorGrade", colorGrade);
    fd.append("shape", shape);
    fd.append("clarityGrade", clarity);
    fd.append("cutQuality", cutQuality);
    fd.append("treatment", treatment);
    fd.append("certificationAgency", certification);
    fd.append("certificateNumber", certNumber);
    fd.append("priceUSD", String(price));
    fd.append("status", status === "in-stock" ? "in_stock" : "out_of_stock");
    fd.append("gemId", gemId);
    fd.append("description", description);

    gemImageFiles.forEach((file) => fd.append("images", file));
    fd.append("certificate", certImageFile);

    const token = localStorage.getItem("accessToken");

    const res = await fetch(`${API_BASE}/api/gems`, {
      method: "POST",
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Could not save gem:\n${res.status} ${txt || res.statusText}`);
      return;
    }

    // --- Centered popup + 1 second delay before redirect ---
    setShowSuccessToast(true);
    setTimeout(() => {
      window.location.href = "/seller/gems";
    }, 1000);
  };

  const handleCancel = () => setShowCancelConfirm(true);

  return (
    <div className="addgem-root">
      {/* Particle Background */}
      <div id="particles-js" />

      {/* Shared Header */}
      <Header />

      {/* Main Content */}
      <div className="form-container">
        <div className="form-header">
          <h1>Add New Gem to Inventory</h1>
          <p>Fill in the details below to add a new precious gem to your inventory</p>
        </div>

        <form className="gem-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gem-name">Gem Name *</label>
              <input
                id="gem-name"
                type="text"
                required
                placeholder="e.g., Royal Blue Sapphire"
                value={gemName}
                onChange={(e) => setGemName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Gem ID</label>
              <div className="generated-id">
                <i className="fas fa-hashtag" />
                Auto-generated ID: <span id="auto-gem-id">{gemId}</span>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gem-type">Gem Type *</label>
              <select
                id="gem-type"
                required
                value={gemType}
                onChange={(e) => setGemType(e.target.value)}
              >
                <option value="">Select Gem Type</option>
                <option value="diamond">Diamond</option>
                <option value="ruby">Ruby</option>
                <option value="sapphire">Sapphire</option>
                <option value="emerald">Emerald</option>
                <option value="topaz">Topaz</option>
                <option value="opal">Opal</option>
                <option value="amethyst">Amethyst</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="gem-carat">Carat Weight *</label>
              <input
                id="gem-carat"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="e.g., 2.5"
                value={carat}
                onChange={(e) => setCarat(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gem-dimensions">Dimensions (mm) *</label>
              <input
                id="gem-dimensions"
                type="text"
                required
                placeholder="e.g., 8.5x6.5x4.2"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gem-clarity">Clarity Grade *</label>
              <select
                id="gem-clarity"
                required
                value={clarity}
                onChange={(e) => setClarity(e.target.value)}
              >
                <option value="">Select Clarity</option>
                <option value="fl">FL - Flawless</option>
                <option value="if">IF - Internally Flawless</option>
                <option value="vvs1">VVS1 - Very Very Slightly Included 1</option>
                <option value="vvs2">VVS2 - Very Very Slightly Included 2</option>
                <option value="vs1">VS1 - Very Slightly Included 1</option>
                <option value="vs2">VS2 - Very Slightly Included 2</option>
                <option value="si1">SI1 - Slightly Included 1</option>
                <option value="si2">SI2 - Slightly Included 2</option>
                <option value="i1">I1 - Included 1</option>
                <option value="i2">I2 - Included 2</option>
                <option value="i3">I3 - Included 3</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gem-color">Color Grade *</label>
              <input
                id="gem-color"
                type="text"
                required
                placeholder="e.g., D (Colorless)"
                value={colorGrade}
                onChange={(e) => setColorGrade(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gem-cut">Cut Quality *</label>
              <select
                id="gem-cut"
                required
                value={cutQuality}
                onChange={(e) => setCutQuality(e.target.value)}
              >
                <option value="">Select Cut Quality</option>
                <option value="excellent">Excellent</option>
                <option value="very-good">Very Good</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gem-shape">Shape/Cut Style *</label>
              <select
                id="gem-shape"
                required
                value={shape}
                onChange={(e) => setShape(e.target.value)}
              >
                <option value="">Select Shape</option>
                <option value="round">Round</option>
                <option value="princess">Princess</option>
                <option value="cushion">Cushion</option>
                <option value="oval">Oval</option>
                <option value="emerald">Emerald</option>
                <option value="pear">Pear</option>
                <option value="marquise">Marquise</option>
                <option value="asscher">Asscher</option>
                <option value="radiant">Radiant</option>
                <option value="heart">Heart</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="gem-treatment">Treatment *</label>
              <select
                id="gem-treatment"
                required
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
              >
                <option value="unheated">Unheated</option>
                <option value="heated">Heated</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gem-certification">Certification *</label>
              <input
                id="gem-certification"
                type="text"
                required
                placeholder="e.g., GIA, IGI, AGS"
                value={certification}
                onChange={(e) => setCertification(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gem-cert-number">Certificate Number *</label>
              <input
                id="gem-cert-number"
                type="text"
                required
                placeholder="Certificate reference number"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gem-price">Price ($) *</label>
              <input
                id="gem-price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="e.g., 3250.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gem-status">Status *</label>
              <select
                id="gem-status"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="in-stock">In Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gem-description">Description *</label>
            <textarea
              id="gem-description"
              required
              placeholder="Describe the gem's characteristics, brilliance, and any special features..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Uploads */}
          <div className="form-row image-upload-row">
            {/* Gem Images */}
            <div className="image-upload">
              <label>Gem Images *</label>
              <div
                className="upload-area"
                onClick={() => gemInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleGemDrop}
              >
                <i className="fas fa-cloud-upload-alt" />
                <p>Drag & drop gem images here or click to browse</p>
                <span>Recommended: up to 4 images (front, back, sides)</span>
                <span>Max file size: 5MB each (JPG, PNG, WEBP)</span>
                <input
                  ref={gemInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files?.length && onGemImagesSelected(e.target.files)}
                  style={{ display: "none" }}
                />
              </div>

              <div className="image-preview">
                {gemImages.map((src, idx) => (
                  <div className="preview-item" key={idx}>
                    <img src={src} alt={`gem-${idx}`} />
                    <div
                      className="remove-btn"
                      onClick={() => {
                        setGemImages((prev) => prev.filter((_, i) => i !== idx));
                        setGemImageFiles((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <i className="fas fa-times" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Certificate Image */}
            <div className="image-upload">
              <label>Certificate Image *</label>
              <div
                className="upload-area"
                onClick={() => certInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCertDrop}
              >
                <i className="fas fa-certificate" />
                <p>Drag & drop certificate image here or click to browse</p>
                <span>Upload a clear image of the gem's certificate</span>
                <span>Max file size: 5MB (JPG, PNG, WEBP)</span>
                <input
                  ref={certInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onCertImageSelected(e.target.files?.[0])}
                  style={{ display: "none" }}
                />
              </div>

              <div className="image-preview">
                {certImage && (
                  <div className="preview-item certificate-preview">
                    <img src={certImage} alt="certificate" />
                    <div
                      className="remove-btn"
                      onClick={() => {
                        setCertImage(null);
                        setCertImageFile(null);
                        if (certInputRef.current) certInputRef.current.value = "";
                      }}
                    >
                      <i className="fas fa-times" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn">
              <i className="fas fa-plus-circle" /> Add Gem
            </button>
          </div>
        </form>
      </div>

      {/* Shared Footer */}
      <Footer />

      {/* Cancel confirmation modal (inline styles so no CSS collisions) */}
      {showCancelConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2147483647,
          }}
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 12,
              padding: 24,
              width: "min(520px, 92vw)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 10 }}>Discard this gem?</h3>
            <p style={{ color: "#b0b0b0", marginBottom: 20 }}>
              If you continue, your current entries will be lost.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowCancelConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={() => {
                  window.location.href = "/seller/gems";
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered success popup (inline styles) */}
      {showSuccessToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2147483647,
          }}
        >
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(212,175,55,0.35)",
              color: "#f5f5f5",
              padding: "20px 24px",
              borderRadius: 14,
              boxShadow: "0 18px 42px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 260,
              justifyContent: "center",
            }}
          >
            <i className="fas fa-check-circle" style={{ color: "#d4af37", fontSize: 22 }} />
            <span style={{ fontWeight: 600 }}>Gem added successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddGem;
