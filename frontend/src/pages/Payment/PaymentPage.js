import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "./PaymentPage.css";
import { api } from "../../api";

// Minimal modal
function Modal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="modal-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

function isLoggedIn() {
  try {
    return !!JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return false;
  }
}

// client-side preview calculator for custom selections
function computePreviewSubtotal(sel) {
  if (!sel) return 0;
  const GEM_TYPES = { diamond: 5000, sapphire: 3200, ruby: 3800, emerald: 3500, amethyst: 1200, topaz: 950 };
  const SHAPES = { round: 0, princess: 300, cushion: 250, oval: 200, pear: 350, emerald: 400 };
  const gradePrice = (g) => g === 'premium' ? 1500 : g === 'excellent' ? 800 : g === 'very-good' ? 400 : 0;
  const polishPrice = (p) => p === 'excellent' ? 300 : p === 'very-good' ? 150 : 0;
  const symmetryPrice = (s) => s === 'excellent' ? 250 : s === 'very-good' ? 100 : 0;
  const weightExtra = (w) => (w && w > 1 ? Math.round((w - 1) * 1000) : 0);
  return (GEM_TYPES[sel.type] || 0)
    + (SHAPES[sel.shape] || 0)
    + weightExtra(Number(sel.weight))
    + gradePrice(sel.grade)
    + polishPrice(sel.polish)
    + symmetryPrice(sel.symmetry);
}

export default function PaymentPage() {
  const { state } = useLocation() || {};
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const orderIdFromQuery = sp.get("orderId") || null;
  const gemIdFromQuery = sp.get("gemId") || null;
  const kindFromQuery = (sp.get("kind") || "").toLowerCase();
  const isCustomMode = kindFromQuery === "custom";

  const orderIdFromNav =
    state?.orderId ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("pendingOrder") || "{}").orderId || null;
      } catch {
        return null;
      }
    })();

  const hasGemParam = !!gemIdFromQuery;
  const effectiveOrderId = (hasGemParam || isCustomMode) ? null : (orderIdFromQuery || orderIdFromNav || null);
  const effectiveGemId = gemIdFromQuery || null;

  if (hasGemParam) {
    try { localStorage.removeItem("pendingOrder"); } catch {}
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      const next = effectiveOrderId
        ? `/payment?orderId=${encodeURIComponent(effectiveOrderId)}`
        : effectiveGemId
        ? `/payment?gemId=${encodeURIComponent(effectiveGemId)}`
        : isCustomMode
        ? `/payment?kind=custom`
        : "/payment";
      localStorage.setItem("nextAfterLogin", next);
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [effectiveOrderId, effectiveGemId, isCustomMode, navigate]);

  const [auctionCtx, setAuctionCtx] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [afterClose, setAfterClose] = useState(null);
  const openModal = (title, message, cb) => {
    setModalTitle(title);
    setModalMessage(message);
    setAfterClose(() => cb || null);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    const cb = afterClose;
    setAfterClose(null);
    if (typeof cb === "function") cb();
  };

  const [loading, setLoading] = useState(!!effectiveOrderId || !!effectiveGemId || !!isCustomMode);
  const [order, setOrder] = useState(null);
  const [gem, setGem] = useState(null);
  const [custom, setCustom] = useState(null);

  // load order (classic flow)
  useEffect(() => {
    if (!effectiveOrderId) return;
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const json = await api.orders.get(effectiveOrderId);
        const data = json?.order || json || null;
        if (!ignore) setOrder(data);
      } catch (e) {
        console.error("fetch order error:", e);
        if (!ignore && !effectiveGemId)
          openModal("Couldn’t load order", "Please refresh the page or go back to the product.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [effectiveOrderId, effectiveGemId]);

  // load gem (inventory flow)
  useEffect(() => {
    if (!effectiveGemId) return;
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const json = await api.gems.byId(effectiveGemId);
        const data = json?.data || json || null;
        if (!ignore) setGem(data);
      } catch (e) {
        console.error("fetch gem error:", e);
        if (!ignore) openModal("Couldn’t load product", "Please refresh the page or go back to the product.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [effectiveGemId]);

  // load custom selections (custom pay-first flow)
  useEffect(() => {
    if (!isCustomMode) { setCustom(null); return; }
    let stale = false;
    try {
      const raw = localStorage.getItem("pendingCustom");
      const parsed = raw ? JSON.parse(raw) : null;
      const MAX_AGE = 2 * 60 * 60 * 1000;
      if (parsed?.ts && Date.now() - parsed.ts > MAX_AGE) {
        localStorage.removeItem("pendingCustom");
      } else {
        if (!stale) setCustom(parsed);
      }
    } catch { setCustom(null); }
    if (!stale) setLoading(false);
    return () => { stale = true; };
  }, [isCustomMode]);

  // auction banner context (kept)
  useEffect(() => {
    if (!order) {
      localStorage.removeItem("auctionContext");
      setAuctionCtx(null);
      return;
    }
    const isAuctionOrder = typeof order.orderNo === "string" && order.orderNo.startsWith("AUC-");
    if (!isAuctionOrder) {
      localStorage.removeItem("auctionContext");
      setAuctionCtx(null);
      return;
    }
    try {
      const raw = localStorage.getItem("auctionContext");
      const ctx = raw ? JSON.parse(raw) : null;
      if (ctx && ctx.code === order.orderNo) setAuctionCtx(ctx);
      else {
        localStorage.removeItem("auctionContext");
        setAuctionCtx(null);
      }
    } catch {
      localStorage.removeItem("auctionContext");
      setAuctionCtx(null);
    }
  }, [order]);

  const fallbackItem = useMemo(
    () => ({
      title: "Product",
      selections: null,
      pricing: { subtotal: 0 },
      estimatedFinishDate: null,
    }),
    []
  );

  const hasOrder = !!order;
  const current = hasOrder ? order : fallbackItem;

  const productTitle = hasOrder
    ? (current?.title || "Product")
    : isCustomMode
    ? "Custom Gem Order"
    : (gem?.name || gem?.gemId || "Product");

  const previewSubtotal = isCustomMode ? computePreviewSubtotal(custom?.selections) : 0;

  const subtotal = hasOrder
    ? Number(current?.pricing?.subtotal ?? 0)
    : isCustomMode
    ? Number(previewSubtotal)
    : Number(gem?.priceUSD ?? 0);

  const display = {
    orderNo: hasOrder ? (current?.orderNo || 'N/A') : (isCustomMode ? 'CUSTOM' : (gem?.gemId || 'N/A')),
    title:   hasOrder ? (current?.title   || 'N/A') : (isCustomMode ? 'Custom Gem' : (gem?.name   || 'N/A')),
    type:    hasOrder ? (current?.selections?.type || 'N/A') : (isCustomMode ? (custom?.selections?.type || 'N/A') : (gem?.type || 'N/A')),
    shape:   hasOrder ? (current?.selections?.shape|| 'N/A') : (isCustomMode ? (custom?.selections?.shape || 'N/A') : (gem?.shape|| 'N/A')),
    weight:  hasOrder
      ? (current?.selections?.weight != null
          ? `${Number(current.selections.weight).toFixed(2).replace(/\.00$/,'')} ct`
          : 'N/A')
      : (isCustomMode
          ? (custom?.selections?.weight != null
              ? `${Number(custom.selections.weight).toFixed(2).replace(/\.00$/,'')} ct`
              : 'N/A')
          : (gem?.carat != null
              ? `${Number(gem.carat).toFixed(2).replace(/\.00$/,'')} ct`
              : 'N/A')),
  };

  const [tab, setTab] = useState("card");

  // customer
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");

  // card
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [rememberCard, setRememberCard] = useState(false);

  // bank upload
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  // totals (client preview; server recomputes on checkout)
  const [shippingCost, setShippingCost] = useState(0);
  useEffect(() => {
    if (!country) return setShippingCost(0);
    setShippingCost(country === "LK" ? 20 : 100);
  }, [country]);
  const total = (subtotal || 0) + (shippingCost || 0);
  const money = (n) => `$${Number(n || 0).toFixed(2).replace(/\.00$/, "")}`;

  // formatters
  const onCardNumber = (v) => {
    const digits = v.replace(/\s+/g, "").replace(/[^0-9]/g, "");
    const formatted = digits.replace(/(\d{4})/g, "$1 ").trim().slice(0, 19);
    setCardNumber(formatted);
  };
  const onExpiry = (v) => {
    const digits = v.replace(/\s+/g, "").replace(/[^0-9]/g, "").slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    setExpiryDate(formatted);
  };
  const onCvv = (v) => setCvv(v.replace(/[^0-9]/g, "").slice(0, 3));

  // upload simulate
  const onChooseFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t);
          return 100;
        }
        return p + 5;
      });
    }, 100);
  };
  const clearFile = () => {
    setFile(null);
    setProgress(0);
  };

  // validation
  const validateCustomer = () => {
    if (!fullName.trim()) return false;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    if (!phone.trim()) return false;
    if (!country) return false;
    if (!address.trim()) return false;
    if (!city.trim()) return false;
    if (!zipCode.trim()) return false;
    return true;
  };
  const validateCard = () => {
    const num = cardNumber.replace(/\s/g, "");
    if (!num || num.length !== 16) return false;
    if (!cardName.trim()) return false;
    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) return false;
    if (!cvv || cvv.length < 3) return false;
    return true;
  };

  async function submitCard() {
    if (!effectiveOrderId && !effectiveGemId && !isCustomMode) {
      openModal("Nothing to pay", "Go back to the product and try again.");
      return;
    }
    if (!validateCustomer()) {
      openModal("Missing info", "Please fill all customer fields.");
      return;
    }
    if (!validateCard()) {
      openModal("Card details", "Please fill all card fields correctly.");
      return;
    }

    try {
      const payload = {
        country,
        customer: { fullName, email, phone, country, address, city, zipCode },
        payment: { remember: !!rememberCard, card: { cardName, cardNumber } },
      };
      const json = isCustomMode
        ? await api.orders.checkoutCustom({ selections: custom?.selections, ...payload })
        : (effectiveOrderId
            ? await api.orders.checkoutCard(effectiveOrderId, payload)
            : await api.orders.checkoutFromGem(effectiveGemId, payload));
      if (json?.ok) {
        openModal(
          "Payment successful",
          "Thanks! Your card payment was processed and your order is confirmed.",
          () => {
            localStorage.removeItem("pendingOrder");
            localStorage.removeItem("pendingCustom");
            localStorage.removeItem("auctionContext");
            navigate("/");
          }
        );
      } else {
        openModal("Checkout failed", "Please try again in a moment.");
      }
    } catch (e) {
      console.error(e);
      openModal("Network error", "We couldn’t reach the server. Please try again.");
    }
  }

  async function submitBank() {
    if (!effectiveOrderId && !effectiveGemId && !isCustomMode) {
      openModal("Nothing to pay", "Go back to the product and try again.");
      return;
    }
    if (!validateCustomer()) {
      openModal("Missing info", "Please fill all customer fields.");
      return;
    }
    if (!file) {
      openModal("Upload required", "Please upload your payment confirmation slip.");
      return;
    }

    try {
      const json = isCustomMode
        ? await api.orders.checkoutCustom({
            selections: custom?.selections,
            country,
            customer: { fullName, email, phone, country, address, city, zipCode },
            payment: { method: "bank" },
            slip: file,
          })
        : (effectiveOrderId
            ? await api.orders.checkoutBank(effectiveOrderId, {
                country,
                customer: { fullName, email, phone, country, address, city, zipCode },
                slip: file,
              })
            : await api.orders.checkoutFromGem(effectiveGemId, {
                country,
                customer: { fullName, email, phone, country, address, city, zipCode },
                payment: { method: "bank" },
                slip: file,
              }));
      if (json?.ok) {
        openModal(
          "Bank transfer submitted",
          "Thanks! We’ll review your payment slip and confirm the order shortly.",
          () => {
            clearFile();
            localStorage.removeItem("pendingOrder");
            localStorage.removeItem("pendingCustom");
            localStorage.removeItem("auctionContext");
            navigate("/");
          }
        );
      } else {
        openModal("Checkout failed", "Please try again in a moment.");
      }
    } catch (e) {
      console.error(e);
      openModal("Network error", "We couldn’t reach the server. Please try again.");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#fff" }}>
        Loading order…
      </div>
    );
  }

  return (
    <>
      <div id="particles-js" />

      <div className="payment-container">
        {auctionCtx && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "linear-gradient(135deg, rgba(212,175,55,.15), rgba(249,242,149,.1))",
              border: "1px solid rgba(212,175,55,.35)",
              color: "#eaeaea",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
            role="note"
            aria-label="Auction purchase"
          >
            <i className="fas fa-gavel" aria-hidden="true" />
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 600 }}>
                Auction Purchase{auctionCtx.code ? ` • ${auctionCtx.code}` : ""}
              </div>
              {auctionCtx.title ? (
                <div style={{ opacity: 0.85, fontSize: 13 }}>{auctionCtx.title}</div>
              ) : null}
            </div>
          </div>
        )}

        <div className="payment-header">
          <h1>Complete Your Purchase</h1>
          <p>Securely pay for your premium gemstones using your preferred payment method</p>
        </div>

        <div className="payment-layout">
          <div className="payment-main">
            {/* Customer */}
            <div className="form-section">
              <h2>Customer Information</h2>
              <div className="payment-content">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      id="fullName"
                      className="form-control"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <select
                      id="country"
                      className="form-control"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="" disabled>Select Country</option>
                      <option value="LK">Sri Lanka</option>
                      <option value="AU">Australia</option>
                      <option value="US">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="JP">Japan</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address">Shipping Address</label>
                  <textarea
                    id="address"
                    rows={3}
                    className="form-control"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={"123 Main St\nColombo"}
                    autoComplete="off"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      id="city"
                      className="form-control"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Colombo"
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="zipCode">ZIP / Postal Code</label>
                    <input
                      id="zipCode"
                      className="form-control"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="10000"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="payment-tabs">
              <div className={`tab ${tab === "card" ? "active" : ""}`} onClick={() => setTab("card")}>
                Card Payment
              </div>
              <div className={`tab ${tab === "bank" ? "active" : ""}`} onClick={() => setTab("bank")}>
                Bank Transfer
              </div>
            </div>

            <div className="payment-content">
              {tab === "card" ? (
                <section className="payment-section active" id="card-section">
                  <h2>Card Payment</h2>

                  <div className="form-group">
                    <label htmlFor="cardNumber">Card Number</label>
                    <input
                      id="cardNumber"
                      className="form-control"
                      value={cardNumber}
                      onChange={(e) => onCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cardName">Cardholder Name</label>
                    <input
                      id="cardName"
                      className="form-control"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="John Doe"
                      autoComplete="off"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="expiryDate">Expiry Date</label>
                      <input
                        id="expiryDate"
                        className="form-control"
                        value={expiryDate}
                        onChange={(e) => onExpiry(e.target.value)}
                        placeholder="MM/YY"
                        autoComplete="off"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cvv">CVV</label>
                      <input
                        id="cvv"
                        className="form-control"
                        value={cvv}
                        onChange={(e) => onCvv(e.target.value)}
                        placeholder="123"
                        maxLength={3}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="remember-card">
                    <input
                      type="checkbox"
                      id="rememberCard"
                      checked={rememberCard}
                      onChange={(e) => setRememberCard(e.target.checked)}
                    />
                    <label htmlFor="rememberCard">Remember my card details for future purchases</label>
                  </div>

                  <div className="card-icons">
                    <div className="card-icon"><i className="fab fa-cc-visa" /></div>
                    <div className="card-icon"><i className="fab fa-cc-mastercard" /></div>
                    <div className="card-icon"><i className="fab fa-cc-amex" /></div>
                    <div className="card-icon"><i className="fab fa-cc-discover" /></div>
                  </div>

                  <button className="submit-btn" onClick={submitCard}>Pay Now</button>

                  <div className="payment-notice">
                    <i className="fas fa-lock" /> Demo: server encrypts card only if “Remember” is checked.
                  </div>
                </section>
              ) : (
                <section className="payment-section active" id="bank-section">
                  <h2>Bank Transfer</h2>

                  <div className="bank-info">
                    <div className="bank-detail">
                      <span className="label">Bank Name:</span>
                      <span className="value">Global Premium Bank</span>
                    </div>
                    <div className="bank-detail">
                      <span className="label">Account Name:</span>
                      <span className="value">GemZyne Holdings Ltd</span>
                    </div>
                    <div className="bank-detail">
                      <span className="label">Account Number:</span>
                      <span className="value">XXXX-XXXX-XXXX-7890</span>
                    </div>
                    <div className="bank-detail">
                      <span className="label">Reference:</span>
                      <span className="value">{display.orderNo || "ORD-REF"}</span>
                    </div>
                  </div>

                  <p>After making your transfer, please upload the payment confirmation below for verification.</p>

                  <div className="upload-area" onClick={() => document.getElementById("fileInputHidden").click()}>
                    <div className="upload-icon"><i className="fas fa-cloud-upload-alt" /></div>
                    <div className="upload-text">Upload Payment Confirmation</div>
                    <div className="upload-note">JPG, PNG or PDF (Max 5MB)</div>
                    <div className="upload-btn">Choose File</div>
                    <input
                      id="fileInputHidden"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      style={{ display: "none" }}
                      onChange={onChooseFile}
                    />
                  </div>

                  {file && (
                    <div className="file-info active">
                      <div className="file-name">
                        <span>{file.name}</span>
                        <i className="fas fa-times" onClick={clearFile} />
                      </div>
                      <div className="file-progress">
                        <div className="file-progress-bar" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <button className="submit-btn" onClick={submitBank}>Submit Payment Confirmation</button>

                  <div className="payment-notice">
                    <i className="fas fa-clock" /> Your order will be processed after verification.
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <aside className="order-sidebar">
            <div className="order-summary">
              <h3>Order Summary</h3>

              {hasOrder && current?.selections && (
                <div style={{ marginBottom: 10, fontSize: 14, color: "#cfcfcf" }}>
                  {current.selections.weight != null && (
                    <div>
                      <strong>Weight:</strong>{" "}
                      {Number(current.selections.weight).toFixed(1).replace(/\.0$/, "")} ct
                    </div>
                  )}
                  {current.selections.grade && (
                    <div><strong>Grade:</strong> {current.selections.grade}</div>
                  )}
                  {current.selections.polish && (
                    <div><strong>Polish:</strong> {current.selections.polish}</div>
                  )}
                  {current.selections.symmetry && (
                    <div><strong>Symmetry:</strong> {current.selections.symmetry}</div>
                  )}
                  {current.estimatedFinishDate && (
                    <div>
                      <strong>Estimated Finish:</strong>{" "}
                      {new Date(current.estimatedFinishDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}

              {/* custom-mode quick summary */}
              {!hasOrder && isCustomMode && custom?.selections && (
                <div style={{ marginBottom: 10, fontSize: 14, color: "#cfcfcf" }}>
                  <div><strong>Type:</strong> {custom.selections.type}</div>
                  <div><strong>Shape:</strong> {custom.selections.shape}</div>
                  <div><strong>Weight:</strong> {Number(custom.selections.weight).toFixed(1).replace(/\.0$/,'')} ct</div>
                  <div><strong>Grade:</strong> {custom.selections.grade}</div>
                  <div><strong>Polish:</strong> {custom.selections.polish}</div>
                  <div><strong>Symmetry:</strong> {custom.selections.symmetry}</div>
                </div>
              )}

              <div className="order-item">
                <span className="item-name">{productTitle}</span>
                <span className="item-price">{money(subtotal)}</span>
              </div>

              <div className="order-item" id="shipping-item">
                <span className="item-name">Shipping</span>
                <span className="item-price" id="shipping-price">
                  {money(shippingCost)}
                </span>
              </div>

              <div className="order-total">
                <span className="total-label">Total</span>
                <span className="total-price" id="total-price">
                  {money(total)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
      />

      <Modal open={modalOpen} title={modalTitle} message={modalMessage} onClose={closeModal} />
    </>
  );
}
