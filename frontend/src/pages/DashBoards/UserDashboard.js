import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import "./UserDashboard.css";
import UserSidebar from "../../Components/UserSidebar";

const UserDashboard = () => {
  const navigate = useNavigate();

  // particles + sticky header (unchanged)
  useEffect(() => {
    const initParticles = () => {
      window.particlesJS &&
        window.particlesJS("particles-js", {
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
            move: { enable: true, speed: 1 },
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
    };

    if (!window.particlesJS) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.onload = initParticles;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    }
    initParticles();

    const handleScroll = () => {
      const header = document.getElementById("header");
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // protect route if token missing/expired (simple check)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  // payment modal wiring (unchanged)
  useEffect(() => {
    const addPaymentBtn = document.getElementById("add-payment-btn");
    const paymentModal = document.getElementById("payment-modal");
    const modalClose = document.querySelector(".modal-close");
    if (!addPaymentBtn || !paymentModal || !modalClose) return;

    const openModal = () => paymentModal.classList.add("active");
    const closeModal = () => paymentModal.classList.remove("active");
    const overlayClick = (e) => {
      if (e.target === paymentModal) paymentModal.classList.remove("active");
    };

    addPaymentBtn.addEventListener("click", openModal);
    modalClose.addEventListener("click", closeModal);
    paymentModal.addEventListener("click", overlayClick);

    return () => {
      addPaymentBtn.removeEventListener("click", openModal);
      modalClose.removeEventListener("click", closeModal);
      paymentModal.removeEventListener("click", overlayClick);
    };
  }, []);

  return (
    <>
      <div id="particles-js"></div>
      <Header />

      <div className="dashboard-container">
        {/* === separated sidebar === */}
        <UserSidebar />

        {/* Main Content (unchanged) */}
        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Dashboard</h2>
          </div>

          {/* Stats Overview */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-shopping-bag"></i>
              </div>
              <div className="stat-info">
                <h3>5</h3>
                <p>Total Orders</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-gavel"></i>
              </div>
              <div className="stat-info">
                <h3>3</h3>
                <p>Active Bids</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-star"></i>
              </div>
              <div className="stat-info">
                <h3>12</h3>
                <p>My Reviews</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-heart"></i>
              </div>
              <div className="stat-info">
                <h3>8</h3>
                <p>Wishlisted Items</p>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Orders</h3>
              <a href="#" className="view-all">
                View All
              </a>
            </div>
            <div className="table-responsive">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="order-id">#GZ78945</td>
                    <td>12 Oct 2023</td>
                    <td>Royal Blue Sapphire</td>
                    <td>$8,450</td>
                    <td>
                      <span className="status status-delivered">Delivered</span>
                    </td>
                    <td>
                      <a href="#" className="view-all">
                        View
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="order-id">#GZ78932</td>
                    <td>08 Oct 2023</td>
                    <td>Emerald Cut Diamond</td>
                    <td>$15,200</td>
                    <td>
                      <span className="status status-processing">
                        Processing
                      </span>
                    </td>
                    <td>
                      <a href="#" className="view-all">
                        View
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="order-id">#GZ78891</td>
                    <td>03 Oct 2023</td>
                    <td>Tanzanite, 2.1ct</td>
                    <td>$3,750</td>
                    <td>
                      <span className="status status-pending">Pending</span>
                    </td>
                    <td>
                      <a href="#" className="view-all">
                        View
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Payment Methods</h3>
              <button className="btn" id="add-payment-btn">
                Add New
              </button>
            </div>
            <div className="payment-methods">
              <div className="payment-card default">
                <div className="payment-card-header">
                  <div className="payment-type">
                    <div className="payment-icon">
                      <i className="fab fa-cc-visa"></i>
                    </div>
                    <div className="payment-name">Visa</div>
                  </div>
                  <span className="default-badge">Default</span>
                </div>
                <div className="payment-details">
                  <div className="card-number">**** **** **** 4512</div>
                  <div className="card-expiry">Expires: 05/2025</div>
                </div>
                <div className="payment-actions">
                  <button className="payment-btn btn-edit">Edit</button>
                  <button className="payment-btn btn-remove">Remove</button>
                </div>
              </div>

              <div className="payment-card">
                <div className="payment-card-header">
                  <div className="payment-type">
                    <div className="payment-icon">
                      <i className="fab fa-cc-mastercard"></i>
                    </div>
                    <div className="payment-name">MasterCard</div>
                  </div>
                </div>
                <div className="payment-details">
                  <div className="card-number">**** **** **** 7821</div>
                  <div className="card-expiry">Expires: 11/2024</div>
                </div>
                <div className="payment-actions">
                  <button className="payment-btn btn-edit">Edit</button>
                  <button className="payment-btn btn-remove">Remove</button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Auctions */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Active Auctions</h3>
              <a href="#" className="view-all">
                View All
              </a>
            </div>
            <div className="auction-grid">
              <div className="auction-item">
                <div className="auction-image">
                  <div className="auction-timer">2d 14h left</div>
                  <i
                    className="fas fa-gem"
                    style={{ fontSize: "48px", color: "#d4af37" }}
                  ></i>
                </div>
                <div className="auction-info">
                  <h4 className="auction-title">Rare Alexandrite 2.8ct</h4>
                  <div className="auction-price">$9,500</div>
                  <div className="bid-status">
                    <span>Your bid: $9,200</span>
                    <span>12 bids</span>
                  </div>
                  <button className="auction-action">Increase Bid</button>
                </div>
              </div>
              <div className="auction-item">
                <div className="auction-image">
                  <div className="auction-timer">1d 06h left</div>
                  <i
                    className="fas fa-gem"
                    style={{ fontSize: "48px", color: "#3498db" }}
                  ></i>
                </div>
                <div className="auction-info">
                  <h4 className="auction-title">Paraiba Tourmaline 1.5ct</h4>
                  <div className="auction-price">$12,300</div>
                  <div className="bid-status">
                    <span>Your bid: $11,800</span>
                    <span>8 bids</span>
                  </div>
                  <button className="auction-action">Increase Bid</button>
                </div>
              </div>
              <div className="auction-item">
                <div className="auction-image">
                  <div className="auction-timer">3d 08h left</div>
                  <i
                    className="fas fa-gem"
                    style={{ fontSize: "48px", color: "#2ecc71" }}
                  ></i>
                </div>
                <div className="auction-info">
                  <h4 className="auction-title">Colombian Emerald 3.2ct</h4>
                  <div className="auction-price">$7,800</div>
                  <div className="bid-status">
                    <span>Your bid: $7,500</span>
                    <span>15 bids</span>
                  </div>
                  <button className="auction-action">Increase Bid</button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Reviews</h3>
              <a href="#" className="view-all">
                View All
              </a>
            </div>
            <div className="reviews-list">
              <div className="review-item">
                <div className="review-header">
                  <div className="review-gem">Royal Blue Sapphire</div>
                  <div className="review-date">October 15, 2023</div>
                </div>
                <div className="review-rating">
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                </div>
                <p className="review-text">
                  Absolutely stunning sapphire! The color is even more vibrant
                  in person…
                </p>
              </div>
              <div className="review-item">
                <div className="review-header">
                  <div className="review-gem">Emerald Cut Diamond</div>
                  <div className="review-date">October 10, 2023</div>
                </div>
                <div className="review-rating">
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star-half-alt"></i>
                </div>
                <p className="review-text">
                  The diamond is exquisite with excellent clarity…
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Payment Modal (unchanged) */}
      <div className="modal-overlay" id="payment-modal">
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">Add Payment Method</h3>
            <button className="modal-close">&times;</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Card Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="1234 5678 9012 3456"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cardholder Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
              }}
            >
              <div className="form-group">
                <label className="form-label">Expiration Date</label>
                <input type="text" className="form-input" placeholder="MM/YY" />
              </div>
              <div className="form-group">
                <label className="form-label">CVV</label>
                <input type="text" className="form-input" placeholder="123" />
              </div>
            </div>
            <div className="form-group">
              <button className="btn" style={{ width: "100%" }}>
                Add Payment Method
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDashboard;
