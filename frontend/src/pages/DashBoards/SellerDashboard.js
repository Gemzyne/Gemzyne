import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import SellerSidebar from "../../Components/SellerSidebar";
import "./SellerDashboard.css"; // paste the CSS from your HTML <style> here (unchanged)

export default function SellerDashboard() {
  const navigate = useNavigate();

  // guard: only sellers
  useEffect(() => {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return navigate("/login", { replace: true });
    if (user.role !== "seller") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // particles (same as your HTML)
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
            line_linked: {
              enable: true,
              distance: 150,
              color: "#d4af37",
              opacity: 0.1,
              width: 1,
            },
            move: {
              enable: true,
              speed: 1,
              direction: "none",
              random: true,
              straight: false,
              out_mode: "out",
              bounce: false,
            },
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

    if (window.particlesJS) init();
    else {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.onload = init;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    }
  }, []);

  // sticky header effect
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

  // charts (static data for now; teammates will wire later)
  useEffect(() => {
    const ensureChartJs = () =>
      new Promise((resolve) => {
        if (window.Chart) return resolve();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = resolve;
        document.body.appendChild(s);
      });

    const draw = async () => {
      await ensureChartJs();
      const Chart = window.Chart;

      const rev = document.getElementById("revenueChart");
      if (rev) {
        const ctx = rev.getContext("2d");
        new Chart(ctx, {
          type: "line",
          data: {
            labels: [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
            ],
            datasets: [
              {
                label: "Revenue ($)",
                data: [
                  12500, 19000, 18000, 22000, 19500, 24000, 26000, 31000, 28500,
                  32450,
                ],
                borderColor: "#d4af37",
                tension: 0.3,
                fill: true,
                backgroundColor: "rgba(212, 175, 55, 0.1)",
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#f5f5f5" } } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "rgba(255,255,255,0.1)" },
                ticks: { color: "#b0b0b0" },
              },
              x: {
                grid: { color: "rgba(255,255,255,0.1)" },
                ticks: { color: "#b0b0b0" },
              },
            },
          },
        });
      }

      const cat = document.getElementById("categoryChart");
      if (cat) {
        const ctx = cat.getContext("2d");
        new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["Sapphires", "Rubies", "Emeralds", "Diamonds", "Others"],
            datasets: [
              {
                data: [30, 25, 20, 15, 10],
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
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: "bottom", labels: { color: "#f5f5f5" } },
            },
          },
        });
      }
    };

    draw();
  }, []);

  return (
    <>
      <div id="particles-js"></div>
      <Header />
      <div className="dashboard-container">
        {/* DYNAMIC seller details */}
        <SellerSidebar active="dashboard" />

        {/* Main content — unchanged visuals */}
        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Seller Dashboard</h2>
            <button className="btn">New Gem</button>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-gem"></i>
              </div>
              <div className="stat-info">
                <h3>42</h3>
                <p>Total Gems</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-shopping-bag"></i>
              </div>
              <div className="stat-info">
                <h3>28</h3>
                <p>Total Orders</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="stat-info">
                <h3>$86,450</h3>
                <p>Total Revenue</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-star"></i>
              </div>
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
                      <span className="status status-processing">
                        Processing
                      </span>
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
          {/* Gem Inventory */}
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
                  <i
                    className="fas fa-gem"
                    style={{ fontSize: 48, color: "#3498db" }}
                  ></i>
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
                  <i
                    className="fas fa-gem"
                    style={{ fontSize: 48, color: "#e74c3c" }}
                  ></i>
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
                  <i
                    className="fas fa-gem"
                    style={{ fontSize: 48, color: "#2ecc71" }}
                  ></i>
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
                  <i
                    className="fas fa-gem"
                    style={{ fontSize: 48, color: "#9b59b6" }}
                  ></i>
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
