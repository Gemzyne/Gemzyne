import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../api";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import "./GemDetail.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const currencyRates   = { USD:1, LKR:300, EUR:0.85, GBP:0.75, AUD:1.35 };
const currencySymbols = { USD:"$", LKR:"₨ ", EUR:"€",   GBP:"£",   AUD:"A$" };

const getImageUrl = (pathOrUrl) => {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl) || /^data:/i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
};

export default function GemDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [gem, setGem] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(
    localStorage.getItem("selectedCurrency") || "USD"
  );
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);

  const particlesInitialized = useRef(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    localStorage.setItem("selectedCurrency", selectedCurrency);
  }, [selectedCurrency]);

  // particles.js (scoped to #particles-js inside .page-root)
  useEffect(() => {
    const CANVAS_ID = "particles-js";
    const LIB_ID = "particlesjs-lib";

    const config = {
      particles: {
        number: { value: 60, density: { enable: true, value_area: 800 } },
        color: { value: "#d4af37" },
        shape: { type: "circle" },
        opacity: { value: 0.3, random: true },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1 },
        move: { enable: true, speed: 1, random: true, out_mode: "out" },
      },
      interactivity: {
        detect_on: "canvas",
        events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true },
      },
      retina_detect: true,
    };

    const destroyExistingFor = (id) => {
      try {
        if (!window.pJSDom) return;
        window.pJSDom = window.pJSDom.filter((inst) => {
          const parent = inst?.pJS?.canvas?.el?.parentNode;
          const isThis = parent && parent.id === id;
          if (isThis) {
            try { inst.pJS.fn.vendors.destroypJS(); } catch {}
            return false;
          }
          return true;
        });
      } catch {}
    };

    const initParticles = () => {
      if (particlesInitialized.current) return;
      const el = document.getElementById(CANVAS_ID);
      if (!el) return;
      destroyExistingFor(CANVAS_ID);
      try {
        window.particlesJS(CANVAS_ID, config);
        particlesInitialized.current = true;
      } catch {}
    };

    if (!window.particlesJS) {
      let script = document.getElementById(LIB_ID);
      if (!script) {
        script = document.createElement("script");
        script.id = LIB_ID;
        script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
        script.async = true;
        script.crossOrigin = "anonymous";
        script.onload = () => requestAnimationFrame(initParticles);
        document.body.appendChild(script);
      } else {
        if (typeof window.particlesJS === "function") {
          requestAnimationFrame(initParticles);
        } else {
          script.addEventListener("load", () => requestAnimationFrame(initParticles), { once: true });
        }
      }
    } else {
      requestAnimationFrame(initParticles);
    }

    return () => {
      destroyExistingFor(CANVAS_ID);
      particlesInitialized.current = false;
    };
  }, []);

  // Fetch gem
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.gems.byId(id);
        const record = res?.data || res;
        if (cancelled) return;

        setGem(record);
        const first = record?.images?.[0] ? getImageUrl(record.images[0]) : "";
        setMainImage(first);
        document.title = `LUX GEMS | ${record?.name || record?.gemId || "Gem"}`;
      } catch (e) {
        console.error(e);
        if (!cancelled) setGem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const displayPrice = useMemo(() => {
    if (!gem) return "";
    const rate = currencyRates[selectedCurrency] || 1;
    const sym  = currencySymbols[selectedCurrency] || "";
    const converted = Math.round((gem.priceUSD || 0) * rate);
    return `${sym}${converted.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }, [gem, selectedCurrency]);

  const requireLogin = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setShowLoginPrompt(true);
      return false;
    }
    return true;
  };

  const addToCart = () => {
    if (!requireLogin()) return;
    if (!gem) return;
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (!cart.find((i) => i._id === gem._id)) cart.push({ ...gem, qty: 1 });
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };

  const instantBuy = async () => {
  if (!requireLogin() || !gem) return;
  try {
    const res = await api.orders.createFromGem(gem._id);
    const orderId = res?.order?._id || res?.orderId || res?._id;
    if (!orderId) throw new Error("Failed to create order");
    navigate(`/payment?orderId=${encodeURIComponent(orderId)}`);
  } catch (e) {
    console.error(e);
    alert(e?.message || "Failed to start checkout");
  }
};


  const goLogin = () => {
    setShowLoginPrompt(false);
    navigate("/login");
  };

  if (loading) return <div className="detail-container">Loading…</div>;
  if (!gem)     return <div className="detail-container">Gem not found</div>;

  return (
    <div className="page-root">
      {/* particles canvas (styled in gemdetails.css) */}
      <div id="particles-js" />

      <Header />

      <div className="detail-container">
        <button type="button" className="back-button" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left" /> Back to Collection
        </button>

        <div className="gem-detail">
          {/* Images */}
          <div className="gem-visual">
            <div className="gem-main-image">
              {mainImage ? (
                <img
                  id="gem-main-img"
                  src={mainImage}
                  alt={gem.name || gem.gemId}
                  onError={(e) => { e.currentTarget.src = "/images/placeholder-gem.jpg"; }}
                />
              ) : (
                <div className="loader" />
              )}
            </div>

            <div className="gem-thumbnails">
              {(gem.images || []).map((p, idx) => {
                const url = getImageUrl(p);
                const isActive = url === mainImage;
                return (
                  <button
                    type="button"
                    key={idx}
                    className={`gem-thumbnail ${isActive ? "active" : ""}`}
                    onClick={() => setMainImage(url)}
                    title={`Image ${idx + 1}`}
                  >
                    <img src={url} alt={`Thumbnail ${idx + 1}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="gem-info-detail">
            <h1 className="gem-title">{gem.name || gem.gemId}</h1>

            <div className="currency-selector">
              <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="LKR">LKR (₨)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div className="gem-price">{displayPrice}</div>

            <div className="gem-specs-detail">
              <div className="spec-item"><span className="spec-label">Type:</span><span className="spec-value">{gem.type || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Carat Weight:</span><span className="spec-value">{gem.carat ?? "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Dimensions (mm):</span><span className="spec-value">{gem.dimensionsMm || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Color Grade:</span><span className="spec-value">{gem.colorGrade || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Shape/Cut Style:</span><span className="spec-value">{gem.shape || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Clarity Grade:</span><span className="spec-value">{gem.clarityGrade || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Cut Quality:</span><span className="spec-value">{gem.cutQuality || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Treatment:</span><span className="spec-value">{gem.treatment || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Certification:</span><span className="spec-value">{gem.certificationAgency || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Certificate Number:</span><span className="spec-value">{gem.certificateNumber || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Status:</span><span className="spec-value">{(gem.status || "").replace(/_/g, " ") || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Quality:</span><span className="spec-value">{gem.quality || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">Origin:</span><span className="spec-value">{gem.origin || "-"}</span></div>
              <div className="spec-item"><span className="spec-label">SKU:</span><span className="spec-value">{gem.sku || "-"}</span></div>
            </div>

            <p className="gem-description">{gem.description || "—"}</p>

            <div className="gem-actions-detail">
              <button className="add-to-cart-btn-detail" onClick={addToCart}>Add to Cart</button>
              <button className="buy-now-btn-detail" onClick={instantBuy}>Buy Now</button>
            </div>

            <div className="gem-certification" id="certification">
              <h3>Certification</h3>
              {gem.certificateUrl ? (
                /\.(png|jpe?g|webp|gif)$/i.test(gem.certificateUrl) ? (
                  <img
                    id="certificate-img"
                    className="certificate-image-preview"
                    src={getImageUrl(gem.certificateUrl)}
                    alt="Gem Certificate"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <a
                    href={getImageUrl(gem.certificateUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="add-to-cart-btn-detail"
                    style={{ display: "inline-block", textDecoration: "none" }}
                  >
                    View Certificate
                  </a>
                )
              ) : (
                <div style={{ color: "#b0b0b0" }}>No certificate uploaded.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {showLoginPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-required-title-detail"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            backdropFilter: "blur(1px)",
          }}
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            style={{
              background: "#111",
              color: "#eee",
              border: "1px solid rgba(212,175,55,0.25)",
              borderRadius: 16,
              padding: 24,
              width: "min(520px, 92vw)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="login-required-title-detail" style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>
              Login required
            </h3>
            <p style={{ marginTop: 12, color: "#cfcfcf", lineHeight: 1.5 }}>
              Please log in to continue.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 18 }}>
              <button
                onClick={() => setShowLoginPrompt(false)}
                style={{
                  background: "transparent",
                  color: "#eee",
                  border: "1px solid rgba(212,175,55,0.35)",
                  padding: "10px 18px",
                  borderRadius: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={goLogin}
                style={{
                  background: "linear-gradient(135deg,#d4af37,#caa43b)",
                  color: "#111",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
