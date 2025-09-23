// src/pages/Inventory/InventoryPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api"; // keep as-is
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import "./InventoryPage.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const currencyRates = { USD: 1, LKR: 300, EUR: 0.85, GBP: 0.75, AUD: 1.35 };
const currencySymbols = { USD: "$", LKR: "₨ ", EUR: "€", GBP: "£", AUD: "A$" };

// IMPORTANT: match the CSS selector `.inventory-body #particles-js`
const PARTICLES_ID = "particles-js";

const getImageUrl = (pathOrUrl) => {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl) || /^data:/i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
};

export default function GemInventory() {
  const navigate = useNavigate();

  const [filterActive, setFilterActive] = useState(false);

  const [currency, setCurrency] = useState(
    localStorage.getItem("selectedCurrency") || "USD"
  );
  const [priceRange, setPriceRange] = useState(50000);
  const [caratRange, setCaratRange] = useState(20);
  const [selectedTypes, setSelectedTypes] = useState({
    sapphire: true,
    ruby: true,
    emerald: true,
    diamond: true,
    other: true,
  });
  const [selectedTreatment, setSelectedTreatment] = useState("all-treatments");

  const [loading, setLoading] = useState(true);
  const [gems, setGems] = useState([]);
  const [total, setTotal] = useState(0);

  const particlesInitialized = useRef(false);

  // ===== Modal state for login prompt (ADDED) =====
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  // ===============================================

  const priceLabels = useMemo(() => {
    const rate = currencyRates[currency];
    const sym = currencySymbols[currency];
    return {
      min: `${sym}${Math.round(0 * rate).toLocaleString()}`,
      mid: `${sym}${Math.round(25000 * rate).toLocaleString()}`,
      max: `${sym}${Math.round(50000 * rate).toLocaleString()}+`,
    };
  }, [currency]);

  const formatPrice = (usd) => {
    const rate = currencyRates[currency];
    const sym = currencySymbols[currency];
    return `${sym}${Math.round(usd * rate).toLocaleString()}`;
  };

  useEffect(() => {
    localStorage.setItem("selectedCurrency", currency);
  }, [currency]);

  // particles.js background
  useEffect(() => {
    if (typeof window === "undefined" || particlesInitialized.current) return;

    let destroyed = false;

    const destroyExistingForThisId = () => {
      try {
        if (!window.pJSDom) return;
        window.pJSDom = window.pJSDom.filter((inst) => {
          const parent = inst?.pJS?.canvas?.el?.parentNode;
          const isThis = parent && parent.id === PARTICLES_ID;
          if (isThis) inst.pJS.fn.vendors.destroypJS();
          return !isThis;
        });
      } catch {}
    };

    const initParticles = () => {
      if (destroyed) return;
      destroyExistingForThisId();
      if (window.particlesJS) {
        window.particlesJS(PARTICLES_ID, {
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
            move: { enable: true, speed: 1, random: true, out_mode: "out" },
          },
          interactivity: {
            detect_on: "canvas",
            events: {
              onhover: { enable: true, mode: "repulse" },
              onclick: { enable: true, mode: "push" },
              resize: true,
            },
          },
          retina_detect: true,
        });
        particlesInitialized.current = true;
      }
    };

    if (!window.particlesJS) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.async = true;
      s.onload = initParticles;
      document.head.appendChild(s);
    } else {
      initParticles();
    }

    return () => {
      destroyed = true;
      try {
        if (!window.pJSDom) return;
        window.pJSDom = window.pJSDom.filter((inst) => {
          const parent = inst?.pJS?.canvas?.el?.parentNode;
          const isThis = parent && parent.id === PARTICLES_ID;
          if (isThis) inst.pJS.fn.vendors.destroypJS();
          return !isThis;
        });
      } catch {}
      particlesInitialized.current = false;
    };
  }, []);

  const queryParams = useMemo(() => {
    const types = Object.entries(selectedTypes)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(",");
    return {
      types,
      treatment: selectedTreatment,
      priceMax: priceRange,
      caratMax: caratRange,
      page: 1,
      limit: 60,
    };
  }, [selectedTypes, selectedTreatment, priceRange, caratRange]);

  // fetch on filter changes (debounced)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.gems.list(queryParams);
        if (!cancelled) {
          setGems(res?.data || []);
          setTotal(res?.total ?? (res?.data?.length ?? 0));
        }
      } catch (e) {
        if (!cancelled) {
          setGems([]);
          setTotal(0);
          console.error(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [queryParams]);

  const handleTypeChange = (type) =>
    setSelectedTypes((prev) => ({ ...prev, [type]: !prev[type] }));

  const handleGemClick = (gemId) => navigate(`/gems/${gemId}`);

  // ====== Login guard for actions (MODIFIED) ======
  const requireLogin = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setShowLoginPrompt(true); // show modal instead of alert
      return false;
    }
    return true;
  };
  // ============================================

  const addToCart = (gem, e) => {
    e.stopPropagation();
    if (!requireLogin()) return;
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (!cart.find((i) => i._id === gem._id)) cart.push({ ...gem, qty: 1 });
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };

  const goLogin = () => {
    setShowLoginPrompt(false);
    navigate("/login");
  };

  return (
    <div className="inventory-body">
      <div id={PARTICLES_ID} className="inventory-particles-layer" aria-hidden="true" />

      <Header />

      {/* TOP-RIGHT button under header (moved from sidebar) */}
      <div className="inventory-topbar">
        <button
          className="inventory-btn inventory-customize-btn"
          onClick={() => navigate("/Custom")}
        >
          Customize Your Gem
        </button>
      </div>

      <div className="inventory-container">
        <button
          className="inventory-filter-toggle"
          onClick={() => setFilterActive(!filterActive)}
        >
          <i className={`fas ${filterActive ? "fa-times" : "fa-filter"}`} />{" "}
          {filterActive ? "Hide Filters" : "Show Filters"}
        </button>

        {/* Left sidebar */}
        <aside className={`inventory-filter-sidebar ${filterActive ? "active" : ""}`}>
          <h3>Filter Gems</h3>

          <div className="inventory-currency-converter">
            <h4>Currency</h4>
            <select
              className="inventory-currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD ($)</option>
              <option value="LKR">LKR (₨)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AUD">AUD (A$)</option>
            </select>
          </div>

          <div className="inventory-filter-group">
            <h4>Gem Type</h4>
            <div className="inventory-filter-options">
              {Object.entries(selectedTypes).map(([type, checked]) => (
                <div className="inventory-filter-option" key={type}>
                  <input
                    type="checkbox"
                    id={type}
                    checked={checked}
                    onChange={() => handleTypeChange(type)}
                  />
                  <label htmlFor={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="inventory-filter-group">
            <h4>Treatment</h4>
            <div className="inventory-filter-options">
              {["all-treatments", "heated", "unheated"].map((t) => (
                <div className="inventory-filter-option" key={t}>
                  <input
                    type="radio"
                    id={t}
                    name="treatment"
                    checked={selectedTreatment === t}
                    onChange={() => setSelectedTreatment(t)}
                  />
                  <label htmlFor={t}>
                    {t === "all-treatments"
                      ? "All"
                      : t.charAt(0).toUpperCase() + t.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="inventory-filter-group">
            <h4>Price Range</h4>
            <div className="inventory-price-range">
              <input
                type="range"
                min="0"
                max="50000"
                value={priceRange}
                className="inventory-range-slider"
                onChange={(e) => setPriceRange(parseInt(e.target.value, 10))}
              />
              <div className="inventory-price-values">
                <span>{priceLabels.min}</span>
                <span>{priceLabels.mid}</span>
                <span>{priceLabels.max}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main grid */}
        <main className="inventory-main">
          <div className="inventory-hero">
            <h1 className="inventory-title">Premium Gem Collection</h1>
            <p className="inventory-subtitle">
              Hand-picked gemstones curated for brilliance, quality, and value.
            </p>
          </div>

          <div className="inventory-results-header">
            <div className="inventory-results-count">
              {loading ? "Loading..." : (
                <>Showing <span>{total}</span> gems</>
              )}
            </div>
          </div>

          <div className="inventory-gems-grid">
            {!loading &&
              gems
              // hide reserved / out_of_stock at UI level too (defense-in-depth)
              .filter(g => {
              const s = String(g.status || '').toLowerCase().replace(/\s+/g,'_');
              return !['reserved','out_of_stock','sold'].includes(s);
              })
              .map((gem) => {
                const firstImg = gem.images?.[0] ? getImageUrl(gem.images[0]) : "/images/placeholder-gem.jpg";
                return (
                  <div
                    className="inventory-gem-card"
                    key={gem._id}
                  >
                    <div className="inventory-gem-image">
                      <img
                        src={firstImg}
                        alt={gem.name || "Gem"}
                        onError={(e) => (e.currentTarget.src = "/images/placeholder-gem.jpg")}
                        onClick={() => handleGemClick(gem._id)}
                      />
                    </div>
                    <div className="inventory-gem-info">
                      <h3>{gem.name || gem.gemId}</h3>
                      <div className="inventory-gem-price">
                        {formatPrice(gem.priceUSD)}
                      </div>
                      <div className="inventory-gem-specs">
                        <span>{gem.carat} Carat</span>
                        <span>{gem.quality || "-"}</span>
                      </div>
                      <div className="inventory-gem-actions">
                        <button
                          className="inventory-buy-now-btn"
                          onClick={(e) => {
                          e.stopPropagation();
                          if (!requireLogin()) return;
                          // Go to payment with gemId; no order is created yet
                          navigate(`/payment?gemId=${encodeURIComponent(gem._id)}`);
                        }}
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            {loading && <div className="inventory-loading">Loading gems…</div>}
          </div>
        </main>
      </div>

      <Footer />

      {/* ===== Login Modal (ADDED) ===== */}
      {showLoginPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-required-title"
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
            <h3 id="login-required-title" style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>
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
      {/* ================================= */}
    </div>
  );
}
