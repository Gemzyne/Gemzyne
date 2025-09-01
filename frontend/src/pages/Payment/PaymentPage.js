import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./PaymentPage.css";

const API =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:5000";

// Same modal as before (keep if you already added it)
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
  try { return !!JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return false; }
}

export default function PaymentPage() {
  const { state } = useLocation() || {};
  const navigate = useNavigate();

  const orderIdFromNav =
    state?.orderId ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("pendingOrder") || "{}").orderId || null;
      } catch {
        return null;
      }
    })();

  // 🔐 Frontend guard: redirect guests to login
  useEffect(() => {
    if (!isLoggedIn()) {
      const next = orderIdFromNav ? `/payment?order=${orderIdFromNav}` : "/payment";
      localStorage.setItem("nextAfterLogin", next);
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdFromNav]);

  const [loading, setLoading] = useState(!!orderIdFromNav);
  const [order, setOrder] = useState(null);

  // Modal state
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

  // neutral fallback
  const fallbackItem = useMemo(
    () => ({
      title: "Product",
      selections: null,
      pricing: { subtotal: 0 },
      estimatedFinishDate: null,
    }),
    []
  );

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!orderIdFromNav) return;
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/orders/${orderIdFromNav}`);
        const json = await res.json();
        const ok = json?.ok === true || !!json?.order;
        if (!ignore && ok) setOrder(json.order || json);
      } catch (e) {
        console.error("fetch order error:", e);
        if (!ignore)
          openModal("Couldn’t load order", "Please refresh the page or go back to Customize.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();
    return () => { ignore = true; };
  }, [orderIdFromNav]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = order || fallbackItem;
  const hasOrder = !!order;

  const productTitle = hasOrder ? current?.title || "Product" : "Product";
  const subtotal = hasOrder ? Number(current?.pricing?.subtotal ?? 0) : 0;

  // tabs
  const [tab, setTab] = useState("card");

  // customer
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [country, setCountry]   = useState("");
  const [address, setAddress]   = useState("");
  const [city, setCity]         = useState("");
  const [zipCode, setZipCode]   = useState("");

  // card
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName]     = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv]               = useState("");
  const [rememberCard, setRememberCard] = useState(false);

  // bank upload
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  // totals (server recomputes)
  const [shippingCost, setShippingCost] = useState(0);
  const total = (subtotal || 0) + (shippingCost || 0);
  const money = (n) => `$${Number(n || 0).toFixed(2).replace(/\.00$/, "")}`;

  useEffect(() => {
    if (!country) return setShippingCost(0);
    setShippingCost(country === "LK" ? 20 : 100);
  }, [country]);

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
    setFile(f); setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => { if (p >= 100) { clearInterval(t); return 100; } return p + 5; });
    }, 100);
  };
  const clearFile = () => { setFile(null); setProgress(0); };

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

  // submit — CARD
  async function submitCard() {
    const id = orderIdFromNav || current?._id;
    if (!id) {
      openModal("Order not found", "Go back to Customize and create your order first.");
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
      const res = await fetch(`${API}/api/orders/${id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { fullName, email, phone, country, address, city, zipCode },
          country,
          payment: {
            method: "card",
            remember: !!rememberCard,
            card: { cardName, cardNumber },
          },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        openModal(
          "Payment successful",
          "Thanks! Your card payment was processed and your order is confirmed.",
          () => {
            localStorage.removeItem("pendingOrder");
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

  // submit — BANK
  async function submitBank() {
    const id = orderIdFromNav || current?._id;
    if (!id) {
      openModal("Order not found", "Go back to Customize and create your order first.");
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
      const fd = new FormData();
      fd.append("slip", file);
      fd.append("customer", JSON.stringify({ fullName, email, phone, country, address, city, zipCode }));
      fd.append("payment", JSON.stringify({ method: "bank" }));
      fd.append("country", country);

      const res = await fetch(`${API}/api/orders/${id}/checkout`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.ok) {
        openModal(
          "Bank transfer submitted",
          "Thanks! We’ll review your payment slip and confirm the order shortly.",
          () => {
            clearFile();
            localStorage.removeItem("pendingOrder");
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
                    <input id="fullName" className="form-control" value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="John Doe" autoComplete="off" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input id="email" type="email" className="form-control" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="john@example.com" autoComplete="off" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input id="phone" className="form-control" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+1 234 567 8900" autoComplete="off" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <select id="country" className="form-control" value={country} onChange={(e)=>setCountry(e.target.value)}>
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
                  <textarea id="address" rows={3} className="form-control" value={address} onChange={(e)=>setAddress(e.target.value)} placeholder={"123 Main St\nColombo"} autoComplete="off" />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input id="city" className="form-control" value={city} onChange={(e)=>setCity(e.target.value)} placeholder="Colombo" autoComplete="off" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="zipCode">ZIP / Postal Code</label>
                    <input id="zipCode" className="form-control" value={zipCode} onChange={(e)=>setZipCode(e.target.value)} placeholder="10000" autoComplete="off" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="payment-tabs">
              <div className={`tab ${tab==="card"?"active":""}`} onClick={()=>setTab("card")}>Card Payment</div>
              <div className={`tab ${tab==="bank"?"active":""}`} onClick={()=>setTab("bank")}>Bank Transfer</div>
            </div>

            <div className="payment-content">
              {tab === "card" ? (
                <section className="payment-section active" id="card-section">
                  <h2>Card Payment</h2>

                  <div className="form-group">
                    <label htmlFor="cardNumber">Card Number</label>
                    <input id="cardNumber" className="form-control" value={cardNumber} onChange={(e)=>onCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" maxLength={19} autoComplete="off" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cardName">Cardholder Name</label>
                    <input id="cardName" className="form-control" value={cardName} onChange={(e)=>setCardName(e.target.value)} placeholder="John Doe" autoComplete="off" />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="expiryDate">Expiry Date</label>
                      <input id="expiryDate" className="form-control" value={expiryDate} onChange={(e)=>onExpiry(e.target.value)} placeholder="MM/YY" autoComplete="off" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cvv">CVV</label>
                      <input id="cvv" className="form-control" value={cvv} onChange={(e)=>onCvv(e.target.value)} placeholder="123" maxLength={3} autoComplete="off" />
                    </div>
                  </div>

                  <div className="remember-card">
                    <input type="checkbox" id="rememberCard" checked={rememberCard} onChange={(e)=>setRememberCard(e.target.checked)} />
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
                    <div className="bank-detail"><span className="label">Bank Name:</span><span className="value">Global Premium Bank</span></div>
                    <div className="bank-detail"><span className="label">Account Name:</span><span className="value">GemZyne Holdings Ltd</span></div>
                    <div className="bank-detail"><span className="label">Account Number:</span><span className="value">XXXX-XXXX-XXXX-7890</span></div>
                    <div className="bank-detail"><span className="label">Reference:</span><span className="value">{current?.orderNo || "ORD-REF"}</span></div>
                  </div>

                  <p>After making your transfer, please upload the payment confirmation below for verification.</p>

                  <div className="upload-area" onClick={()=>document.getElementById("fileInputHidden").click()}>
                    <div className="upload-icon"><i className="fas fa-cloud-upload-alt" /></div>
                    <div className="upload-text">Upload Payment Confirmation</div>
                    <div className="upload-note">JPG, PNG or PDF (Max 5MB)</div>
                    <div className="upload-btn">Choose File</div>
                    <input id="fileInputHidden" type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display:"none" }} onChange={onChooseFile} />
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

                  <div className="payment-notice"><i className="fas fa-clock" /> Your order will be processed after verification.</div>
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
                    <div><strong>Weight:</strong> {Number(current.selections.weight).toFixed(1).replace(/\.0$/, "")} ct</div>
                  )}
                  {current.selections.grade && <div><strong>Grade:</strong> {current.selections.grade}</div>}
                  {current.selections.polish && <div><strong>Polish:</strong> {current.selections.polish}</div>}
                  {current.selections.symmetry && <div><strong>Symmetry:</strong> {current.selections.symmetry}</div>}
                  {current.estimatedFinishDate && (
                    <div><strong>Estimated Finish:</strong> {new Date(current.estimatedFinishDate).toLocaleDateString()}</div>
                  )}
                </div>
              )}

              <div className="order-item">
                <span className="item-name">{productTitle}</span>
                <span className="item-price">{money(subtotal)}</span>
              </div>

              <div className="order-item" id="shipping-item">
                <span className="item-name">Shipping</span>
                <span className="item-price" id="shipping-price">{money(shippingCost)}</span>
              </div>

              <div className="order-total">
                <span className="total-label">Total</span>
                <span className="total-price" id="total-price">{money(total)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />

      <Modal open={modalOpen} title={modalTitle} message={modalMessage} onClose={closeModal} />
    </>
  );
}
