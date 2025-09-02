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
        <SellerSidebar active="dashboard" />

        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Seller Dashboard</h2>
            {/* Keep this button inert as requested */}
            <button className="btn">New Gem</button>
          </div>

          {/* ...rest of your content unchanged... */}

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

          {/* ...the rest of your sections remain exactly the same... */}
        </main>
      </div>
    </>
  );
}
