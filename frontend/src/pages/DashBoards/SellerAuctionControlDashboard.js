// src/pages/DashBoards/SellerAuctionControlDashboard.jsx
// ----------------------------------------------------------------------------
// Seller • Auction Control Dashboard
// - Particles background
// - Overview widgets (Total Income & Items Sold use ONLY paid items)
// - Filters (search/type/status)
// - Charts (weekly/monthly revenue with summary)  ← status chart removed
// - Live / Upcoming / Ended sections
// - Drawer (details + recent bidders; edit in "upcoming" mode)
// - Create Auction modal (4 steps) with validations + popup messages
// - History table shows Paid / Pending / Expired / Cancelled
// - Live bid counts auto-refresh for ongoing auctions
// ----------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import SellerSidebar from "../../Components/SellerSidebar";
import Footer from "../../Components/Footer";
import "../DashBoards/SellerAuctionControlDashboard.css";
import { request } from "../../api";

/* ===================== PAGE (top of file) ===================== */

export default function SellerAuctionControlDashboard() {
  const navigate = useNavigate();

  // ---- route guard ----
  useEffect(() => {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return navigate("/login", { replace: true });
    if (user.role !== "seller") return navigate("/mainhome", { replace: true });
  }, [navigate]);

  // ---- particles bg ----
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

  /* ---- state ---- */
  const [overview, setOverview] = useState({
    totals: { income: 0, totalAuctions: 0, ongoing: 0, sold: 0 },
    live: [],
    upcoming: [],
    history: [],
  });
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

  // toasts + popup
  const { toasts, push, remove } = useToasts();
  const [popup, setPopup] = useState({ open: false, title: "", message: "", actions: [] });
  const openPopup = (title, message, actions) =>
    setPopup({ open: true, title, message, actions: actions || [] });
  const closePopup = () => setPopup((p) => ({ ...p, open: false }));
  const confirmAsync = (title, message, yes = "Yes", no = "No") =>
    new Promise((resolve) =>
      openPopup(title, message, [
        { label: no, kind: "secondary", onClick: () => (closePopup(), resolve(false)) },
        { label: yes, kind: "danger", onClick: () => (closePopup(), resolve(true)) },
      ])
    );

  /* ---- data load ---- */
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
      await hydrateLiveBidCounts(next.live);
    } catch {
      setOverview((o) => ({ ...o, live: [], upcoming: [], history: [] }));
      setWinStatusMap({});
      setLiveBidCounts({});
      push("Failed to load seller overview.", "error");
    }
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  // winner status hydration (ended)
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

  // live bids count hydration
  async function fetchBidCountForAuction(id) {
    try {
      const c = await request(`/api/bids/auction/${id}/count`);
      if (typeof c?.count === "number") return c.count;
    } catch {}
    try {
      const res = await request(`/api/bids/auction/${id}?limit=1&sort=desc`);
      if (typeof res?.total === "number") return res.total;
      if (typeof res?.count === "number") return res.count;
      if (Array.isArray(res?.items)) return res.items.length;
    } catch {}
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
  useEffect(() => {
    hydrateLiveBidCounts(overview.live);
  }, [overview.live]);
  useEffect(() => {
    const t = setInterval(() => hydrateLiveBidCounts(overview.live), 5000);
    return () => clearInterval(t);
  }, [overview.live]);

  // upcoming prefill
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

  /* ---- paid/status helpers ---- */
  const isPaid = (row) => {
    const win = winStatusMap[row._id] || {};
    const ps = (win.purchaseStatus || row.purchaseStatus || row.winnerStatus || "").toLowerCase();
    return ps === "paid" || !!win.paymentId || !!row.paymentId;
  };
  const statusFor = (row) => {
    const win = winStatusMap[row._id] || {};
    const ps = (win.purchaseStatus || row.purchaseStatus || "").toLowerCase();
    if (ps === "paid" || !!win.paymentId || !!row.paymentId) return { label: "Paid", cls: "paid" };
    const deadline = win.purchaseDeadline || row.purchaseDeadline;
    if (deadline && Date.parse(deadline) <= Date.now()) return { label: "Expired", cls: "expired" };
    if (ps === "cancelled") return { label: "Cancelled", cls: "cancelled" };
    return { label: "Pending", cls: "pending" };
  };

  /* ---- filters ---- */
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

  /* ---- chart (revenue only; paid items) ---- */
  const [revenueMode, setRevenueMode] = useState("weekly");
  const chartRefs = { revenue: useRef(null) };
  const chartObjs = useRef({});
  const paidHistory = useMemo(
    () => (overview.history || []).filter((h) => isPaid(h)),
    [overview.history, winStatusMap]
  );
  const monthlyRevenue = useMonthlyRevenue(paidHistory);
  const weeklyRevenue = useWeeklyRevenue(paidHistory);
  const revenueSummary = useRevenueSummary(revenueMode === "weekly" ? weeklyRevenue : monthlyRevenue);

  useEffect(() => {
    const ensure = () =>
      new Promise((resolve) => {
        if (window.Chart) return resolve();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = resolve;
        document.body.appendChild(s);
      });
    const draw = async () => {
      await ensure();
      const Chart = window.Chart;
      Object.values(chartObjs.current).forEach((c) => c?.destroy?.());
      chartObjs.current = {};

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
  }, [weeklyRevenue, monthlyRevenue, revenueMode]);

  /* ---- drawer actions with popup/confirm ---- */
  async function saveUpcoming() {
    try {
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
      push("Upcoming auction updated.", "success");
      await load();
    } catch (e) {
      openPopup("Update Failed", e?.message || "Could not update this auction.");
    }
  }

  async function deleteUpcoming() {
    const ok = await confirmAsync("Delete Auction", "Delete this upcoming auction?");
    if (!ok) return;
    try {
      const id = drawerAuction?._id;
      await request(`/api/auctions/${id}`, { method: "DELETE" });
      push("Auction deleted.", "success");
      setOpenDrawer(false);
      await load();
    } catch (e) {
      openPopup("Delete Failed", e?.message || "Could not delete this auction.");
    }
  }

  /* ===================== RENDER ===================== */

  return (
    <>
      <div id="particles-js" />
      <Header />

      {/* Toasts + Popup */}
      <ToastRack toasts={toasts} remove={remove} />
      <PopModal open={popup.open} title={popup.title} message={popup.message} actions={popup.actions} onClose={closePopup} />

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
              <input type="text" placeholder="Search auctions..." value={q} onChange={(e) => setQ(e.target.value)} />
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
            <Widget icon="fa-coins" label="Total Income" value={fmtMoney(sumRevenuePaid(overview.history, winStatusMap))} />
            <Widget icon="fa-gavel" label="Total Auctions" value={overview.totals.totalAuctions} />
            <Widget icon="fa-hourglass-half" label="Ongoing" value={overview.totals.ongoing} />
            <Widget icon="fa-gem" label="Items Sold" value={countPaid(overview.history, winStatusMap)} />
          </section>

          {/* Charts — only Revenue now */}
          <div className="sac-charts">
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

          {/* Live */}
          {(status === "all" || status === "live") && (
            <Section title="Live Auctions">
              <div className="sac-grid">
                {liveFiltered.length === 0 ? (
                  <p className="sac-empty">No matching live auctions.</p>
                ) : (
                  liveFiltered.map((a) => (
                    <LiveCard
                      key={a._id}
                      a={a}
                      count={typeof liveBidCounts[a._id] === "number" ? liveBidCounts[a._id] : a.bidsCount || 0}
                      onOpen={() => {
                        setDrawerAuction(a);
                        setDrawerMode("live");
                        setOpenDrawer(true);
                      }}
                    />
                  ))
                )}
              </div>
            </Section>
          )}

          {/* Upcoming */}
          {(status === "all" || status === "upcoming") && (
            <Section title="Upcoming Auctions">
              <div className="sac-grid">
                {upcomingFiltered.length === 0 ? (
                  <p className="sac-empty">No matching upcoming auctions.</p>
                ) : (
                  upcomingFiltered.map((a) => (
                    <UpcomingCard
                      key={a._id}
                      a={a}
                      onOpen={() => {
                        setDrawerAuction(a);
                        setDrawerMode("upcoming");
                        setOpenDrawer(true);
                      }}
                    />
                  ))
                )}
              </div>
            </Section>
          )}

          {/* Ended */}
          {(status === "all" || status === "ended") && (
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
                        <td colSpan={7} className="sac-empty">
                          No history items match your filters.
                        </td>
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
                            <td>
                              <span className={`sac-status sac-status--${st.cls}`}>{st.label}</span>
                            </td>
                            <td>
                              <button
                                className="sac-btn-outline"
                                onClick={() => {
                                  setDrawerAuction(h);
                                  setDrawerMode("ended");
                                  setOpenDrawer(true);
                                }}
                              >
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

      {/* Create modal with validations + popup/toast */}
      <CreateAuctionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
        push={push}
        openPopup={openPopup}
      />

      <Footer />
    </>
  );
}

/* ===================== SUB-COMPONENTS ===================== */

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

function LiveCard({ a, onOpen, count = 0 }) {
  const { total, days, hours, minutes, seconds } = useCountdown(a.endTime);
  const ended = total <= 0;
  return (
    <div className="sac-card">
      <div className="sac-badge sac-badge-live">LIVE • {count} {count === 1 ? "BID" : "BIDS"}</div>
      <img className="sac-img" src={asset(a.imageUrl)} alt={a.title} />
      <h3 className="sac-card-title">{a.title}</h3>
      <p className="sac-card-sub"><i className="fa-solid fa-gem" /> {a.type}</p>
      <p className="sac-desc">{a.description}</p>
      <div className="sac-price">Current: {fmtMoney(a.currentPrice)}</div>
      <p className="sac-line"><strong>Ends:</strong> {fmtDateTime(a.endTime)}</p>
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
      <p className="sac-card-sub"><i className="fa-solid fa-gem" /> {a.type}</p>
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

function CreateAuctionModal({ open, onClose, onCreated, push, openPopup }) {
  // safe fallbacks (never crash)
  const toast = push || (() => {});
  const showPopup =
    openPopup || ((t, m) => window.alert(`${t || "Notice"}\n\n${m || ""}`));

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
  const [warn, setWarn] = useState({});
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
      setWarn({});
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open]);

  const setField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    requestAnimationFrame(validateAll);
  };

  // validations with inline warnings + popup usage
  function validateAll() {
    const w = {};
    const price = Number(form.basePrice);
    const now = new Date();
    const start = form.startTime ? new Date(form.startTime) : null;
    const end = form.endTime ? new Date(form.endTime) : null;

    if (!form.title.trim()) w.title = "Gem name is required.";
    if (!form.type) w.type = "Please select gem type.";
    if (!form.description.trim()) w.description = "Description is required.";
    if (!form.file && !form.imageDataUrl) w.image = "Please add a gem image.";
    if (!(price > 0)) w.basePrice = "Starting price must be greater than 0.";
    if (!start) w.startTime = "Start time is required.";
    else if (start <= now) w.startTime = "Start time must be after the current time.";
    if (!end) w.endTime = "End time is required.";
    else if (start && end <= start) w.endTime = "End time must be after the start time.";

    setWarn(w);
    return w;
  }

  const valid1 =
    form.title.trim() && form.type && form.description.trim() && (form.file || form.imageDataUrl);
  const valid2 = Number(form.basePrice) > 0;
  const valid3 =
    form.startTime &&
    form.endTime &&
    new Date(form.startTime) > new Date() &&
    new Date(form.endTime) > new Date(form.startTime);

  const handleFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setWarn((w) => ({ ...w, image: "Only image files are allowed." }));
      showPopup("Invalid File", "Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setWarn((w) => ({ ...w, image: "Image must be under 5MB." }));
      showPopup("File Too Large", "Image must be under 5MB.");
      return;
    }
    const r = new FileReader();
    r.onload = (e) =>
      setForm((f) => ({ ...f, imageDataUrl: String(e.target?.result || ""), file }));
    r.readAsDataURL(file);
    setWarn((w) => {
      const { image, ...rest } = w;
      return rest;
    });
  };

  async function submit(e) {
    e.preventDefault();
    const w = validateAll();
    if (Object.keys(w).length) {
      showPopup("Check Form", "Please fix the highlighted fields before submitting.");
      return;
    }
    try {
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
      toast("Auction created successfully.", "success");
      showPopup("Auction Created", "Your auction was created successfully.");

      onClose();
      onCreated?.();
    } catch (err) {
      showPopup("Create Failed", err?.message || "Could not create the auction.");
    }
  }

  return (
    <>
      <div className={`sac-modal-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`sac-modal ${open ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="sac-modal-header">
          <h2>Create Auction</h2>
          <button className="sac-icon-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Steps */}
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

        {/* Body */}
        <form className="sac-modal-body" onSubmit={submit}>
          {step === 1 && (
            <div className="sac-form-grid">
              <div className="sac-form-group sac-col-full">
                <label className="sac-required">Gem Name</label>
                <input
                  className={warn.title ? "sac-input-error" : ""}
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g., Royal Blue Sapphire"
                />
                {warn.title && <small className="sac-field-warn">{warn.title}</small>}
              </div>

              <div className="sac-form-group">
                <label className="sac-required">Gem Type</label>
                <select
                  className={warn.type ? "sac-input-error" : ""}
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value)}
                >
                  <option value="">Select Gem Type</option>
                  <option value="sapphire">Sapphire</option>
                  <option value="ruby">Ruby</option>
                  <option value="emerald">Emerald</option>
                  <option value="diamond">Diamond</option>
                  <option value="other">Other</option>
                </select>
                {warn.type && <small className="sac-field-warn">{warn.type}</small>}
              </div>

              <div className="sac-form-group sac-col-full">
                <label className="sac-required">Description</label>
                <textarea
                  className={warn.description ? "sac-input-error" : ""}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Describe the gem..."
                />
                {warn.description && <small className="sac-field-warn">{warn.description}</small>}
              </div>

              <div className="sac-form-group sac-col-full">
                <label className="sac-required">Image</label>
                {!form.imageDataUrl ? (
                  <div
                    className={`sac-upload ${warn.image ? "sac-upload-error" : ""}`}
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
                    <p className="sac-upload-text">
                      Drag & drop here or <span>browse</span>
                    </p>
                    <p className="sac-upload-hint">JPG/PNG up to 5MB</p>
                    {warn.image && <small className="sac-field-warn">{warn.image}</small>}
                  </div>
                ) : (
                  <div className={`sac-image-preview ${warn.image ? "sac-upload-error" : ""}`}>
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
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              <div className="sac-form-nav sac-col-full">
                <button type="button" className="sac-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="sac-btn"
                  onClick={() => {
                    validateAll();
                    valid1 && setStep(2);
                  }}
                  disabled={!valid1}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="sac-form-grid">
              <div className="sac-form-group sac-col-full">
                <label className="sac-required">Starting Price (USD)</label>
                <div className="sac-price-wrap">
                  <input
                    className={warn.basePrice ? "sac-input-error" : ""}
                    type="number"
                    min="1"
                    value={form.basePrice}
                    onChange={(e) => setField("basePrice", e.target.value)}
                    placeholder="e.g., 8500"
                  />
                </div>
                {warn.basePrice && <small className="sac-field-warn">{warn.basePrice}</small>}
              </div>
              <div className="sac-form-nav sac-col-full">
                <button type="button" className="sac-btn-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button
                  type="button"
                  className="sac-btn"
                  onClick={() => {
                    validateAll();
                    valid2 && setStep(3);
                  }}
                  disabled={!valid2}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="sac-form-grid">
              <div className="sac-form-group">
                <label className="sac-required">Start Time</label>
                <input
                  className={warn.startTime ? "sac-input-error" : ""}
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setField("startTime", e.target.value)}
                />
                {warn.startTime && <small className="sac-field-warn">{warn.startTime}</small>}
              </div>
              <div className="sac-form-group">
                <label className="sac-required">End Time</label>
                <input
                  className={warn.endTime ? "sac-input-error" : ""}
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setField("endTime", e.target.value)}
                />
                {warn.endTime && <small className="sac-field-warn">{warn.endTime}</small>}
              </div>
              <div className="sac-form-nav sac-col-full">
                <button type="button" className="sac-btn-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  type="button"
                  className="sac-btn"
                  onClick={() => {
                    validateAll();
                    valid3 && setStep(4);
                  }}
                  disabled={!valid3}
                >
                  Next
                </button>
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
                <button type="button" className="sac-btn-secondary" onClick={() => setStep(3)}>
                  Back
                </button>
                <button type="submit" className="sac-btn">
                  Create Auction
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
}

/* ===================== HELPERS / HOOKS (bottom) ===================== */

const BACKEND = process.env.REACT_APP_API_URL || "http://localhost:5000";

function asset(p) {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;
  return `${BACKEND}${p.startsWith("/") ? "" : "/"}${p}`;
}

function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sumRevenuePaid(history, winMap) {
  if (!history?.length) return 0;
  return history.reduce((sum, h) => {
    const win = winMap[h._id] || {};
    const ps = (win.purchaseStatus || h.purchaseStatus || h.winnerStatus || "").toLowerCase();
    const paid = ps === "paid" || !!win.paymentId || !!h.paymentId;
    if (!paid) return sum;
    const amount = h.finalPrice != null ? Number(h.finalPrice) : Number(h.currentPrice || 0);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
}

function countPaid(history, winMap) {
  if (!history?.length) return 0;
  return history.reduce((count, h) => {
    const win = winMap[h._id] || {};
    const ps = (win.purchaseStatus || h.purchaseStatus || h.winnerStatus || "").toLowerCase();
    const paid = ps === "paid" || !!win.paymentId || !!h.paymentId;
    return count + (paid ? 1 : 0);
  }, 0);
}

/* ----- countdown ----- */
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

function TimeBox({ v, lbl }) {
  return (
    <div className="sac-timebox">
      <div className="sac-timebox-value">{String(v).padStart(2, "0")}</div>
      <div className="sac-timebox-label">{lbl}</div>
    </div>
  );
}

/* ----- toasts + popup ----- */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (text, kind = "info", ms = 2500) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, kind }]);
    if (ms) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  };
  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  return { toasts, push, remove };
}

function ToastRack({ toasts, remove }) {
  return (
    <div className="sac-toast-rack" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`sac-toast sac-toast--${t.kind}`}>
          <span>{t.text}</span>
          <button className="sac-toast__x" onClick={() => remove(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function PopModal({ open, title = "Notice", message, onClose, actions }) {
  if (!open) return null;
  return (
    <>
      <div className="sac-pop-overlay" onClick={onClose} />
      <div className="sac-pop" role="dialog" aria-modal="true">
        <div className="sac-pop-head">
          <h3>{title}</h3>
          <button className="sac-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sac-pop-body">{message}</div>
        <div className="sac-pop-foot">
          {actions?.length ? (
            actions.map((a, i) => (
              <button
                key={i}
                className={
                  a.kind === "danger"
                    ? "sac-btn-danger"
                    : a.kind === "secondary"
                    ? "sac-btn-secondary"
                    : "sac-btn"
                }
                onClick={a.onClick}
                type="button"
              >
                {a.label}
              </button>
            ))
          ) : (
            <button className="sac-btn" onClick={onClose} type="button">
              OK
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ----- revenue helpers ----- */
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

function pctDelta(curr, prev) {
  if (prev <= 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function useMonthlyRevenue(paidHistory) {
  return useMemo(() => {
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
}

function useWeeklyRevenue(paidHistory) {
  return useMemo(() => {
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
}

function useRevenueSummary(src) {
  return useMemo(() => {
    const arr = src.data || [];
    const n = arr.length;
    const current = n ? arr[n - 1] : 0;
    const previous = n > 1 ? arr[n - 2] : 0;
    const delta = pctDelta(current, previous);
    return { current, previous, delta };
  }, [src]);
}
