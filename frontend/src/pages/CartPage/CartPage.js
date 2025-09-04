import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CartPage.css";

const CartPage = () => {
  // ---- Cart items (mock data for now) ----
  const [items, setItems] = useState([
    {
      id: "sapphire",
      name: "Royal Blue Sapphire",
      details: "3.25 Carat • AAA Quality",
      price: 8450,
      img: "https://images.unsplash.com/photo-1599643478517-a313f52cc3c3?auto=format&fit=crop&w=1074&q=80",
    },
    {
      id: "ruby",
      name: "Burmese Ruby",
      details: "2.75 Carat • Pigeon Blood",
      price: 12800,
      img: "https://images.unsplash.com/photo-1605102106749-5b935d968c56?auto=format&fit=crop&w=1170&q=80",
    },
    {
      id: "diamond",
      name: "Emerald Cut Diamond",
      details: "2.10 Carat • VVS1 Clarity",
      price: 15200,
      img: "https://images.unsplash.com/photo-1605102107031-2c0e1bd5031a?auto=format&fit=crop&w=1170&q=80",
    },
  ]);

  // ---- Particles (same pattern you used elsewhere) ----
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
          opacity: { value: 0.3, random: true },
          size: { value: 3, random: true },
          line_linked: {
            enable: true, distance: 150, color: "#d4af37", opacity: 0.2, width: 1,
          },
          move: { enable: true, speed: 2, random: true, out_mode: "out" },
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "grab" }, resize: true },
          modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } } },
        },
        retina_detect: true,
      });
    });

    return () => destroyParticles();
  }, []);

  // ---- Header scroll effect ----
  useEffect(() => {
    const header = document.getElementById("cart-header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---- Totals ----
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price, 0),
    [items]
  );
  const total = subtotal;

  // ---- Remove item (with tiny fade animation) ----
  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const money = (n) => `$${n.toLocaleString()}`;

  return (
    <div className="cart-root">
      {/* Particles */}
      <div id="particles-js" />

      {/* Header */}
      <header id="cart-header">
        <div className="logo">LUX GEMS</div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/collection">Collection</Link>
          <Link to="/about">About</Link>
          <Link to="/certification">Certification</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <div className="header-actions">
          <i className="fas fa-search" />
          <i className="fas fa-user" />
          <Link to="/cart" className="icon-link">
            <i className="fas fa-shopping-bag" />
          </Link>
          <button className="btn">View Collection</button>
        </div>
      </header>

      {/* Page Header */}
      <section className="page-header">
        <h1>Your Gem Collection</h1>
        <p>Review your selected precious gems</p>
      </section>

      {/* Main */}
      <div className="cart-container">
        {/* Items */}
        <div className="cart-items">
          <div className="cart-header">
            <div>Product</div>
            <div>Price</div>
            <div>Total</div>
          </div>

          {items.map((it) => (
            <div className="cart-item" key={it.id}>
              <div className="item-info">
                <div className="item-image">
                  <img src={it.img} alt={it.name} />
                </div>
                <div className="item-details">
                  <h3>{it.name}</h3>
                  <p>{it.details}</p>
                </div>
              </div>
              <div className="item-price">{money(it.price)}</div>
              <div className="item-total">{money(it.price)}</div>
              <button
                className="remove-btn"
                onClick={() => removeItem(it.id)}
                title="Remove"
              >
                <i className="fas fa-trash-alt" />
              </button>
            </div>
          ))}

          {items.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#b0b0b0" }}>
              Your cart is empty. <Link to="/" style={{ color: "#d4af37" }}>Continue shopping</Link>.
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="cart-summary">
          <h2 className="summary-title">Order Summary</h2>

          <div className="summary-item">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          <button className="checkout-btn">Proceed to Checkout</button>
          <Link to="/" className="continue-shopping">Continue Shopping</Link>
        </div>
      </div>

      {/* Footer */}
      <footer>
        <div className="footer-grid">
          <div className="footer-col">
            <h3>LUX GEMS</h3>
            <p>Discover the world's most exceptional gemstones, curated for discerning collectors.</p>
          </div>
          <div className="footer-col">
            <h3>Collections</h3>
            <ul>
              <li><a href="#!"><i className="fas fa-gem" /> Sapphires</a></li>
              <li><a href="#!"><i className="fas fa-gem" /> Rubies</a></li>
              <li><a href="#!"><i className="fas fa-gem" /> Emeralds</a></li>
              <li><a href="#!"><i className="fas fa-gem" /> Diamonds</a></li>
              <li><a href="#!"><i className="fas fa-gem" /> Rare Gems</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Information</h3>
            <ul>
              <li><a href="#!"><i className="fas fa-info-circle" /> About Us</a></li>
              <li><a href="#!"><i className="fas fa-certificate" /> Certification</a></li>
              <li><a href="#!"><i className="fas fa-leaf" /> Ethical Sourcing</a></li>
              <li><a href="#!"><i className="fas fa-book" /> Care Guide</a></li>
              <li><a href="#!"><i className="fas fa-question-circle" /> FAQ</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Contact</h3>
            <ul>
              <li><a href="#!"><i className="fas fa-map-marker-alt" /> 123 Diamond St, Colombo</a></li>
              <li><a href="#!"><i className="fas fa-phone" /> +94 (77) 123-4567</a></li>
              <li><a href="#!"><i className="fas fa-envelope" /> contact@luxgems.lk</a></li>
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

export default CartPage;
