// src/pages/SellerAddGem/EditGem.js
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import "./EditGem.css";
import api from "../../api"; 

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";



// Ensure server-relative URLs become absolute for previewing
const absUrl = (u) => {
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
};

const EditGem = () => {
  const { id } = useParams(); // gem _id from /seller/gems/:id/edit
  const particlesLoaded = useRef(false);

  // ---------------- Form State ----------------
  const [gemName, setGemName] = useState("");
  const [gemId, setGemId] = useState("");
  const [gemType, setGemType] = useState("");
  const [carat, setCarat] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [clarity, setClarity] = useState("");
  const [colorGrade, setColorGrade] = useState("");
  const [cutQuality, setCutQuality] = useState("");
  const [shape, setShape] = useState("");
  const [treatment, setTreatment] = useState("unheated");
  const [certification, setCertification] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("in-stock");
  const [description, setDescription] = useState("");

  // Existing media from DB
  const [existingImages, setExistingImages] = useState([]); // absolute URLs
  const [keptImages, setKeptImages] = useState([]);         // subset to keep
  const [existingCertUrl, setExistingCertUrl] = useState(""); // absolute URL if any

  // Newly added media (local previews + files)
  const [gemImages, setGemImages] = useState([]);           // data URLs for preview
  const [gemImageFiles, setGemImageFiles] = useState([]);   // File[]
  const [certImage, setCertImage] = useState(null);         // data URL
  const [certImageFile, setCertImageFile] = useState(null); // File

  // Cancel modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Success popup
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // ---------------- Particles (unchanged) ----------------
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
            line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1 },
            move: { enable: true, speed: 1, direction: "none", random: true, out_mode: "out" },
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

  // ----- LOAD gem for editing (STAFF endpoint) -----
  useEffect(() => {
    (async () => {
      try {
        const payload = await api.gems.adminById(id); // <-- staff-only
        const g = payload?.data || payload?.gem || payload;

        setGemName(g.name || "");
        setGemId(g.gemId || "");
        setGemType(g.type || "");
        setCarat(g.carat ?? "");
        setDimensions(g.dimensionsMm || "");
        setClarity(g.clarityGrade || "");
        setColorGrade(g.colorGrade || "");
        setCutQuality(g.cutQuality || "");
        setShape(g.shape || "");
        setTreatment(g.treatment || "unheated");
        setCertification(g.certificationAgency || "");
        setCertNumber(g.certificateNumber || "");
        setPrice(g.priceUSD ?? "");
        setStatus(
          g.status === "out_of_stock" ? "out-of-stock"
          : g.status === "reserved" ? "reserved"
          : "in-stock"
        );
        setDescription(g.description || "");

        const imgs = (Array.isArray(g.images) ? g.images : g.imageUrls || [])
          .map(absUrl).filter(Boolean);
        setExistingImages(imgs);
        setKeptImages(imgs);

        setExistingCertUrl(absUrl(g.certificateUrl || g.certificate || ""));
      } catch (e) {
        console.error(e);
        alert("Could not load gem for editing.");
        window.location.href = "/seller/gems";
      }
    })();
  }, [id]);

  // ---------------- Upload helpers ----------------
  const gemInputRef = useRef(null);
  const certInputRef = useRef(null);

  const onGemImagesSelected = (files) => {
    Array.from(files).forEach((file) => {
      if (!file.type.match("image.*")) return;
      setGemImageFiles((prev) => [...prev, file]);
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

  // ---------------- Submit (PUT) ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Total images after edit must be 1..4
    const totalAfter = keptImages.length + gemImageFiles.length;
    if (totalAfter < 1 || totalAfter > 4) {
      alert("Please ensure you have between 1 and 4 gem images.");
      return;
    }

    // Must have a certificate (existing or new)
    if (!existingCertUrl && !certImageFile) {
      alert("Please keep the existing certificate or upload a new one.");
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
    fd.append(
      "status",
      status === "in-stock"
        ? "in_stock"
        : status === "reserved"
        ? "reserved"
        : "out_of_stock"
    );
    fd.append("gemId", gemId);
    fd.append("description", description);

    // Tell backend which existing images to keep (support multiple field names)
    const keptRelative = keptImages.map((u) =>
      u.startsWith(API_BASE) ? u.slice(API_BASE.length) : u
    );
    fd.append("existingImages", JSON.stringify(keptRelative));
    fd.append("existingImagesJson", JSON.stringify(keptRelative)); // alt name for compatibility
    fd.append("keepImages", JSON.stringify(keptRelative));          // another alias, just in case

    // New gem images
    gemImageFiles.forEach((file) => fd.append("images", file));

    // Certificate: either new file or keep existing (send relative URL)
    if (certImageFile) {
      fd.append("certificate", certImageFile);
    } else if (existingCertUrl) {
      const rel = existingCertUrl.startsWith(API_BASE)
        ? existingCertUrl.slice(API_BASE.length)
        : existingCertUrl;
      fd.append("existingCertificateUrl", rel);
      fd.append("keepCertificateUrl", rel); // alt name for compatibility
    }

    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API_BASE}/api/gems/${id}`, {
      method: "PUT",
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Could not update gem:\n${res.status} ${txt || res.statusText}`);
      return;
    }

    // Popup success message (no browser alert) + 1s delay before redirect
    setShowSuccessToast(true);
    setTimeout(() => {
      window.location.href = "/seller/gems";
    }, 1000);
  };

  // ---------------- UI helpers ----------------
  const removeExistingImage = (url) => setKeptImages((prev) => prev.filter((u) => u !== url));
  const removeNewImage = (idx) => {
    setGemImages((prev) => prev.filter((_, i) => i !== idx));
    setGemImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };
  const clearExistingCert = () => setExistingCertUrl("");

  return (
    <div className="editgem-root">
      {/* Particle Background */}
      <div id="particles-js" />

      {/* Shared Header */}
      <Header />

      {/* Main Content */}
      <div className="form-container">
        <div className="form-header">
          <h1>Edit Gem</h1>
          <p>Update details, images and certification, then save your changes.</p>
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
                Current ID: <span id="auto-gem-id">{gemId}</span>
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
                <option value="reserved">Reserved</option>
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

              {/* Existing kept images */}
              <div className="image-preview">
                {keptImages.map((src) => (
                  <div className="preview-item" key={`exist-${src}`}>
                    <img src={src} alt="existing-gem" />
                    <div className="remove-btn" onClick={() => removeExistingImage(src)}>
                      <i className="fas fa-times" />
                    </div>
                  </div>
                ))}
              </div>

              {/* New uploads */}
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

              {/* New image previews */}
              <div className="image-preview">
                {gemImages.map((src, idx) => (
                  <div className="preview-item" key={`new-${idx}`}>
                    <img src={src} alt={`gem-${idx}`} />
                    <div className="remove-btn" onClick={() => removeNewImage(idx)}>
                      <i className="fas fa-times" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Certificate */}
            <div className="image-upload">
              <label>Certificate Image *</label>

              {/* Existing certificate (if any and not cleared) */}
              {existingCertUrl && !certImage && (
                <div className="image-preview">
                  <div className="preview-item certificate-preview">
                    <img src={existingCertUrl} alt="certificate" />
                    <div className="remove-btn" onClick={clearExistingCert}>
                      <i className="fas fa-times" />
                    </div>
                  </div>
                </div>
              )}

              {/* Upload new certificate (or replace) */}
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

              {/* New certificate preview */}
              {certImage && (
                <div className="image-preview">
                  <div className="preview-item certificate-preview">
                    <img src={certImage} alt="certificate-new" />
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
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowCancelConfirm(true)}>
              Cancel
            </button>
            <button type="submit" className="btn">
              <i className="fas fa-plus-circle" /> Save
            </button>
          </div>
        </form>
      </div>

      {/* Shared Footer */}
      <Footer />

      {/* Cancel confirmation modal */}
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
            <h3 style={{ marginBottom: 10 }}>Discard changes?</h3>
            <p style={{ color: "#b0b0b0", marginBottom: 20 }}>
              If you continue, your current edits will be lost.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowCancelConfirm(false)}>
                Cancel
              </button>
              <button className="btn" onClick={() => (window.location.href = "/seller/gems")}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success popup (centered, 1s delay handled in submit) */}
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
            <span style={{ fontWeight: 600 }}>Gem updated successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditGem;
