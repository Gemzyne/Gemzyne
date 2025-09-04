import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./MyOrdersPage.css";

const MyOrdersPage = () => {
  // ---------------- Particles (same pattern you used) ----------------
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
          shape: { type: "circle" },
          opacity: { value: 0.5, random: true },
          size: { value: 3, random: true },
          line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.2, width: 1 },
          move: { enable: true, speed: 1.5, random: true, out_mode: "out" }
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true }
        },
        retina_detect: true
      });
    });

    return () => destroyParticles();
  }, []);

  // ---------------- Header scroll effect ----------------
  useEffect(() => {
    const header = document.getElementById("myorders-header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---------------- Demo data (you can replace with real API later) ----------------
  const orders = useMemo(
    () => [
      {
        id: "GEM-C-7829",
        placed: "October 15, 2023",
        status: "processing",
        estDelivery: "Oct 28, 2023",
        total: 23200,
        items: [
          { name: "Ceylon Blue Sapphire", meta: "3.25 Carat • AAA Quality" },
          { name: "Padparadscha Sapphire", meta: "2.75 Carat • Rare Color" }
        ]
      },
      {
        id: "GEM-I-7802",
        placed: "September 28, 2023",
        status: "completed",
        delivered: "Oct 5, 2023",
        total: 14050,
        items: [
          { name: "Ceylon Yellow Sapphire", meta: "2.10 Carat • VVS1 Clarity" },
          { name: "Ceylon White Sapphire", meta: "1.85 Carat • Eye Clean" }
        ]
      },
      {
        id: "GEM-I-7815",
        placed: "October 5, 2023",
        status: "completed",
        delivered: "Oct 12, 2023",
        total: 9500,
        items: [
          { name: "Star Sapphire", meta: "4.20 Carat • AAA Quality" },
          { name: "Cat's Eye Chrysoberyl", meta: "3.50 Carat • Sharp Eye" }
        ]
      },
      {
        id: "GEM-I-7833",
        placed: "October 10, 2023",
        status: "completed",
        delivered: "Oct 18, 2023",
        total: 7850,
        items: [
          { name: "Rhodolite Garnet", meta: "1.50 Carat • Vivid Color" },
          { name: "Tourmaline Collection", meta: "5-piece set • Mixed Colors" }
        ]
      }
    ],
    []
  );

  // ---------------- UI state ----------------
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'processing' | 'completed'
  const [detailOrderId, setDetailOrderId] = useState(null); // show detail view when set

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [activeFilter, orders]);

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === detailOrderId) || null,
    [detailOrderId, orders]
  );

  // ---------------- Helpers ----------------
  const currency = (n) => `$${n.toLocaleString()}`;

  const openDetails = (id) => setDetailOrderId(id);
  const backToList = () => setDetailOrderId(null);

  return (
    <div className="myorders-root">
      {/* Particles */}
      <div id="particles-js" />

      {/* Header */}
      <header id="myorders-header">
        <div className="logo">LUX GEMS</div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/collection">Collection</Link>
          <Link to="/about">About</Link>
          <Link to="/certification">Certification</Link>
          <Link to="/contact">Contact</Link>
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
        <h1>My Orders</h1>
        <p>Track your orders and filter by status</p>
      </section>

      {/* If NOT in detail view, show tabs + grid */}
      {!activeOrder && (
        <>
          {/* Filter Tabs */}
          <div className="filter-tabs">
            {["all", "processing", "completed"].map((key) => (
              <button
                key={key}
                className={`filter-tab ${activeFilter === key ? "active" : ""}`}
                onClick={() => setActiveFilter(key)}
              >
                {key === "all" ? "All Orders" : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>

          {/* Orders Grid */}
          <div className="orders-container">
            <div className="order-grid">
              {filteredOrders.map((order) => (
                <div className="order-card" key={order.id} data-status={order.status}>
                  <div className="order-card-header">
                    <div>
                      <h2>Order #{order.id}</h2>
                      <div className="order-id">Placed on {order.placed}</div>
                    </div>
                    <div
                      className={`order-status-badge ${
                        order.status === "completed" ? "status-completed" : "status-processing"
                      }`}
                    >
                      {order.status === "completed" ? "Completed" : "Processing"}
                    </div>
                  </div>

                  <div className="order-card-content">
                    <div className="order-items-preview">
                      {order.items.map((it, idx) => (
                        <div className="order-item-preview" key={idx}>
                          <div className="item-preview-image">
                            <i className="fas fa-gem"></i>
                          </div>
                          <div className="item-preview-details">
                            <h4>{it.name}</h4>
                            <p>{it.meta}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="order-meta">
                      <div className="order-date">
                        {order.status === "completed"
                          ? `Delivered: ${order.delivered}`
                          : `Est. Delivery: ${order.estDelivery}`}
                      </div>
                      <div className="order-total">{currency(order.total)}</div>
                    </div>
                  </div>

                  <div className="order-card-footer">
                    <button
                      className="card-action-btn primary-btn"
                      onClick={() => openDetails(order.id)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Detail view */}
      {activeOrder && (
        <div className="orders-container">
          <div className="back-button" onClick={backToList}>
            <i className="fas fa-arrow-left"></i>
            <span>Back to Orders</span>
          </div>

          <div className="order-container">
            {/* Left: Order Information */}
            <div className="order-info">
              <div className="order-header">
                <h2>Order #{activeOrder.id}</h2>
                <div className="order-id">Placed on {activeOrder.placed}</div>
              </div>

              <div className="order-content">
                <div className="order-section-detail">
                  <h3>Order Items</h3>
                  {activeOrder.items.map((it, idx) => (
                    <div className="order-item-detail" key={idx}>
                      <div className="item-image">
                        <i className="fas fa-gem"></i>
                      </div>
                      <div className="item-details">
                        <h4>{it.name}</h4>
                        <p>{it.meta}</p>
                        {/* prices just for demo */}
                        <div className="item-price">{idx === 0 ? currency(Math.round(activeOrder.total * 0.4)) : currency(Math.round(activeOrder.total * 0.6))}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-section-detail">
                  <h3>Shipping Information</h3>
                  <p>
                    <strong>Johnathan Lee</strong>
                    <br />
                    123 Luxury Lane, Suite 45
                    <br />
                    Beverly Hills, CA 90210
                    <br />
                    United States
                    <br />
                    <i className="fas fa-phone"></i> +1 (555) 123-4567
                  </p>
                </div>

                <div className="order-section-detail">
                  <h3>Payment Method</h3>
                  <p>
                    <i className="fas fa-credit-card"></i> Visa ending in 4567
                    <br />
                    <strong>Total: {currency(activeOrder.total)}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Status */}
            <div className="order-status">
              <h2 className="status-title">Order Status</h2>

              <div className="status-indicator">
                <div className="status-step">
                  <div className={`status-bubble ${activeOrder.status ? "completed" : ""}`}>
                    <i className="fas fa-check"></i>
                  </div>
                  <span className="status-label">Processing</span>
                </div>

                <div className="status-step">
                  <div
                    className={`status-bubble ${
                      activeOrder.status === "processing" ? "active" : "completed"
                    }`}
                  >
                    <i className="fas fa-truck"></i>
                  </div>
                  <span
                    className={`status-label ${
                      activeOrder.status === "processing" ? "active" : ""
                    }`}
                  >
                    Shipped
                  </span>
                </div>

                <div className="status-step">
                  <div
                    className={`status-bubble ${
                      activeOrder.status === "completed" ? "completed" : ""
                    }`}
                  >
                    <i className="fas fa-box-open"></i>
                  </div>
                  <span
                    className={`status-label ${
                      activeOrder.status === "completed" ? "active" : ""
                    }`}
                  >
                    Delivered
                  </span>
                </div>
              </div>

              <div className="delivery-estimate">
                <div className="delivery-title">
                  {activeOrder.status === "completed" ? "Delivered" : "Estimated Delivery"}
                </div>
                <div className="delivery-date">
                  {activeOrder.status === "completed"
                    ? (activeOrder.delivered ? `Delivered on ${activeOrder.delivered}` : "Delivered")
                    : "October 28, 2023"}
                </div>
              </div>

              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-title">Shipping Progress</span>
                  <span className="progress-percentage">
                    {activeOrder.status === "completed" ? "100% Complete" : "65% Complete"}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: activeOrder.status === "completed" ? "100%" : "65%" }}
                  />
                </div>
              </div>

              <div className="order-summary">
                <h3>Order Summary</h3>
                <div className="summary-item">
                  <span>Subtotal</span>
                  <span>{currency(activeOrder.total)}</span>
                </div>
                <div className="summary-item">
                  <span>Shipping</span>
                  <span>$250</span>
                </div>
                <div className="summary-item">
                  <span>Tax</span>
                  <span>$1,700</span>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <span>{currency(activeOrder.total + 250 + 1700)}</span>
                </div>
              </div>

              <div className="action-buttons">
                <button className="action-btn secondary-btn">Contact Support</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer>
        <div className="footer-grid">
          <div className="footer-col">
            <h3>LUX GEMS</h3>
            <p>Discover the world's most exceptional Sri Lankan gemstones, curated for discerning collectors.</p>
          </div>
          <div className="footer-col">
            <h3>Collections</h3>
            <ul>
              <li><a href="#!"><i className="fas fa-gem"></i> Sapphires</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Padparadscha</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Star Gems</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Cat's Eye</a></li>
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
              <li><a href="#!"><i className="fas fa-map-marker-alt"></i> 123 Gem Street, Colombo</a></li>
              <li><a href="#!"><i className="fas fa-phone"></i> +94 (11) 123-4567</a></li>
              <li><a href="#!"><i className="fas fa-envelope"></i> contact@luxgems.com</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2023 LUX GEMS. All rights reserved. Premium Sri Lankan Gemstone Collection.</p>
        </div>
      </footer>
    </div>
  );
};

export default MyOrdersPage;
