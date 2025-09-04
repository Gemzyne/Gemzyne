import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./SellerOrdersPage.css";

const SellerOrdersPage = () => {
  // ---------------- Particles ----------------
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
          opacity: { value: 0.3, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false } },
          size: { value: 3, random: true, anim: { enable: true, speed: 3, size_min: 0.1, sync: false } },
          line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.2, width: 1 },
          move: { enable: true, speed: 2, random: true, out_mode: "out" }
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true },
          modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } }, push: { particles_nb: 4 } }
        },
        retina_detect: true
      });
    });

    return () => destroyParticles();
  }, []);

  // ---------------- Header scroll effect ----------------
  useEffect(() => {
    const header = document.getElementById("seller-header");
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---------------- Demo data ----------------
  const initialOrders = useMemo(
    () => [
      {
        id: "#GEM-C-7829",
        customer: "Sarah Johnson",
        img: "https://images.unsplash.com/photo-1599643478517-a313f52cc3c3?auto=format&fit=crop&w=1074&q=80",
        gemName: "Royal Blue Sapphire",
        gemMeta: "3.25 Carat • Oval Cut • AAA Quality",
        total: 8450,
        type: "custom",
        status: "Processing"
      },
      {
        id: "#GEM-C-7815",
        customer: "Michael Chen",
        img: "https://images.unsplash.com/photo-1605102106749-5b935d968c56?auto=format&fit=crop&w=1170&q=80",
        gemName: "Premium Ruby",
        gemMeta: "2.75 Carat • Cushion Cut • Pigeon Blood",
        total: 12800,
        type: "custom",
        status: "Processing"
      },
      {
        id: "#GEM-I-7802",
        customer: "Emma Wilson",
        img: "https://images.unsplash.com/photo-1572314493769-03a6b2672354?auto=format&fit=crop&w=1170&q=80",
        gemName: "Padparadscha Sapphire",
        gemMeta: "2.10 Carat • Emerald Cut • VVS1 Clarity",
        total: 22500,
        type: "inventory",
        status: "Completed"
      },
      {
        id: "#GEM-I-7798",
        customer: "David Miller",
        img: "https://images.unsplash.com/photo-1647891936628-4c6165721c82?auto=format&fit=crop&w=1170&q=80",
        gemName: "Cat's Eye Chrysoberyl",
        gemMeta: "4.15 Carat • Cabochon Cut • Premium Quality",
        total: 9800,
        type: "inventory",
        status: "Completed"
      },
      {
        id: "#GEM-C-7783",
        customer: "Jessica Brown",
        img: "https://images.unsplash.com/photo-1611591437285-c758b5c1b56b?auto=format&fit=crop&w=1170&q=80",
        gemName: "Alexandrite",
        gemMeta: "2.50 Carat • Round Cut • Color Change",
        total: 18500,
        type: "custom",
        status: "Processing"
      },
      {
        id: "#GEM-C-7765",
        customer: "Sophia Williams",
        img: "https://images.unsplash.com/photo-1605102107031-2c0e1bd5031a?auto=format&fit=crop&w=1170&q=80",
        gemName: "Paraiba Tourmaline",
        gemMeta: "3.80 Carat • Emerald Cut • Neon Blue",
        total: 16850,
        type: "custom",
        status: "Processing"
      }
    ],
    []
  );

  const [orders, setOrders] = useState(initialOrders);

  // ---------------- Handlers ----------------
  const handleStatusChange = (idx, value) => {
    setOrders((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], status: value };
      return next;
    });
    const orderId = orders[idx].id;
    // For now just an alert, replace with API later
    alert(`Order ${orderId} status updated to ${value}`);
  };

  const currency = (n) => `$${n.toLocaleString()}`;

  const statusClass = (status) => {
    const v = status.toLowerCase();
    if (v === "processing") return "status-processing";
    if (v === "shipped") return "status-shipped";
    if (v === "delivered") return "status-delivered";
    if (v === "completed") return "status-completed";
    return "";
  };

  return (
    <div className="seller-root">
      {/* Particles */}
      <div id="particles-js" />

      {/* Header */}
      <header id="seller-header">
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
        <h1>Seller Dashboard</h1>
        <p>Manage your gemstone orders and track their status</p>
      </section>

      {/* Orders Table Card */}
      <div className="orders-card">
        <div className="card-header">
          <h3>Gemstone Orders</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Gemstone Details</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, idx) => (
              <tr key={o.id} className={`order-row ${o.type === "custom" ? "custom-order" : "inventory-order"}`}>
                <td>{o.id}</td>
                <td>{o.customer}</td>
                <td>
                  <div className="gem-info">
                    <div className="gem-image">
                      <img src={o.img} alt={o.gemName} />
                    </div>
                    <div className="gem-details">
                      <h4>{o.gemName}</h4>
                      <p>{o.gemMeta}</p>
                    </div>
                  </div>
                </td>
                <td>{currency(o.total)}</td>
                <td>
                  {o.type === "inventory" || o.status === "Completed" ? (
                    <div className={`status-badge ${statusClass(o.status)}`}>Completed</div>
                  ) : (
                    <select
                      className={`status-dropdown ${statusClass(o.status)}`}
                      value={o.status}
                      onChange={(e) => handleStatusChange(idx, e.target.value)}
                    >
                      <option>Processing</option>
                      <option>Shipped</option>
                      <option>Delivered</option>
                      {/* If you want to allow setting completed from dropdown, add: */}
                      {/* <option>Completed</option> */}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <footer>
        <div className="footer-grid">
          <div className="footer-col">
            <h3>LUX GEMS</h3>
            <p>Discover the world's most exceptional gemstones, curated for discerning collectors.</p>
          </div>
          <div className="footer-col">
            <h3>Gemstones</h3>
            <ul>
              <li><a href="#!"><i className="fas fa-gem"></i> Sapphires</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Rubies</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Emeralds</a></li>
              <li><a href="#!"><i className="fas fa-gem"></i> Diamonds</a></li>
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
              <li><a href="#!"><i className="fas fa-map-marker-alt"></i> 123 Diamond Street</a></li>
              <li><a href="#!"><i className="fas fa-phone"></i> +1 (555) 123-4567</a></li>
              <li><a href="#!"><i className="fas fa-envelope"></i> contact@luxgems.com</a></li>
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

export default SellerOrdersPage;
