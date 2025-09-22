// src/pages/DashBoards/SellerAuctionControlDashboard.jsx
// ----------------------------------------------------------------------------
// Seller • Auction Control Dashboard
// - Particles background
// - Overview widgets (Total Income & Items Sold use ONLY paid items)
// - Filters (search/type/status)
// - Charts (status doughnut + weekly/monthly revenue with summary)
// - Live / Upcoming / Ended sections
// - Drawer (details + recent bidders; edit in "upcoming" mode)
// - Create Auction modal (4 steps)
// ----------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import SellerSidebar from "../../Components/SellerSidebar";
import "../DashBoards/SellerAuctionControlDashboard.css";
import { request } from "../../api";

/* ===================== Helpers ===================== */

// Base URL for images served by the backend
const BACKEND = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Turns a relative path like "/uploads/xxx.jpg" into a full URL
const asset = (p) => {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;
  return `${BACKEND}${p.startsWith("/") ? "" : "/"}${p}`;
};

// Format numbers as money for display
const fmtMoney = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// Format ISO date strings into a friendly date/time
const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// Small countdown hook that updates once per second
function useCountdown(targetISO) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = Date.parse(targetISO || 0);
  const diff = target - now;
  const total = Math.max(diff, 0);
  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  return { total, days, hours, minutes, seconds };
}

// Small box used to show a time number and its label
const TimeBox = ({ v, lbl }) => (
  <div className="sac-timebox">
    <div className="sac-timebox-value">{String(v).padStart(2, "0")}</div>
    <div className="sac-timebox-label">{lbl}</div>
  </div>
);

/* ---- Revenue grouping helpers ---- */

// Build an array for the last N months with stable keys and labels
function lastNMonths(n, from = new Date()) {
  const arr = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < n; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    arr.unshift({
      key,
      label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
    });
    d.setMonth(d.getMonth() - 1);
  }
  return arr;
}

// Calculate ISO week number for a given date
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: wk };
}

// Build week buckets (12 by default) with labels like W35 (Aug 26–Sep 01)
function lastNWeeks(n, from = new Date()) {
  const arr = [];
  const today = new Date(from);
  const day = (today.getDay() + 6) % 7; // Monday=0
  const monday = new Date(today);
  monday.setDate(today.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - (n - 1 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const { year, week } = isoWeek(start);
    arr.push({
      key: `${year}-W${String(week).padStart(2, "0")}`,
      label:
        `W${week} (` +
        `${start.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}–` +
        `${end.toLocaleDateString(undefined, { month: "short", day: "2-digit" })})`,
      start,
      end,
    });
  }
  return arr;
}

// Percentage change helper for the metric cards
const pctDelta = (curr, prev) => {
  if (prev <= 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
};

/* ===================== Page ===================== */

export default function SellerAuctionControlDashboard() {
  const navigate = useNavigate();

  /* ---------- Route guard (only allow sellers) ---------- */
  useEffect(() => {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return navigate("/login", { replace: true });
    if (user.role !== "seller") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  /* ---------- Particles background loader ---------- */
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
            move: { enable: true, speed: 1, random: true, straight: false, out_mode: "out" },
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
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.onload = init;
      document.body.appendChild(s);
      return () => document.body.removeChild(s);
    }
  }, []);

  /* ========== Data state (overview + winner statuses) ========== */

  // Overview holds totals and auction lists returned by your API
  const [overview, setOverview] = useState({
    totals: { income: 0, totalAuctions: 0, ongoing: 0, sold: 0 },
    live: [],
    upcoming: [],
    history: [],
  });

  // Map to store per-auction winner/payment status (keyed by auctionId)
  const [winStatusMap, setWinStatusMap] = useState({});

  // Filter state for search box and dropdowns
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  // Drawer and create modal state
  const [openDrawer, setOpenDrawer] = useState(false);
  const [drawerAuction, setDrawerAuction] = useState(null);
  const [drawerMode, setDrawerMode] = useState("live"); // "live" | "upcoming" | "ended"
  const [createOpen, setCreateOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Load overview from backend and then enrich with winner info
  async function load() {
    try {
      const data = await request("/api/auctions/seller/overview");
      const next = {
        totals: data?.totals || { income: 0, totalAuctions: 0, ongoing: 0, sold: 0 },
        live: data?.live || [],
        upcoming: data?.upcoming || [],
        history: data?.history || [],
      };
      setOverview(next);
      await hydrateWinnerStatuses(next.history);
    } catch {
      setOverview((o) => ({ ...o, live: [], upcoming: [], history: [] }));
      setWinStatusMap({});
    }
  }

  // Initial load + poll every 10 seconds
  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  // Fetch winner/payment status for each ended auction
  async function hydrateWinnerStatuses(items) {
    if (!items?.length) {
      setWinStatusMap({});
      return;
    }
    const ids = Array.from(new Set(items.map((h) => h._id)));
    const results = await Promise.allSettled(ids.map((id) => request(`/api/wins/auction/${id}`)));
    const map = {};
    results.forEach((r, idx) => {
      const auctionId = ids[idx];
      if (r.status === "fulfilled" && r.value) {
        const w = r.value;
        map[auctionId] = {
          purchaseStatus: (w.purchaseStatus || "").toLowerCase(),
          paymentId: w.paymentId || null,
          purchaseDeadline: w.purchaseDeadline || null,
        };
      }
    });
    setWinStatusMap(map);
  }

  // Prefill edit form when opening an "upcoming" auction in the drawer
  useEffect(() => {
    if (openDrawer && drawerMode === "upcoming" && drawerAuction) {
      setEditForm({
        title: drawerAuction.title || "",
        type: drawerAuction.type || "sapphire",
        description: drawerAuction.description || "",
        basePrice: String(drawerAuction.basePrice ?? ""),
        startTime: drawerAuction.startTime?.slice(0, 16) || "",
        endTime: drawerAuction.endTime?.slice(0, 16) || "",
      });
    } else {
      setEditForm(null);
    }
  }, [openDrawer, drawerMode, drawerAuction]);

  /* ========== Paid detection (shared by widgets, charts, history) ========== */

  // Returns true if this ended auction is fully paid
  const isPaid = (row) => {
    const win = winStatusMap[row._id] || {};
    const purchaseStatus = (win.purchaseStatus || row.purchaseStatus || row.winnerStatus || "").toLowerCase();
    const hasPaid = purchaseStatus === "paid" || !!win.paymentId || !!row.paymentId;
    return !!hasPaid;
  };

  /* ========== Filters for lists and table ========== */

  // Simple case-insensitive search helper
  const norm = (s) => (s || "").toLowerCase();

  // Match function used to filter arrays by search and gem type
  const match = (a) =>
    (!q || norm(a.title).includes(norm(q)) || norm(a.description).includes(norm(q))) &&
    (type === "all" || a.type === type);

  // Filtered arrays for the three sections
  const liveFiltered = useMemo(() => overview.live.filter(match), [match, overview.live]);
  const upcomingFiltered = useMemo(() => overview.upcoming.filter(match), [match, overview.upcoming]);
  const historyFiltered = useMemo(() => overview.history.filter(match), [match, overview.history]);

  // Only show paid items in history
  const historyPaidFiltered = useMemo(() => historyFiltered.filter((h) => isPaid(h)), [historyFiltered, winStatusMap]);

  // Which sections to show based on the status dropdown
  const showLive = status === "all" || status === "live";
  const showUpcoming = status === "all" || status === "upcoming";
  const showEnded = status === "all" || status === "ended";

  /* ========== Drawer open helpers ========== */

  const openLive = (a) => {
    setDrawerAuction(a);
    setDrawerMode("live");
    setOpenDrawer(true);
  };
  const openUpcoming = (a) => {
    setDrawerAuction(a);
    setDrawerMode("upcoming");
    setOpenDrawer(true);
  };
  const openEnded = (a) => {
    setDrawerAuction(a);
    setDrawerMode("ended");
    setOpenDrawer(true);
  };

  /* ========== Drawer actions (edit/delete upcoming) ========== */

  // Save changes for an upcoming auction
  async function saveUpcoming() {
    const id = drawerAuction?._id;
    await request(`/api/auctions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editForm.title,
        type: editForm.type,
        description: editForm.description,
        basePrice: Number(editForm.basePrice || 0),
        startTime: editForm.startTime,
        endTime: editForm.endTime,
      }),
    });
    alert("Upcoming auction updated successfully!");
    await load();
  }

  // Delete an upcoming auction
  async function deleteUpcoming() {
    if (!window.confirm("Delete this upcoming auction?")) return;
    const id = drawerAuction?._id;
    await request(`/api/auctions/${id}`, { method: "DELETE" });
    alert("Auction deleted successfully.");
    setOpenDrawer(false);
    await load();
  }

  /* ========== Charts (paid items only for revenue) ========== */

  const [revenueMode, setRevenueMode] = useState("weekly"); // weekly or monthly
  const chartRefs = { status: useRef(null), revenue: useRef(null) };
  const chartObjs = useRef({});

  // Counts for doughnut chart (live/upcoming/ended)
  const statusCounts = useMemo(() => {
    const live = liveFiltered.length;
    const up = upcomingFiltered.length;
    const ended = historyFiltered.length;
    return { live, up, ended };
  }, [liveFiltered, upcomingFiltered, historyFiltered]);

  // Keep only paid items for revenue calculations
  const paidHistory = useMemo(
    () => (overview.history || []).filter((h) => isPaid(h)),
    [overview.history, winStatusMap]
  );

  // Build monthly revenue dataset from paid items
  const monthlyRevenue = useMemo(() => {
    const buckets = lastNMonths(12);
    const sums = new Map(buckets.map((b) => [b.key, 0]));
    for (const h of paidHistory) {
      if (!h.endTime) continue;
      const d = new Date(h.endTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const amount = Number(h.finalPrice ?? h.currentPrice ?? 0);
      if (sums.has(key)) sums.set(key, (sums.get(key) || 0) + (isNaN(amount) ? 0 : amount));
    }
    return {
      labels: buckets.map((b) => b.label),
      data: buckets.map((b) => sums.get(b.key) || 0),
    };
  }, [paidHistory]);

  // Optional API feed for weekly revenue (kept but not required)
  const [weeklyApi, setWeeklyApi] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await request("/api/reports/weekly-revenue"); // expected: [{year, week, amount}]
        if (mounted && Array.isArray(res)) setWeeklyApi(res);
      } catch {
        setWeeklyApi(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Build weekly revenue dataset from paid items (ignores weeklyApi to enforce paid-only)
  const weeklyRevenue = useMemo(() => {
    const buckets = lastNWeeks(12);
    const sums = new Map(buckets.map((b) => [b.key, 0]));
    for (const h of paidHistory) {
      if (!h.endTime) continue;
      const d = new Date(h.endTime);
      const { year, week } = isoWeek(d);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      const amount = Number(h.finalPrice ?? h.currentPrice ?? 0);
      if (sums.has(key)) sums.set(key, (sums.get(key) || 0) + (isNaN(amount) ? 0 : amount));
    }
    return {
      labels: buckets.map((b) => b.label),
      data: buckets.map((b) => sums.get(b.key) || 0),
    };
  }, [paidHistory]);

  // Small summary for the metric cards above the revenue chart
  const revenueSummary = useMemo(() => {
    const src = revenueMode === "weekly" ? weeklyRevenue : monthlyRevenue;
    const arr = src.data || [];
    const n = arr.length;
    const current = n ? arr[n - 1] : 0;
    const previous = n > 1 ? arr[n - 2] : 0;
    const delta = pctDelta(current, previous);
    return { current, previous, delta };
  }, [revenueMode, weeklyRevenue, monthlyRevenue]);

  // Draw charts with Chart.js from CDN
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

      // Destroy old chart instances to avoid memory leaks
      Object.values(chartObjs.current).forEach((c) => c?.destroy?.());
      chartObjs.current = {};

      // Doughnut: Auctions by status
      if (chartRefs.status.current) {
        chartObjs.current.status = new Chart(chartRefs.status.current.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: ["Live", "Upcoming", "Ended"],
            datasets: [
              {
                data: [statusCounts.live, statusCounts.up, statusCounts.ended],
                backgroundColor: ["rgba(46, 204, 113, .8)", "rgba(52, 152, 219, .8)", "rgba(231, 76, 60, .8)"],
                borderColor: ["rgba(46, 204, 113, 1)", "rgba(52, 152, 219, 1)", "rgba(231, 76, 60, 1)"],
                borderWidth: 1,
              },
            ],
          },
          options: { plugins: { legend: { position: "bottom", labels: { color: "#f5f5f5" } } } },
        });
      }

      // Bar: Revenue (weekly or monthly, using paid items only)
      if (chartRefs.revenue.current) {
        const src = revenueMode === "weekly" ? weeklyRevenue : monthlyRevenue;
        chartObjs.current.revenue = new Chart(chartRefs.revenue.current.getContext("2d"), {
          type: "bar",
          data: {
            labels: src.labels,
            datasets: [
              {
                label: revenueMode === "weekly" ? "Weekly Revenue ($)" : "Monthly Revenue ($)",
                data: src.data,
                backgroundColor: "rgba(212, 175, 55, 0.35)",
                borderColor: "#d4af37",
                borderWidth: 1.5,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#f5f5f5" } } },
            scales: {
              x: { ticks: { color: "#b0b0b0", maxRotation: 0, autoSkip: true }, grid: { color: "rgba(255,255,255,.08)" } },
              y: { ticks: { color: "#b0b0b0" }, grid: { color: "rgba(255,255,255,.08)" }, beginAtZero: true },
            },
          },
        });
      }
    };

    draw();

    // Cleanup charts on unmount or when data changes
    return () => {
      Object.values(chartObjs.current).forEach((c) => c?.destroy?.());
      chartObjs.current = {};
    };
  }, [statusCounts, weeklyRevenue, monthlyRevenue, revenueMode]);

  /* ========== Widgets (paid items only for income and sold) ========== */

  // Sum of paid auctions only
  const incomeOnlyPaid = useMemo(() => {
    if (!overview.history?.length) return 0;
    return overview.history.reduce((sum, h) => {
      if (!isPaid(h)) return sum;
      const amount = h.finalPrice != null ? Number(h.finalPrice) : Number(h.currentPrice || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [overview.history, winStatusMap]);

  // Count of paid auctions only
  const itemsSoldPaid = useMemo(() => {
    if (!overview.history?.length) return 0;
    return overview.history.reduce((count, h) => count + (isPaid(h) ? 1 : 0), 0);
  }, [overview.history, winStatusMap]);

  /* ===================== UI ===================== */

  return (
    <>
      {/* Background particles go behind all content */}
      <div id="particles-js" />

      <Header />
      <div className="sac-container">
        <SellerSidebar active="auctioncontrol" />

        <main className="sac-content">
          {/* Top header with page title and a button to create a new auction */}
          <div className="sac-header">
            <h2 className="sac-title">Seller • Auction Control</h2>
            <button className="sac-btn" onClick={() => setCreateOpen(true)}>
              <i className="fa-solid fa-plus" /> New Auction
            </button>
          </div>

          {/* Filters bar: search text, type dropdown, status dropdown */}
          <div className="sac-filters">
            <div className="sac-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                placeholder="Search auctions..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="sac-select">
              <button type="button" className="sac-select__btn">
                <span>{type === "all" ? "All Types" : type[0].toUpperCase() + type.slice(1)}</span>
                <i className="fa-solid fa-chevron-down" />
              </button>
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Gem Type">
                <option value="all">All Types</option>
                <option value="sapphire">Sapphire</option>
                <option value="ruby">Ruby</option>
                <option value="emerald">Emerald</option>
                <option value="diamond">Diamond</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="sac-select">
              <button type="button" className="sac-select__btn">
                <span>{status === "all" ? "All Statuses" : status[0].toUpperCase() + status.slice(1)}</span>
                <i className="fa-solid fa-chevron-down" />
              </button>
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                <option value="all">All Statuses</option>
                <option value="live">Live</option>
                <option value="upcoming">Upcoming</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>

          {/* Overview widgets: income and items sold are paid-only */}
          <section className="sac-overview">
            <Widget icon="fa-coins" label="Total Income" value={fmtMoney(incomeOnlyPaid)} />
            <Widget icon="fa-gavel" label="Total Auctions" value={overview.totals.totalAuctions} />
            <Widget icon="fa-hourglass-half" label="Ongoing" value={overview.totals.ongoing} />
            <Widget icon="fa-gem" label="Items Sold" value={itemsSoldPaid} />
          </section>

          {/* Charts section: status doughnut and revenue bar */}
          <div className="sac-charts">
            <div className="sac-chart-card">
              <h3 className="sac-chart-title">Auctions by Status</h3>
              <canvas ref={chartRefs.status} />
            </div>

            <div className="sac-chart-card">
              <div className="sac-chart-head">
                <h3 className="sac-chart-title">Revenue</h3>
                <div className="sac-chart-tabs">
                  <button
                    className={revenueMode === "weekly" ? "is-active" : ""}
                    onClick={() => setRevenueMode("weekly")}
                    type="button"
                  >
                    Weekly
                  </button>
                  <button
                    className={revenueMode === "monthly" ? "is-active" : ""}
                    onClick={() => setRevenueMode("monthly")}
                    type="button"
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Small KPIs that summarize the current and previous bucket */}
              <div className="sac-metrics">
                <div className="sac-metric">
                  <div className="sac-metric-label">{revenueMode === "weekly" ? "This Week" : "This Month"}</div>
                  <div className="sac-metric-value">{fmtMoney(revenueSummary.current)}</div>
                </div>
                <div className="sac-metric">
                  <div className="sac-metric-label">{revenueMode === "weekly" ? "Last Week" : "Last Month"}</div>
                  <div className="sac-metric-value">{fmtMoney(revenueSummary.previous)}</div>
                </div>
                <div className="sac-metric">
                  <div className="sac-metric-label">Change</div>
                  <div
                    className={
                      "sac-trend " + (revenueSummary.delta > 0 ? "up" : revenueSummary.delta < 0 ? "down" : "flat")
                    }
                    title={`${revenueSummary.delta.toFixed(1)}%`}
                  >
                    {revenueSummary.delta > 0 ? "▲" : revenueSummary.delta < 0 ? "▼" : "▬"}{" "}
                    {Math.abs(revenueSummary.delta).toFixed(1)}%
                  </div>
                </div>
              </div>

              <canvas ref={chartRefs.revenue} />
            </div>
          </div>

          {/* Live section */}
          {showLive && (
            <Section title="Live Auctions">
              <div className="sac-grid">
                {liveFiltered.length === 0 ? (
                  <p className="sac-empty">No matching live auctions.</p>
                ) : (
                  liveFiltered.map((a) => <LiveCard key={a._id} a={a} onOpen={() => openLive(a)} />)
                )}
              </div>
            </Section>
          )}

          {/* Upcoming section */}
          {showUpcoming && (
            <Section title="Upcoming Auctions">
              <div className="sac-grid">
                {upcomingFiltered.length === 0 ? (
                  <p className="sac-empty">No matching upcoming auctions.</p>
                ) : (
                  upcomingFiltered.map((a) => <UpcomingCard key={a._id} a={a} onOpen={() => openUpcoming(a)} />)
                )}
              </div>
            </Section>
          )}

          {/* Ended section: table shows only paid items */}
          {showEnded && (
            <Section title="Auction History">
              <div className="sac-table-wrap">
                <table className="sac-table">
                  <thead>
                    <tr>
                      <th>Gem</th>
                      <th>Type</th>
                      <th>Final Price</th>
                      <th>Ended</th>
                      <th>Winner</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPaidFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="sac-empty">No paid history items match your filters.</td>
                      </tr>
                    ) : (
                      historyPaidFiltered.map((h) => (
                        <tr key={h._id}>
                          <td>{h.title}</td>
                          <td>{h.type}</td>
                          <td className="sac-price">{fmtMoney(h.finalPrice ?? h.currentPrice ?? 0)}</td>
                          <td>{fmtDateTime(h.endTime)}</td>
                          <td className="sac-winner">{h.winnerName || "-"}</td>
                          <td>
                            <button className="sac-btn-outline" onClick={() => openEnded(h)}>
                              <i className="fa-solid fa-eye" /> Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </main>
      </div>

      {/* Details drawer for viewing or editing an auction */}
      <DetailsDrawer
        open={openDrawer}
        a={drawerAuction}
        mode={drawerMode}
        onClose={() => setOpenDrawer(false)}
        editForm={editForm}
        setEditForm={setEditForm}
        onSaveUpcoming={saveUpcoming}
        onDeleteUpcoming={deleteUpcoming}
      />

      {/* Create auction modal dialog */}
      <CreateAuctionModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </>
  );
}

/* ===================== Reusable Pieces ===================== */

// Simple wrapper to give sections a title and underline
function Section({ title, children }) {
  return (
    <section className="sac-section">
      <div className="sac-section-title">
        <h2>{title}</h2>
        <span className="sac-underline" />
      </div>
      {children}
    </section>
  );
}

// Small widget used in the overview area
function Widget({ icon, label, value }) {
  return (
    <div className="sac-widget">
      <i className={`fa-solid ${icon}`} />
      <h3>{label}</h3>
      <div className="sac-widget-value">{value}</div>
    </div>
  );
}

// Live auction card
function LiveCard({ a, onOpen }) {
  const { total, days, hours, minutes, seconds } = useCountdown(a.endTime);
  const ended = total <= 0;
  return (
    <div className="sac-card">
      <div className="sac-badge sac-badge-live">LIVE • {a.bidsCount || 0} BIDS</div>
      <img className="sac-img" src={asset(a.imageUrl)} alt={a.title} />
      <h3 className="sac-card-title">{a.title}</h3>
      <p className="sac-card-sub">
        <i className="fa-solid fa-gem" /> {a.type}
      </p>
      <p className="sac-desc">{a.description}</p>
      <div className="sac-price">Current: {fmtMoney(a.currentPrice)}</div>
      <p className="sac-line">
        <strong>Ends:</strong> {fmtDateTime(a.endTime)}
      </p>
      <div className="sac-countdown">
        {ended ? (
          <span className="sac-muted">Auction ended</span>
        ) : (
          <>
            <TimeBox v={days} lbl="Days" />
            <TimeBox v={hours} lbl="Hours" />
            <TimeBox v={minutes} lbl="Mins" />
            <TimeBox v={seconds} lbl="Secs" />
          </>
        )}
      </div>
      <div className="sac-actions">
        <button className="sac-btn-outline sac-btn-wide" onClick={onOpen}>
          <i className="fa-solid fa-eye" /> View Details
        </button>
      </div>
    </div>
  );
}

// Upcoming auction card
function UpcomingCard({ a, onOpen }) {
  const { total, days, hours, minutes, seconds } = useCountdown(a.startTime);
  const started = total <= 0;
  return (
    <div className="sac-card">
      <div className={`sac-badge ${started ? "sac-badge-live" : "sac-badge-upcoming"}`}>
        {started ? "STARTED" : "UPCOMING"}
      </div>
      <img className="sac-img" src={asset(a.imageUrl)} alt={a.title} />
      <h3 className="sac-card-title">{a.title}</h3>
      <p className="sac-card-sub">
        <i className="fa-solid fa-gem" /> {a.type}
      </p>
      <p className="sac-desc">{a.description}</p>
      <div className="sac-price">Base: {fmtMoney(a.basePrice)}</div>
      <p className="sac-line"><strong>Start:</strong> {fmtDateTime(a.startTime)}</p>
      <p className="sac-line"><strong>End:</strong> {fmtDateTime(a.endTime)}</p>
      <div className="sac-countdown">
        {started ? (
          <span className="sac-muted">Auction started</span>
        ) : (
          <>
            <TimeBox v={days} lbl="Days" />
            <TimeBox v={hours} lbl="Hours" />
            <TimeBox v={minutes} lbl="Mins" />
            <TimeBox v={seconds} lbl="Secs" />
          </>
        )}
      </div>
      <div className="sac-actions">
        <button className="sac-btn-outline sac-btn-wide" onClick={onOpen}>
          <i className="fa-solid fa-pen-to-square" /> Details / Edit
        </button>
      </div>
    </div>
  );
}

/* ============ Drawer ============ */

// Side drawer for details and editing
function DetailsDrawer({
  open,
  a,
  mode,
  onClose,
  editForm,
  setEditForm,
  onSaveUpcoming,
  onDeleteUpcoming,
}) {
  const [bidders, setBidders] = useState([]);
  const [loadingBidders, setLoadingBidders] = useState(false);

  // Load last bids when the drawer opens for live/ended auctions
  useEffect(() => {
    let active = true;
    async function loadBidders() {
      if (!a?._id || mode === "upcoming") {
        setBidders([]);
        return;
      }
      try {
        setLoadingBidders(true);
        const data = await request(`/api/bids/auction/${a._id}?limit=10&sort=desc`);
        if (!active) return;
        const rows = (data?.items || data || []).map((x, i) => ({
          id: x._id || `${i}`,
          name: x.userName || x.user?.fullName || "Unknown",
          email: x.user?.email || x.userEmail || "",
          amount: x.amount || x.bid || 0,
          time: x.createdAt || x.time || x.timestamp || null,
        }));
        setBidders(rows);
      } catch {
        if (active) setBidders([]);
      } finally {
        if (active) setLoadingBidders(false);
      }
    }
    if (open) loadBidders();
    return () => {
      active = false;
    };
  }, [open, a?._id, mode]);

  return (
    <>
      <div className={`sac-drawer-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`sac-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="sac-drawer-header">
          <h3>{a ? a.title : "Details"}</h3>
          <button className="sac-icon-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="sac-drawer-body">
          {!a ? null : mode === "upcoming" ? (
            <>
              {/* Upcoming edit form */}
              <img className="sac-drawer-img" src={asset(a.imageUrl)} alt={a.title} />
              <div className="sac-form-grid">
                <div className="sac-form-group sac-col-full">
                  <label className="sac-required">Gem Name</label>
                  <input
                    value={editForm?.title || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="sac-form-group">
                  <label className="sac-required">Type</label>
                  <select
                    value={editForm?.type || "sapphire"}
                    onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="sapphire">Sapphire</option>
                    <option value="ruby">Ruby</option>
                    <option value="emerald">Emerald</option>
                    <option value="diamond">Diamond</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="sac-form-group">
                  <label className="sac-required">Base Price</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm?.basePrice || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, basePrice: e.target.value }))}
                  />
                </div>
                <div className="sac-form-group sac-col-full">
                  <label>Description</label>
                  <textarea
                    value={editForm?.description || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="sac-form-group">
                  <label className="sac-required">Start</label>
                  <input
                    type="datetime-local"
                    value={editForm?.startTime || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
                <div className="sac-form-group">
                  <label className="sac-required">End</label>
                  <input
                    type="datetime-local"
                    value={editForm?.endTime || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Read-only details for live/ended */}
              <img className="sac-drawer-img" src={asset(a.imageUrl)} alt={a.title} />
              <div className="sac-drawer-grid">
                <div><span className="sac-label">Gem:</span> {a.title}</div>
                <div><span className="sac-label">Type:</span> {a.type}</div>
                <div><span className="sac-label">Base:</span> {fmtMoney(a.basePrice)}</div>
                <div><span className="sac-label">Current/Final:</span> {fmtMoney(a.currentPrice ?? a.finalPrice)}</div>
                {a.startTime && <div><span className="sac-label">Start:</span> {fmtDateTime(a.startTime)}</div>}
                {a.endTime && <div><span className="sac-label">End:</span> {fmtDateTime(a.endTime)}</div>}
              </div>
              {a.description && <p className="sac-drawer-desc">{a.description}</p>}

              {/* Recent bidders table */}
              <h4 className="sac-subtitle" style={{ marginTop: 12 }}>Recent Bidders</h4>
              <div className="sac-table-wrap">
                <table className="sac-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Bidder</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingBidders ? (
                      <tr><td colSpan={5} className="sac-empty">Loading bidders…</td></tr>
                    ) : bidders.length === 0 ? (
                      <tr><td colSpan={5} className="sac-empty">No bids yet.</td></tr>
                    ) : (
                      bidders.map((b, idx) => (
                        <tr key={b.id}>
                          <td>{idx + 1}</td>
                          <td>{b.name}</td>
                          <td className="sac-price">{fmtMoney(b.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer: edit actions for upcoming, close for others */}
        <div className="sac-drawer-footer">
          {mode === "upcoming" ? (
            <>
              <button className="sac-btn-danger" onClick={onDeleteUpcoming}>
                <i className="fa-solid fa-trash" /> Delete
              </button>
              <button className="sac-btn" onClick={onSaveUpcoming}>
                <i className="fa-solid fa-floppy-disk" /> Save Changes
              </button>
            </>
          ) : (
            <button className="sac-btn-outline" onClick={onClose}>Close</button>
          )}
        </div>
      </aside>
    </>
  );
}

/* ============ Create Auction Modal ============ */

// Modal to create a new auction in four simple steps
function CreateAuctionModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "",
    type: "",
    description: "",
    imageDataUrl: "",
    file: null,
    basePrice: "",
    startTime: "",
    endTime: "",
  });
  const fileRef = useRef(null);

  // Reset the form when the modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setForm({
        title: "",
        type: "",
        description: "",
        imageDataUrl: "",
        file: null,
        basePrice: "",
        startTime: "",
        endTime: "",
      });
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open]);

  // Helper to update one field in the form
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Validation flags to enable Next buttons
  const valid1 = form.title.trim() && form.type && form.description.trim() && (form.file || form.imageDataUrl);
  const valid2 = Number(form.basePrice) > 0;
  const valid3 = form.startTime && form.endTime && new Date(form.startTime) < new Date(form.endTime);

  // Handle an image file dropped or selected
  const handleFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return alert("Only image files are allowed.");
    if (file.size > 5 * 1024 * 1024) return alert("Image must be under 5MB.");
    const r = new FileReader();
    r.onload = (e) => setField("imageDataUrl", String(e.target?.result || ""));
    r.readAsDataURL(file);
    setField("file", file);
  };

  // Submit the FormData to the API to create the auction
  async function submit(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("type", form.type);
    fd.append("description", form.description.trim());
    fd.append("basePrice", String(form.basePrice));
    fd.append("startTime", form.startTime);
    fd.append("endTime", form.endTime);
    if (form.file) fd.append("image", form.file);
    else if (form.imageDataUrl) fd.append("imageUrl", form.imageDataUrl);

    await request("/api/auctions", { method: "POST", body: fd });
    alert("Auction created successfully!");
    onClose();
    onCreated?.();
  }

  return (
    <>
      {/* The dimmed background behind the modal */}
      <div className={`sac-modal-overlay ${open ? "open" : ""}`} onClick={onClose} />

      {/* The modal itself */}
      <div className={`sac-modal ${open ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="sac-modal-header">
          <h2>Create Auction</h2>
          <button className="sac-icon-btn" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

        {/* Stepper shows which step is active */}
        <div className="sac-steps">
          {["Gem Details", "Pricing", "Schedule", "Review"].map((label, i) => {
            const n = i + 1;
            const cls = n === step ? "active" : n < step ? "completed" : "";
            return (
              <div className={`sac-step ${cls}`} key={label}>
                <div className="sac-step-num">{n}</div>
                <div className="sac-step-text">{label}</div>
              </div>
            );
          })}
        </div>

        {/* The form body switches based on the current step */}
        <form className="sac-modal-body" onSubmit={submit}>
          {/* Step 1: basic gem details and image */}
          {step === 1 && (
            <div className="sac-form-grid">
              <div className="sac-form-group sac-col-full">
                <label className="sac-required">Gem Name</label>
                <input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g., Royal Blue Sapphire" />
              </div>

              <div className="sac-form-group">
                <label className="sac-required">Gem Type</label>
                <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                  <option value="">Select Gem Type</option>
                  <option value="sapphire">Sapphire</option>
                  <option value="ruby">Ruby</option>
                  <option value="emerald">Emerald</option>
                  <option value="diamond">Diamond</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="sac-form-group sac-col-full">
                <label className="sac-required">Description</label>
                <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Describe the gem..." />
              </div>

              <div className="sac-form-group sac-col-full">
                <label className="sac-required">Image</label>
                {!form.imageDataUrl ? (
                  <div
                    className="sac-upload"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFile(e.dataTransfer.files?.[0]);
                    }}
                  >
                    <i className="fa-solid fa-cloud-arrow-up sac-upload-icon" />
                    <p className="sac-upload-text">Drag & drop here or <span>browse</span></p>
                    <p className="sac-upload-hint">JPG/PNG up to 5MB</p>
                  </div>
                ) : (
                  <div className="sac-image-preview">
                    <img src={form.imageDataUrl} alt="Preview" />
                    <div className="sac-image-actions">
                      <button type="button" className="sac-btn-secondary" onClick={() => fileRef.current?.click()}>
                        <i className="fa-solid fa-pen-to-square" /> Change
                      </button>
                      <button
                        type="button"
                        className="sac-btn-danger"
                        onClick={() => {
                          setField("imageDataUrl", "");
                          setField("file", null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                      >
                        <i className="fa-solid fa-trash" /> Remove
                      </button>
                    </div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
              </div>

              <div className="sac-form-nav sac-col-full">
                <button type="button" className="sac-btn-secondary" onClick={onClose}>Cancel</button>
                <button type="button" className="sac-btn" onClick={() => setStep(2)} disabled={!valid1}>Next</button>
              </div>
            </div>
          )}

          {/* Step 2: pricing */}
          {step === 2 && (
            <div className="sac-form-grid">
              <div className="sac-form-group sac-col-full">
                <label className="sac-required">Starting Price (USD)</label>
                <div className="sac-price-wrap">
                  <input type="number" min="1" value={form.basePrice} onChange={(e) => setField("basePrice", e.target.value)} placeholder="e.g., 8500" />
                </div>
              </div>
              <div className="sac-form-nav sac-col-full">
                <button type="button" className="sac-btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="sac-btn" onClick={() => setStep(3)} disabled={!valid2}>Next</button>
              </div>
            </div>
          )}

          {/* Step 3: schedule */}
          {step === 3 && (
            <div className="sac-form-grid">
              <div className="sac-form-group">
                <label className="sac-required">Start Time</label>
                <input type="datetime-local" value={form.startTime} onChange={(e) => setField("startTime", e.target.value)} />
              </div>
              <div className="sac-form-group">
                <label className="sac-required">End Time</label>
                <input type="datetime-local" value={form.endTime} onChange={(e) => setField("endTime", e.target.value)} />
              </div>
              <div className="sac-form-nav sac-col-full">
                <button type="button" className="sac-btn-secondary" onClick={() => setStep(2)}>Back</button>
                <button type="button" className="sac-btn" onClick={() => setStep(4)} disabled={!valid3}>Next</button>
              </div>
            </div>
          )}

          {/* Step 4: review and submit */}
          {step === 4 && (
            <div className="sac-form-grid">
              <div className="sac-review sac-col-full">
                <h4>Review</h4>
                <div className="sac-review-grid">
                  <div><span className="sac-review-label">Gem:</span> {form.title}</div>
                  <div><span className="sac-review-label">Type:</span> {form.type || "-"}</div>
                  <div><span className="sac-review-label">Start Price:</span> {fmtMoney(form.basePrice || 0)}</div>
                  <div><span className="sac-review-label">Start:</span> {form.startTime ? fmtDateTime(form.startTime) : "-"}</div>
                  <div><span className="sac-review-label">End:</span> {form.endTime ? fmtDateTime(form.endTime) : "-"}</div>
                </div>
                {form.description && <p className="sac-review-desc">{form.description}</p>}
                {form.imageDataUrl && <img className="sac-review-img" src={form.imageDataUrl} alt="Gem" />}
              </div>
              <div className="sac-form-nav sac-col-full">
                <button type="button" className="sac-btn-secondary" onClick={() => setStep(3)}>Back</button>
                <button type="submit" className="sac-btn">Create Auction</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
