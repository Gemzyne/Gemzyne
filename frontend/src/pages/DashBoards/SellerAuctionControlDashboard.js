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
// - History table shows Paid / Pending / Expired / Cancelled
// - NEW: Live bid counts auto-refresh for ongoing auctions
// ----------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import SellerSidebar from "../../Components/SellerSidebar";
import "../DashBoards/SellerAuctionControlDashboard.css";
import { request } from "../../api";

/* ===================== Helpers ===================== */

const BACKEND = process.env.REACT_APP_API_URL || "http://localhost:5000";

const asset = (p) => {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;
  return `${BACKEND}${p.startsWith("/") ? "" : "/"}${p}`;
};

const fmtMoney = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// A tiny countdown hook (re-runs every second)
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

const TimeBox = ({ v, lbl }) => (
  <div className="sac-timebox">
    <div className="sac-timebox-value">{String(v).padStart(2, "0")}</div>
    <div className="sac-timebox-label">{lbl}</div>
  </div>
);

/* ---- Revenue grouping helpers ---- */

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

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: wk };
}

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

  const [overview, setOverview] = useState({
    totals: { income: 0, totalAuctions: 0, ongoing: 0, sold: 0 },
    live: [],
    upcoming: [],
    history: [],
  });

  // NEW: live bid counts map: { [auctionId]: number }
  const [liveBidCounts, setLiveBidCounts] = useState({});

  const [winStatusMap, setWinStatusMap] = useState({});
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const [openDrawer, setOpenDrawer] = useState(false);
  const [drawerAuction, setDrawerAuction] = useState(null);
  const [drawerMode, setDrawerMode] = useState("live"); // "live" | "upcoming" | "ended"
  const [createOpen, setCreateOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Load overview (and winner statuses)
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
      // Also hydrate live bid counts right after we load
      await hydrateLiveBidCounts(next.live);
    } catch {
      setOverview((o) => ({ ...o, live: [], upcoming: [], history: [] }));
      setWinStatusMap({});
      setLiveBidCounts({});
    }
  }

  // Initial load + poll overview every 10s (keeps lists fresh)
  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  // ---------- Winner/payment status hydration for ended auctions ----------
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

  // ---------- NEW: Live bids count hydration ----------
  // This tries multiple API shapes:
  // 1) /api/bids/auction/:id/count -> { count }
  // 2) /api/bids/auction/:id?limit=1&sort=desc -> look for total/count or fallback to items length
  async function fetchBidCountForAuction(id) {
    // Try the dedicated count endpoint first
    try {
      const c = await request(`/api/bids/auction/${id}/count`);
      if (typeof c?.count === "number") return c.count;
    } catch {
      // continue to fallback
    }

    // Fallback: ask for one item but expect "total" in payload
    try {
      const res = await request(`/api/bids/auction/${id}?limit=1&sort=desc`);
      if (typeof res?.total === "number") return res.total;
      if (typeof res?.count === "number") return res.count;
      if (Array.isArray(res?.items)) {
        // If backend doesn't include total, we only know we got <=1 item.
        // This is a fallback best-effort: 0 or 1.
        return res.items.length;
      }
    } catch {
      // ignore
    }

    // As a last resort, return 0 (unknown)
    return 0;
  }

  async function hydrateLiveBidCounts(liveList) {
    if (!Array.isArray(liveList) || liveList.length === 0) {
      setLiveBidCounts({});
      return;
    }
    const ids = Array.from(new Set(liveList.map((a) => a._id)));
    const results = await Promise.allSettled(ids.map((id) => fetchBidCountForAuction(id)));
    const map = {};
    results.forEach((r, i) => {
      const id = ids[i];
      map[id] = r.status === "fulfilled" ? Number(r.value || 0) : 0;
    });
    setLiveBidCounts(map);
  }

  // Re-hydrate bid counts when "live" list changes
  useEffect(() => {
    hydrateLiveBidCounts(overview.live);
  }, [overview.live]);

  // Also poll bid counts every 5 seconds for snappier updates
  useEffect(() => {
    const t = setInterval(() => hydrateLiveBidCounts(overview.live), 5000);
    return () => clearInterval(t);
  }, [overview.live]);

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

  /* ========== Paid detection & status derivation ========== */

  const isPaid = (row) => {
    const win = winStatusMap[row._id] || {};
    const purchaseStatus = (win.purchaseStatus || row.purchaseStatus || row.winnerStatus || "").toLowerCase();
    return purchaseStatus === "paid" || !!win.paymentId || !!row.paymentId;
  };

  const statusFor = (row) => {
    const win = winStatusMap[row._id] || {};
    const ps = (win.purchaseStatus || row.purchaseStatus || "").toLowerCase();

    if (ps === "paid" || !!win.paymentId || !!row.paymentId) {
      return { label: "Paid", cls: "paid" };
    }
    const deadline = win.purchaseDeadline || row.purchaseDeadline;
    if (deadline && Date.parse(deadline) <= Date.now()) {
      return { label: "Expired", cls: "expired" };
    }
    if (ps === "cancelled") {
      return { label: "Cancelled", cls: "cancelled" };
    }
    return { label: "Pending", cls: "pending" };
  };

  /* ========== Filters for lists and table ========== */

  const norm = (s) => (s || "").toLowerCase();
  const match = (a) =>
    (!q || norm(a.title).includes(norm(q)) || norm(a.description).includes(norm(q))) &&
    (type === "all" || a.type === type);

  const liveFiltered = useMemo(() => overview.live.filter(match), [match, overview.live]);
  const upcomingFiltered = useMemo(() => overview.upcoming.filter(match), [match, overview.upcoming]);
  const historyFiltered = useMemo(() => overview.history.filter(match), [match, overview.history]);

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

  const statusCounts = useMemo(() => {
    const live = liveFiltered.length;
    const up = upcomingFiltered.length;
    const ended = historyFiltered.length;
    return { live, up, ended };
  }, [liveFiltered, upcomingFiltered, historyFiltered]);

  const paidHistory = useMemo(
    () => (overview.history || []).filter((h) => isPaid(h)),
    [overview.history, winStatusMap]
  );

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

  const [weeklyApi, setWeeklyApi] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await request("/api/reports/weekly-revenue"); // optional feed
        if (mounted && Array.isArray(res)) setWeeklyApi(res);
      } catch {
        setWeeklyApi(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  const revenueSummary = useMemo(() => {
    const src = revenueMode === "weekly" ? weeklyRevenue : monthlyRevenue;
    const arr = src.data || [];
    const n = arr.length;
    const current = n ? arr[n - 1] : 0;
    const previous = n > 1 ? arr[n - 2] : 0;
    const delta = pctDelta(current, previous);
    return { current, previous, delta };
  }, [revenueMode, weeklyRevenue, monthlyRevenue]);

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

      Object.values(chartObjs.current).forEach((c) => c?.destroy?.());
      chartObjs.current = {};

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
    return () => {
      Object.values(chartObjs.current).forEach((c) => c?.destroy?.());
      chartObjs.current = {};
    };
  }, [statusCounts, weeklyRevenue, monthlyRevenue, revenueMode]);

  /* ========== Widgets (paid items only for income and sold) ========== */

  const incomeOnlyPaid = useMemo(() => {
    if (!overview.history?.length) return 0;
    return overview.history.reduce((sum, h) => {
      if (!isPaid(h)) return sum;
      const amount = h.finalPrice != null ? Number(h.finalPrice) : Number(h.currentPrice || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [overview.history, winStatusMap]);

  const itemsSoldPaid = useMemo(() => {
    if (!overview.history?.length) return 0;
    return overview.history.reduce((count, h) => count + (isPaid(h) ? 1 : 0), 0);
  }, [overview.history, winStatusMap]);

  /* ===================== UI ===================== */

  return (
    <>
      <div id="particles-js" />

      <Header />
      <div className="sac-container">
        <SellerSidebar active="auctioncontrol" />

        <main className="sac-content">
          <div className="sac-header">
            <h2 className="sac-title">Seller • Auction Control</h2>
            <button className="sac-btn" onClick={() => setCreateOpen(true)}>
              <i className="fa-solid fa-plus" /> New Auction
            </button>
          </div>

          {/* Filters */}
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

          {/* Overview widgets */}
          <section className="sac-overview">
            <Widget icon="fa-coins" label="Total Income" value={fmtMoney(incomeOnlyPaid)} />
            <Widget icon="fa-gavel" label="Total Auctions" value={overview.totals.totalAuctions} />
            <Widget icon="fa-hourglass-half" label="Ongoing" value={overview.totals.ongoing} />
            <Widget icon="fa-gem" label="Items Sold" value={itemsSoldPaid} />
          </section>

          {/* Charts */}
          <div className="sac-charts">
            <div className="sac-chart-card">
              <h3 className="sac-chart-title">Auctions by Status</h3>
              <canvas ref={chartRefs.status} />
            </div>

            <div className="sac-chart-card">
              <div className="sac-chart-head">
                <h3 className="sac-chart-title">Revenue</h3>
                <div className="sac-chart-tabs">
                  <button className={revenueMode === "weekly" ? "is-active" : ""} onClick={() => setRevenueMode("weekly")} type="button">
                    Weekly
                  </button>
                  <button className={revenueMode === "monthly" ? "is-active" : ""} onClick={() => setRevenueMode("monthly")} type="button">
                    Monthly
                  </button>
                </div>
              </div>

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
                  liveFiltered.map((a) => (
                    <LiveCard
                      key={a._id}
                      a={a}
                      // Prefer liveBidCounts (fresh), fallback to a.bidsCount if API already provided one
                      count={typeof liveBidCounts[a._id] === "number" ? liveBidCounts[a._id] : (a.bidsCount || 0)}
                      onOpen={() => openLive(a)}
                    />
                  ))
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

          {/* Ended section: ALL ended items with status */}
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
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="sac-empty">No history items match your filters.</td>
                      </tr>
                    ) : (
                      historyFiltered.map((h) => {
                        const st = statusFor(h);
                        return (
                          <tr key={h._id}>
                            <td>{h.title}</td>
                            <td>{h.type}</td>
                            <td className="sac-price">{fmtMoney(h.finalPrice ?? h.currentPrice ?? 0)}</td>
                            <td>{fmtDateTime(h.endTime)}</td>
                            <td className="sac-winner">{h.winnerName || "-"}</td>
                            <td><span className={`sac-status sac-status--${st.cls}`}>{st.label}</span></td>
                            <td>
                              <button className="sac-btn-outline" onClick={() => openEnded(h)}>
                                <i className="fa-solid fa-eye" /> Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </main>
      </div>

      {/* Drawer */}
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

      {/* Create auction modal */}
      <CreateAuctionModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </>
  );
}

/* ===================== Reusable Pieces ===================== */

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

function Widget({ icon, label, value }) {
  return (
    <div className="sac-widget">
      <i className={`fa-solid ${icon}`} />
      <h3>{label}</h3>
      <div className="sac-widget-value">{value}</div>
    </div>
  );
}

// ==== Live card now accepts `count` prop ====
function LiveCard({ a, onOpen, count = 0 }) {
  const { total, days, hours, minutes, seconds } = useCountdown(a.endTime);
  const ended = total <= 0;
  return (
    <div className="sac-card">
      <div className="sac-badge sac-badge-live">LIVE • {count} {count === 1 ? "BID" : "BIDS"}</div>
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

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const valid1 = form.title.trim() && form.type && form.description.trim() && (form.file || form.imageDataUrl);
  const valid2 = Number(form.basePrice) > 0;
  const valid3 = form.startTime && form.endTime && new Date(form.startTime) < new Date(form.endTime);

  const handleFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return alert("Only image files are allowed.");
    if (file.size > 5 * 1024 * 1024) return alert("Image must be under 5MB.");
    const r = new FileReader();
    r.onload = (e) => setField("imageDataUrl", String(e.target?.result || ""));
    r.readAsDataURL(file);
    setField("file", file);
  };

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
      <div className={`sac-modal-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`sac-modal ${open ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="sac-modal-header">
          <h2>Create Auction</h2>
          <button className="sac-icon-btn" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

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

        <form className="sac-modal-body" onSubmit={submit}>
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
