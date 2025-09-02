import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../api";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import "./GemDetail.css";

const currencyRates = { USD:1, LKR:300, EUR:0.85, GBP:0.75, AUD:1.35 };
const currencySymbols = { USD:"$", LKR:"₨ ", EUR:"€", GBP:"£", AUD:"A$" };

export default function GemDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [gem, setGem] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(localStorage.getItem("selectedCurrency") || "USD");
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ localStorage.setItem("selectedCurrency", selectedCurrency); },[selectedCurrency]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.gems.byId(id);
        if (cancelled) return;
        setGem(res.data);
        setMainImage(res.data.images?.[0] || "");
        document.title = `LUX GEMS | ${res.data.name}`;
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const onScroll = () => {
      const header = document.getElementById("header");
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const existing = document.querySelector('script[data-particles="true"]');
    const initParticles = () => {
      if (window.particlesJS) {
        window.particlesJS("particles-js", {
          particles: {
            number: { value: 60, density: { enable: true, value_area: 800 } },
            color: { value: "#d4af37" }, shape: { type: "circle" },
            opacity: { value: 0.3, random: true }, size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1 },
            move: { enable: true, speed: 1, random: true, out_mode: "out" },
          },
          interactivity: { detect_on: "canvas", events: { onhover:{enable:true,mode:"repulse"}, onclick:{enable:true,mode:"push"}, resize:true } },
          retina_detect: true,
        });
      }
    };
    if (existing) { initParticles(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
    s.async = true; s.setAttribute("data-particles","true"); s.onload = initParticles;
    document.body.appendChild(s);
  }, []);

  const displayPrice = useMemo(() => {
    if (!gem) return "";
    const rate = currencyRates[selectedCurrency] || 1;
    const sym = currencySymbols[selectedCurrency] || "";
    const converted = Math.round(gem.priceUSD * rate);
    return `${sym}${converted.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }, [gem, selectedCurrency]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (!cart.find(i => i._id === gem._id)) cart.push({ ...gem, qty: 1 });
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };

  const instantBuy = () => {
    addToCart();
    navigate("/checkout");
  };

  if (loading) return <div className="detail-container">Loading…</div>;
  if (!gem) return <div className="detail-container">Gem not found</div>;

  return (
    <div className="page-root">
      <div id="particles-js" />

      {/* New shared header */}
      <Header />

      <div className="detail-container">
        <button className="back-button" onClick={()=>navigate(-1)}>
          <i className="fas fa-arrow-left" /> Back to Collection
        </button>

        <div className="gem-detail">
          <div className="gem-visual">
            <div className="gem-main-image">
              {mainImage ? <img id="gem-main-img" src={mainImage} alt={gem.name}/> : <div className="loader" />}
            </div>
            <div className="gem-thumbnails">
              {(gem.images || []).map((src, idx) => {
                const isActive = src === mainImage;
                return (
                  <button type="button" key={idx} className={`gem-thumbnail ${isActive ? "active" : ""}`} onClick={()=>setMainImage(src)}>
                    <img src={src} alt={`Thumbnail ${idx+1}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="gem-info-detail">
            <h1 className="gem-title">{gem.name}</h1>

            <div className="currency-selector">
              <select value={selectedCurrency} onChange={(e)=>setSelectedCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="LKR">LKR (₨)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div className="gem-price">{displayPrice}</div>

            <div className="gem-specs-detail">
              <div className="spec-item"><span className="spec-label">Type:</span><span className="spec-value">{gem.type?.[0]?.toUpperCase()+gem.type?.slice(1)}</span></div>
              <div className="spec-item"><span className="spec-label">Carat Weight:</span><span className="spec-value">{gem.carat} Carat</span></div>
              <div className="spec-item"><span className="spec-label">Treatment:</span><span className="spec-value">{gem.treatment}</span></div>
              <div className="spec-item"><span className="spec-label">Quality:</span><span className="spec-value">{gem.quality}</span></div>
              <div className="spec-item"><span className="spec-label">Color:</span><span className="spec-value">{gem.color}</span></div>
              <div className="spec-item"><span className="spec-label">Origin:</span><span className="spec-value">{gem.origin}</span></div>
            </div>

            <p className="gem-description">{gem.description || "—"}</p>

            <div className="gem-actions-detail">
              <button className="add-to-cart-btn-detail" onClick={addToCart}>Add to Cart</button>
              <button className="buy-now-btn-detail" onClick={instantBuy}>Buy Now</button>
            </div>

            <div className="gem-certification" id="certification">
              <h3>Certification</h3>
              <div className="certification-item">
                <div className="certification-icon"><i className="fas fa-certificate" /></div>
                <div className="certification-text">GIA Certified Gemstone</div>
              </div>
              <div className="certification-item">
                <div className="certification-icon"><i className="fas fa-gem" /></div>
                <div className="certification-text">Premium Cut &amp; Polish</div>
              </div>
              <div className="certification-item">
                <div className="certification-icon"><i className="fas fa-clipboard-check" /></div>
                <div className="certification-text">Quality Assurance Verified</div>
              </div>
            </div>
          </div>

          <div className="certificate-section">
            <div className="certificate-header">
              <h2>Official Gem Certification</h2>
              <p>GIA Certificate of Authenticity</p>
            </div>
            <div className="certificate-image">
              {gem.certificateUrl ? (
                <img id="certificate-img" className="certificate-image-preview" src={gem.certificateUrl} alt="Gem Certificate"/>
              ) : (
                <div className="loader" aria-label="loading-certificate" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New shared footer */}
      <Footer />
    </div>
  );
}
