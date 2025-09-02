import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./CustomPage.css";
import "../../Components/HeaderFooter.css";
import { api } from "../../api";

const GEM_TYPES = [
  { key: "diamond",  name: "Diamond",  desc: "Brilliant and timeless",      price: 5000, img: "https://images.unsplash.com/photo-1605100550745-c9f430e2cb0c?auto=format&fit=crop&w=500&q=60" },
  { key: "sapphire", name: "Sapphire", desc: "Royal blue elegance",         price: 3200, img: "https://images.unsplash.com/photo-1612774412778-8c6453559459?auto=format&fit=crop&w=500&q=60" },
  { key: "ruby",     name: "Ruby",     desc: "Passionate red beauty",       price: 3800, img: "https://images.unsplash.com/photo-1594644465939-4e805408e50e?auto=format&fit=crop&w=500&q=60" },
  { key: "emerald",  name: "Emerald",  desc: "Vibrant green luxury",        price: 3500, img: "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?auto=format&fit=crop&w=500&q=60" },
  { key: "amethyst", name: "Amethyst", desc: "Regal purple charm",          price: 1200, img: "https://images.unsplash.com/photo-1579546929662-711aa81148cf?auto=format&fit=crop&w=500&q=60" },
  { key: "topaz",    name: "Topaz",    desc: "Golden warmth",               price: 950,  img: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=500&q=60" },
];

const SHAPES = [
  { key: "round",    name: "Round",    desc: "Classic brilliance",        price: 0,   img: "https://images.unsplash.com/photo-1605100550745-c9f430e2cb0c?auto=format&fit=crop&w=500&q=60" },
  { key: "princess", name: "Princess", desc: "Modern elegance",           price: 300, img: "https://images.unsplash.com/photo-1612774412778-8c6453559459?auto=format&fit=crop&w=500&q=60" },
  { key: "cushion",  name: "Cushion",  desc: "Vintage charm",             price: 250, img: "https://images.unsplash.com/photo-1594644465939-4e805408e50e?auto=format&fit=crop&w=500&q=60" },
  { key: "oval",     name: "Oval",     desc: "Elongated elegance",        price: 200, img: "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?auto=format&fit=crop&w=500&q=60" },
  { key: "pear",     name: "Pear",     desc: "Unique teardrop",           price: 350, img: "https://images.unsplash.com/photo-1579546929662-711aa81148cf?auto=format&fit=crop&w=500&q=60" },
  { key: "emerald",  name: "Emerald",  desc: "Step-cut sophistication",   price: 400, img: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=500&q=60" },
];

const WEIGHTS = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0];

function isLoggedIn() {
  try { return !!JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return false; }
}

export default function CustomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("type");

  const [type, setType] = useState(null);
  const [shape, setShape] = useState(null);
  const [weight, setWeight] = useState(null);
  const [grade, setGrade] = useState("");
  const [polish, setPolish] = useState("");
  const [symmetry, setSymmetry] = useState("");

  const basePrice   = useMemo(() => (GEM_TYPES.find(g => g.key === type)?.price || 0), [type]);
  const shapePrice  = useMemo(() => (SHAPES.find(s => s.key === shape)?.price || 0), [shape]);
  const weightPrice = useMemo(() => (weight && weight > 1 ? Math.round((weight - 1) * 1000) : 0), [weight]);
  const gradePrice  = useMemo(() => grade === "premium" ? 1500 : grade === "excellent" ? 800 : grade === "very-good" ? 400 : 0, [grade]);
  const polishPrice = useMemo(() => polish === "excellent" ? 300 : polish === "very-good" ? 150 : 0, [polish]);
  const symmetryPrice = useMemo(() => symmetry === "excellent" ? 250 : symmetry === "very-good" ? 100 : 0, [symmetry]);
  const totalPrice  = basePrice + shapePrice + weightPrice + gradePrice + polishPrice + symmetryPrice;

  const estimatedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }, []);

  const allSelected = !!type && !!shape && weight != null && !!grade && !!polish && !!symmetry;
  const money = n => `$${(n || 0).toLocaleString()}`;
  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  // particles
  useEffect(() => {
    const id = "particles-cdn";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.async = true;
      s.onload = () => {
        if (window.particlesJS) {
          window.particlesJS("particles-js", {
            particles: { number: { value: 60, density: { enable: true, value_area: 800 } },
              color: { value: "#d4af37" }, shape: { type: "circle" }, opacity: { value: 0.3, random: true },
              size: { value: 3, random: true }, line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1 },
              move: { enable: true, speed: 1, random: true, out_mode: "out" } },
            interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true } },
            retina_detect: true
          });
        }
      };
      document.body.appendChild(s);
    }
  }, []);

  // resume helpers
  function persistDraft() {
    const draft = { type, shape, weight, grade, polish, symmetry };
    localStorage.setItem("resumeCustomization", JSON.stringify(draft));
  }
  function restoreDraft() {
    try {
      const raw = localStorage.getItem("resumeCustomization");
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.type) setType(d.type);
      if (d.shape) setShape(d.shape);
      if (d.weight != null) setWeight(d.weight);
      if (d.grade) setGrade(d.grade);
      if (d.polish) setPolish(d.polish);
      if (d.symmetry) setSymmetry(d.symmetry);
    } catch {}
  }
  function clearDraft() {
    localStorage.removeItem("resumeCustomization");
    localStorage.removeItem("nextAfterLogin");
  }

  async function createOrderAndGo() {
    try {
      const { order } = await api.orders.create({
        type, shape, weight, grade, polish, symmetry
      });

      localStorage.setItem("pendingOrder", JSON.stringify({
        orderId: order._id,
        orderNo: order.orderNo,
        amount: order.pricing.subtotal,
        currency: order.currency
      }));

      clearDraft();
      navigate("/payment", { state: { orderId: order._id, amount: order.pricing.subtotal, currency: order.currency } });
    } catch (e) {
      console.error(e);
      alert(e?.message || "Network error creating order");
    }
  }

  // resume flow after login
  useEffect(() => {
    restoreDraft();
    const shouldProceed = searchParams.get("proceed") === "1";
    if (shouldProceed && isLoggedIn()) {
      if (localStorage.getItem("resumeCustomization")) {
        createOrderAndGo();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleProceed() {
    if (!allSelected) return;

    if (!isLoggedIn()) {
      persistDraft();
      const next = "/custom?proceed=1";
      localStorage.setItem("nextAfterLogin", next);
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    createOrderAndGo();
  }

  return (
    <>
      <div id="particles-js" />
      <div className="customization-container">
        <div className="customization-header">
          <h1>Create Your Perfect Gem</h1>
          <p>Customize every aspect of your gemstone to create a truly unique piece that reflects your style</p>
        </div>

        <div className="customization-layout">
          <div className="customization-main">
            {/* Tabs */}
            <div className="customization-tabs">
              {["type", "shape", "specs", "review"].map(k => (
                <div key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)} data-tab={k}>
                  {k === "type" ? "Gem Type" : cap(k)}
                </div>
              ))}
            </div>

            <div className="customization-content">
              {/* TYPE */}
              {tab === "type" && (
                <section className="customization-section active" id="type-section">
                  <h2>Select Gem Type</h2>
                  <p>Choose the type of gemstone that speaks to you. Each has unique properties and characteristics.</p>
                  <div className="option-grid">
                    {GEM_TYPES.map(g => (
                      <div key={g.key} className={`option-card ${type === g.key ? "selected" : ""}`}
                           data-type={g.key} data-price={g.price} onClick={() => setType(g.key)}>
                        <div className="option-image"><img src={g.img} alt={g.name} /></div>
                        <div className="option-name">{g.name}</div>
                        <div className="option-desc">{g.desc}</div>
                        <div className="option-price">+{money(g.price)}</div>
                      </div>
                    ))}
                  </div>
                  <button className="submit-btn" onClick={() => setTab("shape")}>Next: Choose Shape</button>
                </section>
              )}

              {/* SHAPE */}
              {tab === "shape" && (
                <section className="customization-section active" id="shape-section">
                  <h2>Select Gem Shape</h2>
                  <p>The cut of your gemstone affects its brilliance and character. Choose what speaks to you.</p>
                  <div className="option-grid">
                    {SHAPES.map(s => (
                      <div key={s.key} className={`option-card ${shape === s.key ? "selected" : ""}`}
                           data-shape={s.key} data-price={s.price} onClick={() => setShape(s.key)}>
                        <div className="option-image"><img src={s.img} alt={`${s.name} Cut Gem`} /></div>
                        <div className="option-name">{s.name}</div>
                        <div className="option-desc">{s.desc}</div>
                        <div className="option-price">{s.price ? `+${money(s.price)}` : "No extra cost"}</div>
                      </div>
                    ))}
                  </div>
                  <div className="form-row">
                    <button className="submit-btn" onClick={() => setTab("type")}>Back</button>
                    <button className="submit-btn" onClick={() => setTab("specs")}>Next: Specifications</button>
                  </div>
                </section>
              )}

              {/* SPECS */}
              {tab === "specs" && (
                <section className="customization-section active" id="specs-section">
                  <h2>Specify Details</h2>
                  <p>Fine-tune your gemstone with precise specifications to match your vision.</p>

                  <div className="form-group">
                    <label>Weight (Carats)</label>
                    <div className="weight-grid" id="weight-grid">
                      {WEIGHTS.map(w => (
                        <button type="button" key={w} className={`chip ${weight === w ? "selected" : ""}`} onClick={() => setWeight(w)}>
                          {w.toFixed(1).replace(/\.0$/, "")} ct
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="grade">Gem Grade</label>
                    <select id="grade" className="form-control" value={grade} onChange={(e) => setGrade(e.target.value)}>
                      <option value="" disabled>Select grade</option>
                      <option value="premium">Premium (Flawless) +$1,500</option>
                      <option value="excellent">Excellent (VVS) +$800</option>
                      <option value="very-good">Very Good (VS) +$400</option>
                      <option value="good">Good (SI) No extra cost</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="polish">Polish Quality</label>
                    <select id="polish" className="form-control" value={polish} onChange={(e) => setPolish(e.target.value)}>
                      <option value="" disabled>Select polish quality</option>
                      <option value="excellent">Excellent +$300</option>
                      <option value="very-good">Very Good +$150</option>
                      <option value="good">Good No extra cost</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="symmetry">Symmetry</label>
                    <select id="symmetry" className="form-control" value={symmetry} onChange={(e) => setSymmetry(e.target.value)}>
                      <option value="" disabled>Select symmetry</option>
                      <option value="excellent">Excellent +$250</option>
                      <option value="very-good">Very Good +$100</option>
                      <option value="good">Good No extra cost</option>
                    </select>
                  </div>

                  <div className="text-preview">
                    <h3>Your Custom Gem Details</h3>
                    <div className="preview-details">
                      <div className="preview-item"><div className="preview-label">Type</div><div className="preview-value">{type ? cap(type) : "—"}</div></div>
                      <div className="preview-item"><div className="preview-label">Shape</div><div className="preview-value">{shape ? cap(shape) : "—"}</div></div>
                      <div className="preview-item"><div className="preview-label">Weight</div><div className="preview-value">{weight != null ? `${weight.toFixed(1).replace(/\.0$/, "")} ct` : "—"}</div></div>
                    </div>
                  </div>

                  <div className="form-row">
                    <button className="submit-btn" onClick={() => setTab("shape")}>Back</button>
                    <button className="submit-btn" onClick={() => setTab("review")}>Review Order</button>
                  </div>
                </section>
              )}

              {/* REVIEW */}
              {tab === "review" && (
                <section className="customization-section active" id="review-section">
                  <h2>Review Your Order</h2>
                  <p>Please review your custom gemstone specifications before proceeding to payment.</p>

                  <div className="text-preview">
                    <h3>Your Custom Gem Specifications</h3>
                    <div className="preview-details">
                      <div className="preview-item"><div className="preview-label">Type</div><div className="preview-value">{type ? cap(type) : "—"}</div></div>
                      <div className="preview-item"><div className="preview-label">Shape</div><div className="preview-value">{shape ? cap(shape) : "—"}</div></div>
                      <div className="preview-item"><div className="preview-label">Weight</div><div className="preview-value">{weight != null ? `${weight.toFixed(1).replace(/\.0$/, "")} ct` : "—"}</div></div>
                      <div className="preview-item"><div className="preview-label">Grade</div><div className="preview-value">{grade || "—"}</div></div>
                      <div className="preview-item"><div className="preview-label">Polish</div><div className="preview-value">{polish || "—"}</div></div>
                      <div className="preview-item"><div className="preview-label">Symmetry</div><div className="preview-value">{symmetry || "—"}</div></div>
                    </div>
                  </div>

                  {/* ETA ONLY HERE */}
                  <div className="finishing-date">
                    <div className="finishing-label">Estimated Finishing Date:</div>
                    <div className="finishing-value">{estimatedDate}</div>
                  </div>

                  <div className="form-row">
                    <button className="submit-btn" onClick={() => setTab("specs")}>Back to Edit</button>
                    <button className="submit-btn" id="proceed-to-payment" onClick={handleProceed} disabled={!allSelected}>
                      Proceed to Payment
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="order-sidebar">
            <div className="order-summary">
              <h3>Order Summary</h3>
              <div className="summary-detail">
                <div className="detail-item"><span className="detail-label">Gem Type:</span><span className="detail-value">{type ? cap(type) : "—"}</span></div>
                <div className="detail-item"><span className="detail-label">Shape:</span><span className="detail-value">{shape ? cap(shape) : "—"}</span></div>
                <div className="detail-item"><span className="detail-label">Weight:</span><span className="detail-value">{weight != null ? `${weight.toFixed(1).replace(/\.0$/, "")} carats` : "—"}</span></div>
                <div className="detail-item"><span className="detail-label">Grade:</span><span className="detail-value">{grade || "—"}</span></div>
                <div className="detail-item"><span className="detail-label">Polish:</span><span className="detail-value">{polish || "—"}</span></div>
                <div className="detail-item"><span className="detail-label">Symmetry:</span><span className="detail-value">{symmetry || "—"}</span></div>
              </div>

              <div className="order-item"><span className="item-name">Base Price</span><span className="item-price">{money(basePrice)}</span></div>
              <div className="order-item"><span className="item-name">Shape</span><span className="item-price">{money(shapePrice)}</span></div>
              <div className="order-item"><span className="item-name">Weight</span><span className="item-price">{money(weightPrice)}</span></div>
              <div className="order-item"><span className="item-name">Grade</span><span className="item-price">{money(gradePrice)}</span></div>
              <div className="order-item"><span className="item-name">Polish</span><span className="item-price">{money(polishPrice)}</span></div>
              <div className="order-item"><span className="item-name">Symmetry</span><span className="item-price">{money(symmetryPrice)}</span></div>

              <div className="order-total">
                <span className="total-label">Subtotal</span>
                <span className="total-price">{money(totalPrice)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
