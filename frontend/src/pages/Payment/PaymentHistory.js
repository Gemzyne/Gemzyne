import React, { useEffect, useMemo, useState } from "react";
import "./PaymentHistory.css";


import Header from "../../Components/Header";
 

const PAYMENT_DATA = [
  { date: "15 Oct 2023", orderNo: "ORD-00123", product: "Royal Blue Sapphire", paymentType: "Card",          status: "paid",      total: "$8,450" },
  { date: "14 Oct 2023", orderNo: "ORD-00122", product: "Emerald Cut Diamond",  paymentType: "Bank Transfer", status: "pending",   total: "$12,600" },
  { date: "12 Oct 2023", orderNo: "ORD-00119", product: "Ruby Ring",            paymentType: "Card",          status: "paid",      total: "$5,200" },
  { date: "10 Oct 2023", orderNo: "ORD-00115", product: "Sapphire Earrings",    paymentType: "Card",          status: "cancelled", total: "$3,200" },
  { date: "08 Oct 2023", orderNo: "ORD-00110", product: "Diamond Necklace",     paymentType: "Bank Transfer", status: "paid",      total: "$18,900" },
  { date: "05 Oct 2023", orderNo: "ORD-00105", product: "Gold Bracelet",        paymentType: "Card",          status: "paid",      total: "$4,500" },
  { date: "01 Oct 2023", orderNo: "ORD-00100", product: "Pearl Set",            paymentType: "Bank Transfer", status: "pending",   total: "$7,600" },
];

export default function PaymentHistory() {
  const [filter, setFilter] = useState("all");

  // stats are based on ALL data (same as your HTML)
  const stats = useMemo(() => {
    const total = PAYMENT_DATA.length;
    const completed = PAYMENT_DATA.filter(p => p.status === "paid").length;
    const pending = PAYMENT_DATA.filter(p => p.status === "pending").length;
    return { total, completed, pending };
  }, []);

  // table rows (respect filter)
  const rows = useMemo(() => {
    return filter === "all" ? PAYMENT_DATA : PAYMENT_DATA.filter(p => p.status === filter);
  }, [filter]);

  // load particles.js via CDN and init once
  useEffect(() => {
    const scriptId = "particlesjs-cdn";
    const initParticles = () => {
      if (!window.particlesJS) return;
      window.particlesJS("particles-js", {
        particles: {
          number: { value: 60, density: { enable: true, value_area: 800 } },
          color: { value: "#d4af37" },
          shape: { type: "circle" },
          opacity: { value: 0.3, random: true },
          size: { value: 3, random: true },
          line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1 },
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

    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.async = true;
      s.onload = initParticles;
      document.body.appendChild(s);
    } else {
      initParticles();
    }
  }, []);

  return (
    <>
       <Header />
      <div id="particles-js" />

      <div className="dashboard-container">
        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Payment History</h2>
            <div className="dashboard-controls">
              <select
                className="filter-select"
                id="statusFilter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="stats-summary">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-receipt" />
              </div>
              <div className="stat-info">
                <h3 id="totalPayments">{stats.total}</h3>
                <p>Total Payments</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-check-circle" />
              </div>
              <div className="stat-info">
                <h3 id="completedPayments">{stats.completed}</h3>
                <p>Completed</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-clock" />
              </div>
              <div className="stat-info">
                <h3 id="pendingPayments">{stats.pending}</h3>
                <p>Pending</p>
              </div>
            </div>
          </div>

          <div className="payment-history-section">
            <div className="section-header">
              <h3 className="section-title">All your purchases with status and totals.</h3>
            </div>

            <table className="payment-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order No</th>
                  <th>Product</th>
                  <th>Payment Type</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#b0b0b0" }}>
                      <i
                        className="fas fa-receipt"
                        style={{ fontSize: 24, marginBottom: 10, display: "block", opacity: 0.5 }}
                      />
                      No payments found with selected status.
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => {
                    const statusClass =
                      p.status === "paid"
                        ? "status-paid"
                        : p.status === "pending"
                        ? "status-pending"
                        : "status-cancelled";
                    const statusIcon =
                      p.status === "paid"
                        ? "fa-check-circle"
                        : p.status === "pending"
                        ? "fa-clock"
                        : "fa-times-circle";
                    const statusText =
                      p.status === "paid" ? "Paid" : p.status === "pending" ? "Pending" : "Cancelled";

                    return (
                      <tr key={p.orderNo}>
                        <td>{p.date}</td>
                        <td>
                          <span className="order-id">
                            <i className="fas fa-hashtag" />
                            {p.orderNo}
                          </span>
                        </td>
                        <td>{p.product}</td>
                        <td>{p.paymentType}</td>
                        <td>
                          <span className={`status ${statusClass}`}>
                            <i className={`fas ${statusIcon}`} />
                            {statusText}
                          </span>
                        </td>
                        <td className="total-amount">{p.total}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
}
