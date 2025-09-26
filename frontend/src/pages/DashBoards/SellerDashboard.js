import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import SellerSidebar from "../../Components/SellerSidebar";
import { metrics } from "../../api"; // you already had this
import { api } from "../../api"; // add: gems client
import "./SellerDashboard.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const getImageUrl = (pathOrUrl) => {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl) || /^data:/i.test(pathOrUrl))
    return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
};

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

const MONTHS = [
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
  "Nov",
  "Dec",
];

// --- robust jsPDF loader (same style you used elsewhere) ---
async function loadScript(url, id) {
  if (id && document.getElementById(id)) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    if (id) s.id = id;
    s.src = url;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.referrerPolicy = "no-referrer";
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.body.appendChild(s);
  });
}
async function tryMany(urls, id) {
  let lastErr;
  for (const u of urls) {
    try {
      await loadScript(u, id);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Failed to load any of: ${urls.join(", ")}`);
}
async function ensureJsPdf() {
  if (window.jspdf?.jsPDF && window.jspdf?.jsPDF?.API?.autoTable) {
    return window.jspdf.jsPDF;
  }
  await tryMany(
    [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js",
    ],
    "jspdf-cdn"
  );
  await tryMany(
    [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js",
      "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.min.js",
      "https://unpkg.com/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.min.js",
    ],
    "autotable-cdn"
  );
  if (!window.jspdf?.jsPDF)
    throw new Error("jsPDF not available after loading");
  if (!window.jspdf?.jsPDF?.API?.autoTable)
    throw new Error("autoTable plugin not available");
  return window.jspdf.jsPDF;
}

// helpers to classify stock without touching backend schema
function isInStock(g) {
  const s = String(g?.status || "").toLowerCase();
  const qty = Number(g?.stock ?? g?.quantity ?? g?.qty ?? 0);
  if (["in_stock", "available", "published", "active", "listed"].includes(s))
    return true;
  if (["out_of_stock", "sold", "unavailable", "archived"].includes(s))
    return false;
  return qty > 0; // fallback
}
function isOutOfStock(g) {
  const s = String(g?.status || "").toLowerCase();
  const qty = Number(g?.stock ?? g?.quantity ?? g?.qty ?? 0);
  if (["out_of_stock", "sold", "unavailable", "archived"].includes(s))
    return true;
  if (["in_stock", "available", "published", "active", "listed"].includes(s))
    return false;
  return qty <= 0; // fallback
}

function pickNewestOrRandomFour(list) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const withDate = list.filter((x) => x?.createdAt);
  let arr;
  if (withDate.length > 0) {
    arr = [...list].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  } else {
    // Fisher–Yates shuffle a copy, but only enough to sample 4
    arr = [...list];
    for (let i = 0; i < Math.min(4, arr.length); i++) {
      const j = i + Math.floor(Math.random() * (arr.length - i));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  return arr.slice(0, 4);
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [year] = useState(new Date().getFullYear());

  // Stat card: total revenue
  const [revenue, setRevenue] = useState("—");
  const [revLoading, setRevLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(null);

  // Charts
  const revenueChartInstance = useRef(null);
  const categoryChartInstance = useRef(null);

  // Inventory
  const [gems, setGems] = useState([]);
  const [gemsLoading, setGemsLoading] = useState(true);
  const [gemsError, setGemsError] = useState("");
  const [tab, setTab] = useState("all"); // 'all' | 'in' | 'out'

  // Report UI
  const [reportType, setReportType] = useState("Sales Report"); // 'Sales Report' | 'Inventory Report'
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1); // 1..12
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const yearOptions = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i
  );

  // seller guard
  useEffect(() => {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return navigate("/login", { replace: true });
    if (user.role !== "seller") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // Particles
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
      s.src =
        "https://cdn.jsdelivr.net/npm/particles.js/2.0.0/particles.min.js";
      s.onload = init;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    }
  }, []);

  // sticky header
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

  // Load revenue summary
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setRevLoading(true);
        const s = await metrics.summary(year);
        const ccy = s?.currency || "USD";
        const total = Number(s?.totalRevenue || 0);
        if (alive){
          setRevenue(money(total, ccy));
        setAvgRating(
          typeof s?.avgRating === "number" ? s.avgRating : null
        );
        }
      } catch {
        if (alive) setRevenue("—");
      } finally {
        if (alive) setRevLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [year]);

  // Charts
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
        revenueSeries = Array.isArray(m?.months)
          ? m.months.map(Number)
          : revenueSeries;
        catLabels = c?.labels || [];
        catValues = (c?.values || []).map(Number);
        ccy = s?.currency || "USD";
      } catch {
        revenueSeries = Array(12).fill(0);
        catLabels = ["Sapphires", "Rubies", "Emeralds", "Diamonds", "Others"];
        catValues = [0, 0, 0, 0, 0];
      }
      if (!alive) return;

      // cleanup charts
      try {
        revenueChartInstance.current?.destroy();
      } catch {}
      try {
        categoryChartInstance.current?.destroy();
      } catch {}

      const revCanvas = document.getElementById("revenueChart");
      if (revCanvas && revCanvas.getContext) {
        revenueChartInstance.current = new Chart(revCanvas.getContext("2d"), {
          type: "line",
          data: {
            labels: MONTHS,
            datasets: [
              {
                label: `Revenue (${ccy})`,
                data: revenueSeries,
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

      const catCanvas = document.getElementById("categoryChart");
      if (catCanvas && catCanvas.getContext) {
        categoryChartInstance.current = new Chart(catCanvas.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: catLabels,
            datasets: [
              {
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

    return () => {
      alive = false;
      try {
        revenueChartInstance.current?.destroy();
      } catch {}
      try {
        categoryChartInstance.current?.destroy();
      } catch {}
    };
  }, [year]);

  // Fetch seller gems (once)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setGemsLoading(true);
        setGemsError("");

        // primary call
        let list = await api.gems.mine();

        // soft fallback: if still empty, try public list with a sane limit
        if (!list || list.length === 0) {
          const alt = await api.gems.list({ limit: 100, sort: "-createdAt" });
          if (Array.isArray(alt?.data)) list = alt.data;
          else if (Array.isArray(alt?.items)) list = alt.items;
          else if (Array.isArray(alt)) list = alt;
        }

        if (!alive) return;
        setGems(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!alive) return;
        setGems([]);
        setGemsError(e?.message || "Failed to load your gems");
      } finally {
        if (alive) setGemsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Inventory data per tab (4 items max)
  const gemPool =
    tab === "in"
      ? gems.filter(isInStock)
      : tab === "out"
      ? gems.filter(isOutOfStock)
      : gems;

  const fourGems =
    tab === "all"
      ? pickNewestOrRandomFour(gemPool)
      : (gemPool || []).slice(0, 4);

  // Report: generate PDF
  async function onDownloadPdf() {
    try {
      const jsPDF = await ensureJsPdf();
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pad = 40;

      // header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Seller Dashboard — Report", pad, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Type: ${reportType}`, pad, 70);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pad, 88);

      if (reportType === "Sales Report") {
        // ▶ Sales by Category for the selected year
        const [cat, s] = await Promise.all([
          metrics.category(reportYear),
          metrics.summary(reportYear),
        ]);

        const labels = Array.isArray(cat?.labels) ? cat.labels : [];
        const values = Array.isArray(cat?.values) ? cat.values.map(Number) : [];
        const ccy = s?.currency || "USD";
        const total = values.reduce((a, b) => a + (Number(b) || 0), 0);

        const head = [["Category", `Revenue (${ccy})`]];
        const body = labels.map((name, i) => [
          name,
          money(values[i] || 0, ccy),
        ]);
        // optional grand total row
        body.push(["Total", money(total, ccy)]);

        doc.setFont("helvetica", "bold");
        doc.text(`Period: ${reportYear}`, pad, 108);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Revenue: ${money(total, ccy)}`, pad, 126);

        doc.autoTable({
          head,
          body,
          startY: 150,
          styles: { fontSize: 10, cellPadding: 6, halign: "left" },
          headStyles: { fillColor: [24, 24, 24], textColor: 245 },
          theme: "grid",
          columnStyles: { 1: { halign: "right" } },
        });

        doc.save(`SalesByCategory_${reportYear}.pdf`);
      } else {
        // Inventory Report
        const rows = gems.map((g) => ({
          name: g.name || g.title || g.gemId || "Gem",
          type: g.type || g.category || "—",
          carat: g.carat ?? g.caratWeight ?? "—",
          price: typeof g.priceUSD === "number" ? g.priceUSD : g.price || 0,
          status: (g.status || "—").toString().replace(/_/g, " "),
          created: g.createdAt
            ? new Date(g.createdAt).toLocaleDateString()
            : "—",
        }));

        const inCount = gems.filter(isInStock).length;
        const outCount = gems.filter(isOutOfStock).length;

        doc.setFont("helvetica", "bold");
        doc.text(`Inventory Snapshot: ${reportYear}`, pad, 108);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Total: ${gems.length}   In Stock: ${inCount}   Out of Stock: ${outCount}`,
          pad,
          126
        );

        const head = [
          ["Name", "Type", "Carat", "Price (USD)", "Status", "Created"],
        ];
        const body = rows.map((r) => [
          r.name,
          r.type,
          String(r.carat),
          String(r.price),
          r.status,
          r.created,
        ]);

        doc.autoTable({
          head,
          body,
          startY: 150,
          styles: { fontSize: 10, cellPadding: 6, halign: "left" },
          headStyles: { fillColor: [24, 24, 24], textColor: 245 },
          theme: "grid",
          columnStyles: { 3: { halign: "right" } },
        });

        doc.save(`InventoryReport_${reportYear}.pdf`);
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to prepare PDF.");
    }
  }

  return (
    <>
      <div id="particles-js" />
      <Header />
      <div className="dashboard-container">
        <SellerSidebar active="dashboard" />

        <main className="dashboard-content">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Seller Dashboard</h2>
            <button
              className="btn"
              onClick={() => navigate("/Seller/gems/new")}
            >
              New Gem
            </button>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-gem" />
              </div>
              <div className="stat-info">
                <h3>{gemsLoading ? "…" : gems.length}</h3>
                <p>Total Gems</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-shopping-bag" />
              </div>
              <div className="stat-info">
                <h3>28</h3>
                <p>Total Orders</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-dollar-sign" />
              </div>
              <div className="stat-info">
                <h3>{revLoading ? "…" : revenue}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-star" />
              </div>
              <div className="stat-info">
                <h3>{avgRating == null ? "…" : avgRating.toFixed(1)}</h3>
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

          {/* Gem Inventory (tabs + 4 items) */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Gem Inventory</h3>
              <button className="btn" onClick={() => navigate("/seller/gems")}>
                View All
              </button>
            </div>

            <div className="tabs">
              <div
                className={`tab ${tab === "all" ? "active" : ""}`}
                onClick={() => setTab("all")}
              >
                All
              </div>
              <div
                className={`tab ${tab === "in" ? "active" : ""}`}
                onClick={() => setTab("in")}
              >
                In Stock
              </div>
              <div
                className={`tab ${tab === "out" ? "active" : ""}`}
                onClick={() => setTab("out")}
              >
                Out of Stock
              </div>
            </div>

            <div className="gems-grid">
              {gemsLoading ? (
                <div style={{ padding: 18, color: "#b0b0b0" }}>
                  Loading your gems…
                </div>
              ) : gemsError ? (
                <div style={{ padding: 18, color: "#f88" }}>{gemsError}</div>
              ) : fourGems.length === 0 ? (
                <div style={{ padding: 18, color: "#b0b0b0" }}>
                  No gems to display.
                </div>
              ) : (
                fourGems.map((g) => {
                  const title = g.name || g.title || g.gemId || "Gem";
                  const price =
                    typeof g.priceUSD === "number" ? g.priceUSD : g.price || 0;
                  const carat = g.carat ?? g.caratWeight ?? "—";
                  const raw =
                    Array.isArray(g.images) && g.images[0] ? g.images[0] : null;
                  const img = raw ? getImageUrl(raw) : null;

                  return (
                    <div className="gem-card" key={g._id || g.id || title}>
                      <div className="gem-image">
                        {img ? (
                          <img
                            src={img}
                            alt={title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                          />
                        ) : (
                          <i
                            className="fas fa-gem"
                            style={{ fontSize: 48, color: "#9b59b6" }}
                          />
                        )}
                      </div>
                      <div className="gem-info">
                        <h4 className="gem-name">{title}</h4>
                        <div className="gem-price">
                          ${Number(price).toLocaleString()}
                        </div>
                        <div className="gem-specs">
                          {carat} Carat · {g.quality || "—"}
                        </div>
                        <div className="gem-actions">
                          <button
                            className="action-btn btn-edit"
                            onClick={() =>
                              navigate(
                                `/seller/gems/${g._id || g.id || ""}/edit`
                              )
                            }
                          >
                            Edit
                          </button>
                          <button
                            className="action-btn btn-view"
                            onClick={() =>
                              navigate(`/gems/${g._id || g.id || ""}`)
                            }
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Reports Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Reports</h3>
            </div>

            <div className="report-filters">
              <div className="form-group">
                <label className="form-label">Report Type</label>
                <select
                  className="form-select"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option>Sales Report</option>
                  <option>Inventory Report</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Month</label>
                <select
                  className="form-select"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Year</label>
                <select
                  className="form-select"
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="report-actions">
              <button className="btn" onClick={onDownloadPdf}>
                Download PDF
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
