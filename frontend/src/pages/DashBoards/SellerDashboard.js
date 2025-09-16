// src/pages/Seller/SellerDashboard.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import SellerSidebar from "../../Components/SellerSidebar";
import { metrics } from "../../api";          // ✅ use the new helpers
import "./SellerDashboard.css";

// money formatter
function money(n, ccy = "USD") {
  const amt = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: amt % 1 === 0 ? 0 : 2,
    }).format(amt);
  } catch {
    return `${ccy} ${amt.toFixed(2)}`;
  }
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [year] = useState(new Date().getFullYear());

  // Stat card: total revenue
  const [revenue, setRevenue] = useState("—");
  const [revLoading, setRevLoading] = useState(true);

  // Charts
  const revenueChartInstance = useRef(null);
  const categoryChartInstance = useRef(null);

  // seller guard
  useEffect(() => {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return navigate("/login", { replace: true });
    if (user.role !== "seller") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // Particles (unchanged)
  useEffect(() => {
    const init = () => {
      window.particlesJS &&
        window.particlesJS("particles-js", {
          particles: {
            number: { value: 60, density: { enable: true, value_area: 800 } },
            color: { value: "#d4af37" },
            shape: { type: "circle" },
            opacity: { value: 0.3, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1 },
            move: { enable: true, speed: 1, direction: "none", random: true, straight: false, out_mode: "out", bounce: false },
          },
          interactivity: {
            detect_on: "canvas",
            events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true },
          },
          retina_detect: true,
        });
    };

    if (window.particlesJS) init();
    else {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/particles.js/2.0.0/particles.min.js";
      s.onload = init;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    }
  }, []);

  // sticky header (unchanged)
  useEffect(() => {
    const onScroll = () => {
      const header = document.getElementById("header");
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load summary for revenue card
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setRevLoading(true);
        const s = await metrics.summary(year);
        const ccy = s?.currency || "USD";
        const total = Number(s?.totalRevenue || 0);
        if (alive) setRevenue(money(total, ccy));
      } catch {
        if (alive) setRevenue("—");
      } finally {
        if (alive) setRevLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [year]);

  // Charts powered by metrics
  useEffect(() => {
    let alive = true;

    const ensureChartJs = () =>
      new Promise((resolve) => {
        if (window.Chart) return resolve(window.Chart);
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = () => resolve(window.Chart);
        document.body.appendChild(s);
      });

    const draw = async () => {
      const Chart = await ensureChartJs();

      let revenueSeries = Array(12).fill(0);
      let catLabels = [];
      let catValues = [];
      let ccy = "USD";

      try {
        const [m, c, s] = await Promise.all([
          metrics.monthly(year),
          metrics.category(year),
          metrics.summary(year),
        ]);
        revenueSeries = Array.isArray(m?.months) ? m.months.map(Number) : revenueSeries;
        catLabels = c?.labels || [];
        catValues = (c?.values || []).map(Number);
        ccy = s?.currency || "USD";
      } catch {
        // Fallback to zeros (avoids breaking the page)
        revenueSeries = Array(12).fill(0);
        catLabels = ["Sapphires", "Rubies", "Emeralds", "Diamonds", "Others"];
        catValues = [0, 0, 0, 0, 0];
      }
      if (!alive) return;

      // cleanup before re-draw
      try { revenueChartInstance.current?.destroy(); } catch {}
      try { categoryChartInstance.current?.destroy(); } catch {}

      const revCanvas = document.getElementById("revenueChart");
      if (revCanvas && revCanvas.getContext) {
        revenueChartInstance.current = new Chart(revCanvas.getContext("2d"), {
          type: "line",
          data: {
            labels: MONTHS,
            datasets: [{
              label: `Revenue (${ccy})`,
              data: revenueSeries,
              borderColor: "#d4af37",
              tension: 0.3,
              fill: true,
              backgroundColor: "rgba(212, 175, 55, 0.1)",
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#f5f5f5" } } },
            scales: {
              y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#b0b0b0" } },
              x: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#b0b0b0" } },
            },
          },
        });
      }

      const catCanvas = document.getElementById("categoryChart");
      if (catCanvas && catCanvas.getContext) {
        categoryChartInstance.current = new Chart(catCanvas.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: catLabels,
            datasets: [{
              data: catValues,
              backgroundColor: [
                "rgba(212, 175, 55, 0.8)",
                "rgba(148, 121, 43, 0.8)",
                "rgba(212, 175, 55, 0.6)",
                "rgba(169, 140, 44, 0.8)",
                "rgba(212, 175, 55, 0.4)",
              ],
              borderColor: [
                "rgba(212,175,55,1)",
                "rgba(148,121,43,1)",
                "rgba(212,175,55,1)",
                "rgba(169,140,44,1)",
                "rgba(212,175,55,1)",
              ],
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: "bottom", labels: { color: "#f5f5f5" } } },
          },
        });
      }
    };

    draw();

    return () => {
      alive = false;
      try { revenueChartInstance.current?.destroy(); } catch {}
      try { categoryChartInstance.current?.destroy(); } catch {}
    };
  }, [year]);

  return (
    <>
      <div id="particles-js" />
      <Header />
      <div className="dashboard-container">
        <SellerSidebar active="dashboard" />

        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Seller Dashboard</h2>
            <button className="btn">New Gem</button>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-gem" /></div>
              <div className="stat-info">
                <h3>42</h3>
                <p>Total Gems</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-shopping-bag" /></div>
              <div className="stat-info">
                <h3>28</h3>
                <p>Total Orders</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-dollar-sign" /></div>
              <div className="stat-info">
                <h3>{revLoading ? "…" : revenue}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-star" /></div>
              <div className="stat-info">
                <h3>4.8</h3>
                <p>Average Rating</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="chart-container">
            <div className="chart-card">
              <h3 className="chart-title">Monthly Revenue</h3>
              <canvas id="revenueChart"></canvas>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Sales by Category</h3>
              <canvas id="categoryChart"></canvas>
            </div>
          </div>

          {/* Recent Orders (static for now) */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Recent Orders</h3>
              <a href="#" className="view-all">
                View All
              </a>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>#GZ78945</td>
                    <td>John Smith</td>
                    <td>12 Oct 2023</td>
                    <td>$8,450</td>
                    <td>
                      <span className="status status-delivered">Delivered</span>
                    </td>
                    <td>
                      <button className="action-btn btn-view">View</button>
                    </td>
                  </tr>
                  <tr>
                    <td>#GZ78932</td>
                    <td>Emma Wilson</td>
                    <td>11 Oct 2023</td>
                    <td>$15,200</td>
                    <td>
                      <span className="status status-processing">Processing</span>
                    </td>
                    <td>
                      <button className="action-btn btn-view">View</button>
                    </td>
                  </tr>
                  <tr>
                    <td>#GZ78891</td>
                    <td>Michael Brown</td>
                    <td>10 Oct 2023</td>
                    <td>$3,750</td>
                    <td>
                      <span className="status status-pending">Pending</span>
                    </td>
                    <td>
                      <button className="action-btn btn-view">View</button>
                    </td>
                  </tr>
                  <tr>
                    <td>#GZ78875</td>
                    <td>Sarah Johnson</td>
                    <td>09 Oct 2023</td>
                    <td>$12,800</td>
                    <td>
                      <span className="status status-delivered">Delivered</span>
                    </td>
                    <td>
                      <button className="action-btn btn-view">View</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Inventory & Reports sections left as-is (static for now) */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Gem Inventory</h3>
              <button className="btn">Add New Gem</button>
            </div>

            <div className="tabs">
              <div className="tab active">All Gems</div>
              <div className="tab">Published</div>
              <div className="tab">Drafts</div>
              <div className="tab">Out of Stock</div>
            </div>

            <div className="gems-grid">
              <div className="gem-card">
                <div className="gem-image">
                  <i className="fas fa-gem" style={{ fontSize: 48, color: "#3498db" }}></i>
                </div>
                <div className="gem-info">
                  <h4 className="gem-name">Royal Blue Sapphire</h4>
                  <div className="gem-price">$8,450</div>
                  <div className="gem-specs">3.25 Carat · AAA Quality</div>
                  <div className="gem-actions">
                    <button className="action-btn btn-edit">Edit</button>
                    <button className="action-btn btn-view">View</button>
                  </div>
                </div>
              </div>

              <div className="gem-card">
                <div className="gem-image">
                  <i className="fas fa-gem" style={{ fontSize: 48, color: "#e74c3c" }}></i>
                </div>
                <div className="gem-info">
                  <h4 className="gem-name">Burmese Ruby</h4>
                  <div className="gem-price">$12,800</div>
                  <div className="gem-specs">2.75 Carat · Pigeon Blood</div>
                  <div className="gem-actions">
                    <button className="action-btn btn-edit">Edit</button>
                    <button className="action-btn btn-view">View</button>
                  </div>
                </div>
              </div>

              <div className="gem-card">
                <div className="gem-image">
                  <i className="fas fa-gem" style={{ fontSize: 48, color: "#2ecc71" }}></i>
                </div>
                <div className="gem-info">
                  <h4 className="gem-name">Emerald Cut Diamond</h4>
                  <div className="gem-price">$15,200</div>
                  <div className="gem-specs">2.10 Carat · VVS1 Clarity</div>
                  <div className="gem-actions">
                    <button className="action-btn btn-edit">Edit</button>
                    <button className="action-btn btn-view">View</button>
                  </div>
                </div>
              </div>

              <div className="gem-card">
                <div className="gem-image">
                  <i className="fas fa-gem" style={{ fontSize: 48, color: "#9b59b6" }}></i>
                </div>
                <div className="gem-info">
                  <h4 className="gem-name">Tanzanite</h4>
                  <div className="gem-price">$3,750</div>
                  <div className="gem-specs">2.10 Carat · AAA Quality</div>
                  <div className="gem-actions">
                    <button className="action-btn btn-edit">Edit</button>
                    <button className="action-btn btn-view">View</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reports Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Monthly Reports</h3>
            </div>

            <div className="report-filters">
              <div className="form-group">
                <label className="form-label">Month</label>
                <select className="form-select">
                  <option>October 2023</option>
                  <option>September 2023</option>
                  <option>August 2023</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Report Type</label>
                <select className="form-select">
                  <option>Sales Report</option>
                  <option>Inventory Report</option>
                  <option>Customer Report</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Format</label>
                <select className="form-select">
                  <option>PDF</option>
                  <option>Excel</option>
                  <option>CSV</option>
                </select>
              </div>
            </div>

            <div className="report-actions">
              <button className="btn">Generate Report</button>
              <button className="btn">Download Previous</button>
            </div>
          </div>

          {/* … keep your existing markup … */}
        </main>
      </div>
    </>
  );
}
