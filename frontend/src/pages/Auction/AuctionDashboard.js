// Seller dashboard (create, view, edit & history)
//
// Total Income and Items Sold:
// - incomeOnlyPaid sums prices for rows that are actually paid.
// - itemsSoldPaid counts how many rows are actually paid.
// Paid detection uses winner status map first (purchaseStatus === "paid" or paymentId present)
// and falls back to fields on the history row if needed.

import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import "./AuctionDashboard.css";
import { request } from "../../api";

// Helper to make full image URLs from backend /uploads
const BACKEND = process.env.REACT_APP_API_URL || "http://localhost:5000";
const asset = (p) => {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;
  return `${BACKEND}${p.startsWith("/") ? "" : "/"}${p}`;
};

// Format helpers
const fmtMoney = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Simple countdown hook
function useCountdown(targetISO) {
  const target = new Date(targetISO).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
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
    <div className="sd-timebox">
      <div className="sd-timebox-value">{String(v).padStart(2, "0")}</div>
      <div className="sd-timebox-label">{lbl}</div>
    </div>
  );
}

export default function AuctionDashboard() {
  // Main overview from backend
  const [overview, setOverview] = useState({
    totals: { income: 0, totalAuctions: 0, ongoing: 0, sold: 0 },
    live: [],
    upcoming: [],
    recent: [],
    history: [],
  });

  // auctionId -> { purchaseStatus, paymentId, purchaseDeadline }
  const [winStatusMap, setWinStatusMap] = useState({});

  // Drawer and modal states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("live");
  const [drawerAuction, setDrawerAuction] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Winner details drawer
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [winner, setWinner] = useState(null);
  const [loadingWinner, setLoadingWinner] = useState(false);

  // Load overview then hydrate winner statuses for history
  useEffect(() => {
    (async () => {
      try {
        const data = await request("/api/auctions/seller/overview");
        setOverview(data);
        await hydrateWinnerStatuses(data?.history || []);
      } catch {
        setOverview((o) => ({ ...o, live: [], upcoming: [], history: [] }));
        setWinStatusMap({});
      }
    })();
  }, []);

  // Prefill edit form when opening upcoming drawer
  useEffect(() => {
    if (drawerOpen && drawerMode === "upcoming" && drawerAuction) {
      setEditForm({
        title: drawerAuction.title,
        type: drawerAuction.type,
        description: drawerAuction.description || "",
        basePrice: String(drawerAuction.basePrice || ""),
        startTime: drawerAuction.startTime?.slice(0, 16) || "",
        endTime: drawerAuction.endTime?.slice(0, 16) || "",
      });
    } else {
      setEditForm(null);
    }
  }, [drawerOpen, drawerMode, drawerAuction]);

  const totals = overview.totals;
  const live = overview.live;
  const upcoming = overview.upcoming;
  const past = overview.history;

  const openLiveDrawer = (a) => {
    setDrawerMode("live");
    setDrawerAuction(a);
    setDrawerOpen(true);
  };
  const openUpcomingDrawer = (a) => {
    setDrawerMode("upcoming");
    setDrawerAuction(a);
    setDrawerOpen(true);
  };

  // Fetch winner status for each auction in history
  async function hydrateWinnerStatuses(items) {
    if (!items?.length) {
      setWinStatusMap({});
      return;
    }
    const ids = Array.from(new Set(items.map((h) => h._id)));
    const results = await Promise.allSettled(
      ids.map((id) => request(`/api/wins/auction/${id}`))
    );
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

  async function saveUpcomingEdit() {
    const id = drawerAuction?._id;
    await request(`/api/auctions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editForm.title,
        type: editForm.type,
        description: editForm.description,
        basePrice: Number(editForm.basePrice),
        startTime: editForm.startTime,
        endTime: editForm.endTime,
      }),
    });
    const data = await request("/api/auctions/seller/overview");
    setOverview(data);
    await hydrateWinnerStatuses(data?.history || []);
    alert("Upcoming auction updated successfully!");
  }

  async function deleteUpcoming() {
    if (!window.confirm("Delete this upcoming auction?")) return;
    const id = drawerAuction?._id;
    await request(`/api/auctions/${id}`, { method: "DELETE" });
    const data = await request("/api/auctions/seller/overview");
    setOverview(data);
    await hydrateWinnerStatuses(data?.history || []);
    setDrawerOpen(false);
    alert("Auction deleted successfully.");
  }

  async function afterCreate() {
    const data = await request("/api/auctions/seller/overview");
    setOverview(data);
    await hydrateWinnerStatuses(data?.history || []);
  }

  // Winner details drawer open + sync back to map
  async function openWinnerDetails(auctionId) {
    try {
      setLoadingWinner(true);
      setWinnerOpen(true);
      const data = await request(`/api/wins/auction/${auctionId}`);
      setWinner(data);
      setWinStatusMap((m) => ({
        ...m,
        [auctionId]: {
          purchaseStatus: (data.purchaseStatus || "").toLowerCase(),
          paymentId: data.paymentId || null,
          purchaseDeadline: data.purchaseDeadline || null,
        },
      }));
    } catch (e) {
      setWinner(null);
    } finally {
      setLoadingWinner(false);
    }
  }

  // Compute income from only PAID items
  const incomeOnlyPaid = useMemo(() => {
    if (!past?.length) return 0;
    return past.reduce((sum, h) => {
      const win = winStatusMap[h._id] || {};
      const purchaseStatus = (win.purchaseStatus || h.purchaseStatus || h.winnerStatus || "").toLowerCase();
      const hasPaid = purchaseStatus === "paid" || !!win.paymentId || !!h.paymentId;
      if (!hasPaid) return sum;
      const amount = h.finalPrice != null ? Number(h.finalPrice) : Number(h.currentPrice || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [past, winStatusMap]);

  // NEW: count Items Sold as only PAID items
  const itemsSoldPaid = useMemo(() => {
    if (!past?.length) return 0;
    return past.reduce((count, h) => {
      const win = winStatusMap[h._id] || {};
      const purchaseStatus = (win.purchaseStatus || h.purchaseStatus || h.winnerStatus || "").toLowerCase();
      const hasPaid = purchaseStatus === "paid" || !!win.paymentId || !!h.paymentId;
      return count + (hasPaid ? 1 : 0);
    }, 0);
  }, [past, winStatusMap]);

  return (
    <div className="sd-page">
      <Header />
      <main className="sd-container">
        <h1 className="sd-title">Auction Center</h1>

        {/* Top widgets. Total Income and Items Sold now reflect only paid items */}
        <section className="sd-overview">
          <Widget icon="fa-coins" label="Total Income" value={fmtMoney(incomeOnlyPaid)} />
          <Widget icon="fa-gavel" label="Total Auctions" value={totals.totalAuctions} />
          <Widget icon="fa-hourglass-half" label="Ongoing" value={totals.ongoing} />
          <Widget icon="fa-gem" label="Items Sold" value={itemsSoldPaid} />
        </section>

        <Section title="Live Auctions">
          <div className="sd-grid">
            {live.length === 0 ? (
              <p className="sd-empty">No live auctions right now.</p>
            ) : (
              live.map((a) => (
                <LiveCard key={a._id} a={a} onOpen={() => openLiveDrawer(a)} />
              ))
            )}
          </div>
        </Section>

        <Section title="Upcoming Auctions">
          <div className="sd-grid">
            {upcoming.length === 0 ? (
              <p className="sd-empty">No upcoming auctions scheduled.</p>
            ) : (
              upcoming.map((a) => (
                <UpcomingCard key={a._id} a={a} onOpen={() => openUpcomingDrawer(a)} />
              ))
            )}
          </div>
        </Section>

        <Section title="All Auction History">
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Gem</th>
                  <th>Details</th>
                  <th>Winner</th>
                  <th>Won Price</th>
                  <th>Ended At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {past.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="sd-empty">No history.</td>
                  </tr>
                ) : (
                  past.map((h) => {
                    const win = winStatusMap[h._id] || {};
                    const purchaseStatus = (win.purchaseStatus || h.purchaseStatus || h.winnerStatus || "").toLowerCase();
                    const hasPaid = purchaseStatus === "paid" || !!win.paymentId || !!h.paymentId;

                    const deadlineMs = win.purchaseDeadline
                      ? new Date(win.purchaseDeadline).getTime()
                      : (h.purchaseDeadline
                          ? new Date(h.purchaseDeadline).getTime()
                          : new Date(new Date(h.endTime).getTime() + 7 * 86400000).getTime());

                    const now = Date.now();
                    let label, cls;

                    if (hasPaid) {
                      label = "Paid";
                      cls = "sd-badge-ok";
                    } else if (purchaseStatus === "cancelled") {
                      label = "Cancelled";
                      cls = "sd-badge-bad";
                    } else if (purchaseStatus === "expired") {
                      label = "Expired";
                      cls = "sd-badge-bad";
                    } else {
                      if (now > deadlineMs) {
                        label = "Expired (7d window over)";
                        cls = "sd-badge-bad";
                      } else {
                        label = "Awaiting Payment";
                        cls = "sd-badge-warn";
                      }
                    }

                    return (
                      <tr key={h._id}>
                        <td>{h.title}</td>
                        <td>{h.type}</td>
                        <td className="sd-winner">
                          {h.winnerName || "-"}
                          {h.winnerName && (
                            <div style={{ marginTop: 6 }}>
                              <button
                                className="sd-btn-outline"
                                onClick={() => openWinnerDetails(h._id)}
                                type="button"
                              >
                                <i className="fa-solid fa-user" /> Details
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="sd-price">
                          {fmtMoney(
                            h.finalPrice != null ? h.finalPrice : h.currentPrice || 0
                          )}
                        </td>
                        <td>{fmtDateTime(h.endTime)}</td>
                        <td>
                          <span className={`sd-badge ${cls}`}>{label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </main>

      <button
        className="sd-fab"
        onClick={() => setCreateOpen(true)}
        aria-label="Create auction"
      >
        <i className="fa-solid fa-plus" />
      </button>

      <CreateAuctionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={afterCreate}
      />

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          drawerAuction
            ? `${drawerAuction.title} — ${drawerMode === "live" ? "Live Details" : "Upcoming Details"}`
            : "Details"
        }
        footer={
          drawerMode === "upcoming" && drawerAuction ? (
            <div className="sd-drawer-actions">
              <button className="sd-btn-danger" onClick={deleteUpcoming}>
                Delete
              </button>
              <button className="sd-btn" onClick={saveUpcomingEdit}>
                Save Changes
              </button>
            </div>
          ) : null
        }
      >
        {!drawerAuction ? null : drawerMode === "live" ? (
          <LiveDrawerContent a={drawerAuction} />
        ) : (
          <UpcomingDrawerContent a={drawerAuction} editForm={editForm} setEditForm={setEditForm} />
        )}
      </SideDrawer>

      <SideDrawer
        open={winnerOpen}
        onClose={() => {
          setWinnerOpen(false);
          setWinner(null);
        }}
        title={winner?.auction?.title ? `Winner • ${winner.auction.title}` : "Winner Details"}
      >
        {loadingWinner ? (
          <p className="sd-muted">Loading winner...</p>
        ) : !winner ? (
          <p className="sd-empty">No winner information available.</p>
        ) : (
          <WinnerDetails w={winner} />
        )}
      </SideDrawer>

      <Footer />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="sd-section">
      <div className="sd-section-title">
        <h2>{title}</h2>
        <span className="sd-underline" />
      </div>
      {children}
    </section>
  );
}

function Widget({ icon, label, value }) {
  return (
    <div className="sd-widget">
      <i className={`fa-solid ${icon}`} />
      <h3>{label}</h3>
      <div className="sd-widget-value">{value}</div>
    </div>
  );
}

function LiveCard({ a, onOpen }) {
  const { total, days, hours, minutes, seconds } = useCountdown(a.endTime);
  const ended = total <= 0;
  return (
    <div className="sd-card">
      <div className="sd-badge sd-badge-live">LIVE • {a.bidsCount || 0} BIDS</div>
      <div className="sd-countdown">
        {ended ? (
          <span className="sd-muted">Auction ended</span>
        ) : (
          <>
            <TimeBox v={days} lbl="Days" />
            <TimeBox v={hours} lbl="Hours" />
            <TimeBox v={minutes} lbl="Mins" />
            <TimeBox v={seconds} lbl="Secs" />
          </>
        )}
      </div>
      <img className="sd-image" src={asset(a.imageUrl)} alt={a.title} />
      <h3 className="sd-card-title">{a.title}</h3>
      <p className="sd-card-sub">
        <i className="fa-solid fa-gem" /> {a.type}
      </p>
      <p className="sd-desc">{a.description}</p>
      <div className="sd-price">Current: {fmtMoney(a.currentPrice)}</div>
      <p className="sd-line">
        <strong>Start:</strong> {fmtDateTime(a.startTime)}
      </p>
      <p className="sd-line">
        <strong>Ends:</strong> {fmtDateTime(a.endTime)}
      </p>

      <div className="sd-actions">
        <button className="sd-btn-outline sd-btn-wide" onClick={onOpen}>
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
    <div className="sd-card">
      <div className={`sd-badge ${started ? "sd-badge-live" : "sd-badge-upcoming"}`}>
        {started ? "STARTED" : "UPCOMING"}
      </div>
      <div className="sd-countdown">
        {started ? (
          <span className="sd-muted">Auction started</span>
        ) : (
          <>
            <TimeBox v={days} lbl="Days" />
            <TimeBox v={hours} lbl="Hours" />
            <TimeBox v={minutes} lbl="Mins" />
            <TimeBox v={seconds} lbl="Secs" />
          </>
        )}
      </div>
      <img className="sd-image" src={asset(a.imageUrl)} alt={a.title} />
      <h3 className="sd-card-title">{a.title}</h3>
      <p className="sd-card-sub">
        <i className="fa-solid fa-gem" /> {a.type}
      </p>
      <p className="sd-desc">{a.description}</p>
      <div className="sd-price">Base: {fmtMoney(a.basePrice)}</div>
      <p className="sd-line"><strong>Start:</strong> {fmtDateTime(a.startTime)}</p>
      <p className="sd-line"><strong>End:</strong> {fmtDateTime(a.endTime)}</p>
      <div className="sd-actions">
        <button className="sd-btn-outline sd-btn-wide" onClick={onOpen}>
          <i className="fa-solid fa-pen-to-square" /> Details / Edit
        </button>
      </div>
    </div>
  );
}

function SideDrawer({ open, title, onClose, children, footer }) {
  return (
    <>
      <div className={`sd-drawer-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`sd-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="sd-drawer-header">
          <h3>{title}</h3>
          <button className="sd-icon-btn" onClick={onClose} aria-label="Close drawer">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="sd-drawer-body">{children}</div>
        {footer && <div className="sd-drawer-footer">{footer}</div>}
      </aside>
    </>
  );
}

function LiveDrawerContent({ a }) {
  return (
    <div className="sd-live-panel">
      <img className="sd-drawer-img" src={asset(a.imageUrl)} alt={a.title} />
      <div className="sd-drawer-grid">
        <div><span className="sd-label">Gem:</span> {a.title}</div>
        <div><span className="sd-label">Type:</span> {a.type}</div>
        <div><span className="sd-label">Start:</span> {fmtDateTime(a.startTime)}</div>
        <div><span className="sd-label">Ends:</span> {fmtDateTime(a.endTime)}</div>
        <div><span className="sd-label">Base:</span> {fmtMoney(a.basePrice)}</div>
        <div><span className="sd-label">Current:</span> {fmtMoney(a.currentPrice)}</div>
      </div>
      <p className="sd-drawer-desc">{a.description}</p>
      <h4 className="sd-subtitle">Top Bids (live)</h4>
    </div>
  );
}

function UpcomingDrawerContent({ a, editForm, setEditForm }) {
  if (!editForm) return null;
  const set = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="sd-upcoming-panel">
      <img className="sd-drawer-img" src={asset(a.imageUrl)} alt={a.title} />
      <div className="sd-form-grid">
        <div className="sd-form-group sd-col-full">
          <label className="sd-required">Gem Name</label>
          <input value={editForm.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="sd-form-group">
          <label className="sd-required">Gem Type</label>
          <select value={editForm.type} onChange={(e) => set("type", e.target.value)}>
            <option value="sapphire">Sapphire</option>
            <option value="ruby">Ruby</option>
            <option value="emerald">Emerald</option>
            <option value="diamond">Diamond</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="sd-form-group">
          <label className="sd-required">Base Price</label>
          <input type="number" min="1" value={editForm.basePrice} onChange={(e) => set("basePrice", e.target.value)} />
        </div>
        <div className="sd-form-group sd-col-full">
          <label>Description</label>
          <textarea value={editForm.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="sd-form-group">
          <label className="sd-required">Start Time</label>
          <input type="datetime-local" value={editForm.startTime} onChange={(e) => set("startTime", e.target.value)} />
        </div>
        <div className="sd-form-group">
          <label className="sd-required">End Time</label>
          <input type="datetime-local" value={editForm.endTime} onChange={(e) => set("endTime", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function WinnerDetails({ w }) {
  const buyerName = w?.user?.fullName || "Unknown";
  const buyerEmail = w?.user?.email || "-";
  const amount = w?.amount;
  const ended = w?.auction?.endTime;
  const deadline = w?.purchaseDeadline;
  const pstatus = w?.purchaseStatus || "pending";
  return (
    <div className="sd-live-panel">
      <img className="sd-drawer-img" src={asset(w?.auction?.imageUrl || "")} alt={w?.auction?.title} />
      <div className="sd-drawer-grid">
        <div><span className="sd-label">Gem:</span> {w?.auction?.title}</div>
        <div><span className="sd-label">Type:</span> {w?.auction?.type}</div>
        <div><span className="sd-label">Winner:</span> {buyerName}</div>
        <div><span className="sd-label">Email:</span> {buyerEmail}</div>
        <div><span className="sd-label">Final Price:</span> {fmtMoney(amount)}</div>
        <div><span className="sd-label">Ended:</span> {ended ? fmtDateTime(ended) : "-"}</div>
        <div><span className="sd-label">Purchase Status:</span> {pstatus[0].toUpperCase() + pstatus.slice(1)}</div>
        <div><span className="sd-label">Purchase Deadline:</span> {deadline ? fmtDateTime(deadline) : "-"}</div>
      </div>
      {w?.auction?.description && (
        <>
          <h4 className="sd-subtitle">Description</h4>
          <p className="sd-drawer-desc">{w.auction.description}</p>
        </>
      )}
    </div>
  );
}

function CreateAuctionModal({ open, onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
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
        name: "",
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

  const validStep1 =
    form.name.trim() &&
    form.type &&
    form.description.trim() &&
    (form.file || form.imageDataUrl);
  const validStep2 = Number(form.basePrice) > 0;
  const validStep3 =
    form.startTime &&
    form.endTime &&
    new Date(form.startTime) < new Date(form.endTime);

  const handleFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      alert("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) =>
      setForm((f) => ({
        ...f,
        imageDataUrl: String(e.target?.result || ""),
        file,
      }));
    reader.readAsDataURL(file);
  };

  async function submit(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", form.name.trim());
    fd.append("type", form.type);
    fd.append("description", form.description.trim());
    fd.append("basePrice", String(form.basePrice));
    fd.append("startTime", form.startTime);
    fd.append("endTime", form.endTime);
    if (form.file) fd.append("image", form.file);
    else if (form.imageDataUrl) fd.append("imageUrl", form.imageDataUrl);

    await request("/api/auctions", { method: "POST", body: fd });
    alert("Auction created successfully!");
    onCreate?.();
    onClose();
  }

  return (
    <>
      <div className={`sd-modal-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`sd-modal ${open ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="sd-modal-header">
          <h2>Create New Auction</h2>
          <button className="sd-icon-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="sd-steps">
          {["Gem Details", "Pricing", "Schedule", "Review"].map((label, i) => {
            const n = i + 1;
            const cls = n === step ? "active" : n < step ? "completed" : "";
            return (
              <div className={`sd-step ${cls}`} key={label}>
                <div className="sd-step-num">{n}</div>
                <div className="sd-step-text">{label}</div>
              </div>
            );
          })}
        </div>

        <form className="sd-modal-body" onSubmit={submit}>
          {step === 1 && (
            <div className="sd-form-grid">
              <div className="sd-secure sd-col-full">
                <i className="fa-solid fa-shield-halved" />
                <span> Your information is protected by bank-level encryption.</span>
              </div>
              <div className="sd-form-group sd-col-full">
                <label className="sd-required">Gem Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g., Royal Blue Sapphire"
                  required
                />
              </div>
              <div className="sd-form-group">
                <label className="sd-required">Gem Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value)}
                  required
                >
                  <option value="">Select Gem Type</option>
                  <option value="sapphire">Sapphire</option>
                  <option value="ruby">Ruby</option>
                  <option value="emerald">Emerald</option>
                  <option value="diamond">Diamond</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="sd-form-group sd-col-full">
                <label className="sd-required">Gem Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Describe the gem..."
                  required
                />
              </div>
              <div className="sd-form-group sd-col-full">
                <label className="sd-required">Gem Image</label>
                {!form.imageDataUrl && (
                  <div
                    className="sd-upload"
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
                    <i className="fa-solid fa-cloud-arrow-up sd-upload-icon" />
                    <p className="sd-upload-text">
                      Drag and drop your image here or <span>browse</span>
                    </p>
                    <p className="sd-upload-hint">JPG or PNG up to 5MB</p>
                  </div>
                )}
                {form.imageDataUrl && (
                  <div className="sd-image-preview">
                    <img src={form.imageDataUrl} alt="Gem preview" />
                    <div className="sd-image-actions">
                      <button
                        type="button"
                        className="sd-btn-secondary"
                        onClick={() => fileRef.current?.click()}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        className="sd-btn-danger"
                        onClick={() => {
                          setField("imageDataUrl", "");
                          setField("file", null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  style={{ display: "none" }}
                />
              </div>
              <div className="sd-form-nav sd-col-full">
                <button type="button" className="sd-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="sd-btn" onClick={() => setStep(2)} disabled={!validStep1}>
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="sd-form-grid">
              <div className="sd-form-group sd-col-full">
                <label className="sd-required">Starting Price (USD)</label>
                <div className="sd-price-wrap">
                  <input
                    type="number"
                    min="1"
                    value={form.basePrice}
                    onChange={(e) => setField("basePrice", e.target.value)}
                    placeholder="e.g., 8500"
                    required
                  />
                </div>
                <small className="sd-hint">This becomes the initial current price when the auction starts.</small>
              </div>
              <div className="sd-form-nav sd-col-full">
                <button type="button" className="sd-btn-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="sd-btn" onClick={() => setStep(3)} disabled={!validStep2}>
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="sd-form-grid">
              <div className="sd-form-group">
                <label className="sd-required">Start Time</label>
                <input type="datetime-local" value={form.startTime} onChange={(e) => setField("startTime", e.target.value)} required />
              </div>
              <div className="sd-form-group">
                <label className="sd-required">End Time</label>
                <input type="datetime-local" value={form.endTime} onChange={(e) => setField("endTime", e.target.value)} required />
              </div>
              <div className="sd-form-nav sd-col-full">
                <button type="button" className="sd-btn-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <button type="button" className="sd-btn" onClick={() => setStep(4)} disabled={!validStep3}>
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="sd-form-grid">
              <div className="sd-review sd-col-full">
                <h4>Auction Summary</h4>
                <div className="sd-review-grid">
                  <div><span className="sd-review-label">Gem:</span> {form.name}</div>
                  <div><span className="sd-review-label">Type:</span> {form.type || "-"}</div>
                  <div><span className="sd-review-label">Start Price:</span> {fmtMoney(form.basePrice || 0)}</div>
                  <div><span className="sd-review-label">Start:</span> {form.startTime ? fmtDateTime(form.startTime) : "-"}</div>
                  <div><span className="sd-review-label">End:</span> {form.endTime ? fmtDateTime(form.endTime) : "-"}</div>
                </div>
                {form.description && <p className="sd-review-desc">{form.description}</p>}
                {form.imageDataUrl && <img className="sd-review-img" src={form.imageDataUrl} alt="Gem" />}
              </div>
              <div className="sd-form-nav sd-col-full">
                <button type="button" className="sd-btn-secondary" onClick={() => setStep(3)}>Back</button>
                <button type="submit" className="sd-btn">Create Auction</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
