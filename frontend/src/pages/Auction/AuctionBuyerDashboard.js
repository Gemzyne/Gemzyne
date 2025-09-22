// Buyer dashboard: Ongoing, Your Bids, Auction History (Won), and Upcoming
// ------------------------------------------------------------------------
// This page shows public auctions, your active bids, your won auctions,
// and upcoming auctions. It also connects to Bids/Winner/Payment APIs.
//
// ✅ Beginner notes:
// - "state" is page data that can change (useState)
// - "effects" are side-effects like fetching data (useEffect)
// - We call backend APIs using our `request`/`api` helpers from ../../api
// - We DON'T include CSS here (keep your CSS in the .css file)

import React, { useEffect, useMemo, useState } from "react";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import "./AuctionBuyerDashboard.css"; // <- keep your CSS in this file (not included here)
import { request, api } from "../../api";

/* ================================
   CONFIG & SMALL HELPERS
   ================================ */

// This helps resolve image paths (works with backend /uploads or absolute URLs)
const BACKEND = process.env.REACT_APP_API_URL || "http://localhost:5000";
const asset = (p) => {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;
  return `${BACKEND}${p.startsWith("/") ? "" : "/"}${p}`;
};

// Quick checks for time
const isEnded = (iso) => Date.parse(iso) <= Date.now();
const isActive = (iso) => !isEnded(iso);

/* ================================
   PAGE COMPONENT
   ================================ */
export default function BuyerDashboard() {
  /* ---- particles.js background loader (visual effect only) ---- */
  useEffect(() => {
    const id = "particles-cdn";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      s.async = true;
      s.onload = () => {
        if (window.particlesJS) {
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
              move: { enable: true, speed: 1, random: true, out_mode: "out" },
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
        }
      };
      document.body.appendChild(s);
    }
  }, []);

  /* ---- REACT STATE (data that changes) ---- */
  const [ongoing, setOngoing] = useState([]);     // public ongoing auctions
  const [yourBids, setYourBids] = useState([]);   // your active bids
  const [upcoming, setUpcoming] = useState([]);   // public upcoming auctions
  const [won, setWon] = useState([]);             // your won auctions

  const [tab, setTab] = useState("ongoing");      // which tab is selected
  const [search, setSearch] = useState("");       // search text
  const [category, setCategory] = useState("all");// filter by type
  const [status, setStatus] = useState("all");    // filter by status

  // Drawer (right-side details panel)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(null);

  /* ---- SOFT TICK (to update countdowns every second) ---- */
  const [, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---- LOAD PUBLIC AUCTIONS (ongoing + upcoming) ----
     This runs when `search` or `category` changes. */
  useEffect(() => {
    (async () => {
      const qs = (s) =>
        `/api/auctions/public?status=${s}&type=${category}&q=${encodeURIComponent(search)}`;
      try {
        const [og, up] = await Promise.all([request(qs("ongoing")), request(qs("upcoming"))]);
        setOngoing(og.items || []);
        setUpcoming(up.items || []);
      } catch {
        setOngoing([]);
        setUpcoming([]);
      }
    })();
  }, [search, category]);

  /* ---- LOAD PERSONAL DATA (your bids + wins) ----
     This runs once on page load. */
  useEffect(() => {
    (async () => {
      try {
        const [my, wins] = await Promise.all([request("/api/bids/my"), request("/api/wins/my")]);
        // Keep only active bids (not ended)
        setYourBids((my.items || []).filter((b) => isActive(b.endTime)));
        setWon(wins.items || []);
      } catch {
        setYourBids([]);
        setWon([]);
      }
    })();
  }, []);

  /* ---- AUTO-PRUNE ended bids every second (keeps Your Bids clean) ---- */
  useEffect(() => {
    const id = setInterval(() => {
      setYourBids((prev) => prev.filter((b) => isActive(b.endTime)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---- REFRESH WINS WHEN USER RETURNS FROM /payment ----
     If user pays and comes back, we reload /api/wins/my to see paid status. */
  useEffect(() => {
    const onFocus = async () => {
      try {
        const wins = await request("/api/wins/my");
        setWon(wins.items || []);
      } catch {}
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  /* ---- DERIVED LIST for ongoing (applies filters) ---- */
  const filteredOngoing = useMemo(() => {
    return ongoing.filter((a) => {
      const matchesSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCat = category === "all" || a.type === category;

      // Extra "ending soon" filter (within 6 hours)
      let matchesStatus = true;
      if (status === "ending") {
        const left = timeLeft(a.endTime);
        matchesStatus = left.total > 0 && left.days === 0 && left.hours < 6;
      }
      if (status === "upcoming") matchesStatus = false; // exclude in ongoing tab
      if (status === "ongoing") matchesStatus = true;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [ongoing, search, category, status]);

  /* ---- DASHBOARD STATS (BEGINNER NOTE)
     We compute several numbers for the stat cards above the tabs.
     - activeBids: count from yourBids (only active ones)
     - wonCount: total number of wins (paid or not)
     - paidCount: wins that are paid (purchaseStatus === 'paid' OR has paymentId)
     - totalSpent: sum of finalPrice for PAID wins only
  ---- */
  const stats = useMemo(() => {
    const paidWins = (won || []).filter(
      (w) => w?.purchaseStatus === "paid" || !!w?.paymentId
    );
    return {
      activeBids: yourBids.length,
      wonCount: won.length,
      paidCount: paidWins.length,
      totalSpent: paidWins.reduce((s, x) => s + (x.finalPrice || 0), 0),
    };
  }, [yourBids, won]);

  /* ---- FORMATTERS ---- */
  const fmtMoney = (n) =>
    Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtDate = (iso) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  /* ---- TIME HELPER: difference to a future timestamp ---- */
  function timeLeft(targetIso) {
    const total = Date.parse(targetIso) - Date.now();
    const clamp = Math.max(total, 0);
    const seconds = Math.floor((clamp / 1000) % 60);
    const minutes = Math.floor((clamp / (1000 * 60)) % 60);
    const hours = Math.floor((clamp / (1000 * 60 * 60)) % 24);
    const days = Math.floor(clamp / (1000 * 60 * 60 * 24));
    return { total, days, hours, minutes, seconds };
  }

  /* ================================
     API ACTIONS (place/increase/checkout)
     ================================ */

  // Place a bid on an ongoing auction
  async function placeBid(a, amount) {
    if (isEnded(a.endTime)) {
      alert("This auction has ended.");
      return;
    }
    await request(`/api/bids/place`, {
      method: "POST",
      body: JSON.stringify({ auctionId: a._id, amount }),
    });
    // Optimistically update card price
    setOngoing((prev) => prev.map((o) => (o._id === a._id ? { ...o, currentPrice: amount } : o)));
    // Reload your active bids
    const my = await request("/api/bids/my");
    setYourBids((my.items || []).filter((b) => isActive(b.endTime)));
  }

  // Increase a bid that you already have on an auction
  async function increaseBid(b, amount) {
    if (isEnded(b.endTime)) {
      alert("This auction has ended. Removing from Your Bids.");
      setYourBids((prev) => prev.filter((x) => x.auctionId !== b.auctionId));
      return;
    }
    await request(`/api/bids/increase`, {
      method: "POST",
      body: JSON.stringify({ auctionId: b.auctionId || b.id, amount }),
    });
    // Reload your active bids
    const my = await request("/api/bids/my");
    setYourBids((my.items || []).filter((x) => isActive(x.endTime)));
  }

  // START PURCHASE for a won auction:
  // We ask backend to "bridge" a Winner into an Order for the Payment module,
  // then store that order in localStorage and navigate to /payment.
  async function startWinnerCheckout(win) {
    try {
      const idOrCode = win.auctionMongoId || win.auctionCode || win.id;
      const res = await api.wins.createPurchase(idOrCode);
      if (!res?.ok) {
        alert(res?.message || "Could not prepare purchase");
        return;
      }
      // Save a "pendingOrder" like the Custom Orders payment flow expects
      localStorage.setItem(
        "pendingOrder",
        JSON.stringify({
          orderId: res.orderId,
          orderNo: res.orderNo,
          amount: win.finalPrice,
          currency: "USD",
        })
      );
      // Optional: save minimal auction context for a banner on Payment page
      localStorage.setItem(
        "auctionContext",
        JSON.stringify({
          code: res.orderNo,
          title: win.title || "",
          finalPrice: win.finalPrice || 0,
        })
      );
      // Go to payment page
      window.location.href = "/payment";
    } catch (e) {
      console.error(e);
      alert("Failed to start purchase. Please try again.");
    }
  }

  /* ---- Drawer helpers ---- */
  function openDetails(a, type = "ongoing", bidRecord = null) {
    setDetails({ a, type, yourBid: bidRecord?.yourBid, bidRecord });
    setDetailsOpen(true);
  }
  function closeDetails() {
    setDetailsOpen(false);
    setDetails(null);
  }

  /* ================================
     RENDER
     ================================ */
  return (
    <div className="bd-root">
      {/* particles canvas (fixed, behind content) */}
      <div id="particles-js" className="bd-particles" style={{ position: "fixed", inset: 0, zIndex: 0 }} />

      {/* page content above particles */}
      <div className="bd-content" style={{ position: "relative", zIndex: 1 }}>
        <Header />

        {/* ===== HERO + FILTERS ===== */}
        <section className="bd-hero">
          <h1 className="bd-title">Auction Center</h1>

          <div className="bd-filters">
            {/* Search box */}
            <div className="bd-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                placeholder="Search auctions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category select */}
            <div className="bd-select">
              <button className="bd-select__btn" type="button">
                <span>
                  {category === "all" ? "All Categories" : category[0].toUpperCase() + category.slice(1)}
                </span>
                <i className="fa-solid fa-chevron-down" />
              </button>
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="diamond">Diamonds</option>
                <option value="sapphire">Sapphires</option>
                <option value="ruby">Rubies</option>
                <option value="emerald">Emeralds</option>
                <option value="other">Other Gems</option>
              </select>
            </div>

            {/* Status select */}
            <div className="bd-select">
              <button className="bd-select__btn" type="button">
                <span>
                  {status === "all"
                    ? "All Statuses"
                    : status === "ending"
                    ? "Ending Soon"
                    : status[0].toUpperCase() + status.slice(1)}
                </span>
                <i className="fa-solid fa-chevron-down" />
              </button>
              <select
                aria-label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="ongoing">Ongoing</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
          </div>
        </section>

        {/* ===== STATS WIDGETS =====
            - Shows totals. "Total Spent" now only counts PAID wins. */}
        <section className="bd-stats">
          <div className="bd-stat">
            <h4>Active Bids</h4>
            <div className="bd-stat__val">{stats.activeBids}</div>
            <div className="bd-stat__sub">Live bids you placed</div>
          </div>
          <div className="bd-stat">
            <h4>Won Auctions</h4>
            <div className="bd-stat__val">{stats.wonCount}</div>
            <div className="bd-stat__sub">Paid: {stats.paidCount}</div>
          </div>
          <div className="bd-stat">
            <h4>Total Spent</h4>
            <div className="bd-stat__val">${fmtMoney(stats.totalSpent)}</div>
            <div className="bd-stat__sub">Paid orders only</div>
          </div>
        </section>

        {/* ===== TABS ===== */}
        <div className="bd-tabs">
          <div className="bd-tabs__bar">
            <button className={`bd-tab ${tab === "ongoing" ? "is-active" : ""}`} onClick={() => setTab("ongoing")}>
              Ongoing Auctions
            </button>
          </div>
          <div className="bd-tabs__bar">
            <button className={`bd-tab ${tab === "yourbids" ? "is-active" : ""}`} onClick={() => setTab("yourbids")}>
              Your Bids
            </button>
          </div>
          <div className="bd-tabs__bar">
            <button className={`bd-tab ${tab === "history" ? "is-active" : ""}`} onClick={() => setTab("history")}>
              Auction History
            </button>
          </div>
          <div className="bd-tabs__bar">
            <button className={`bd-tab ${tab === "upcoming" ? "is-active" : ""}`} onClick={() => setTab("upcoming")}>
              Upcoming Auctions
            </button>
          </div>
        </div>

        {/* ===== ONGOING ===== */}
        {tab === "ongoing" && (
          <Section title="Ongoing Auctions">
            <Grid emptyText="No matches found.">
              {filteredOngoing.map((a) => (
                <Card
                  key={a._id}
                  a={a}
                  type="ongoing"
                  onSubmit={(val) => placeBid(a, val)}
                  onOpen={() => openDetails(a, "ongoing")}
                />
              ))}
            </Grid>
          </Section>
        )}

        {/* ===== YOUR BIDS ===== */}
        {tab === "yourbids" && (
          <Section title="Your Bids">
            <Grid emptyText="You haven’t placed any bids yet.">
              {yourBids
                .filter((b) => isActive(b.endTime))
                .map((b) => (
                  <Card
                    key={b.auctionId}
                    a={{
                      _id: b.auctionId,
                      title: b.title,
                      type: b.type,
                      endTime: b.endTime,
                      currentPrice: b.currentPrice,
                      imageUrl: b.image,
                      description: b.description,
                      basePrice: b.basePrice,
                      startTime: b.startTime,
                    }}
                    yourBid={b.yourBid}
                    type="your"
                    onSubmit={(val) => increaseBid(b, val)}
                    onOpen={() =>
                      openDetails(
                        {
                          _id: b.auctionId,
                          title: b.title,
                          type: b.type,
                          endTime: b.endTime,
                          currentPrice: b.currentPrice,
                          imageUrl: b.image,
                          description: b.description,
                          basePrice: b.basePrice,
                          startTime: b.startTime,
                        },
                        "your",
                        b
                      )
                    }
                  />
                ))}
            </Grid>
          </Section>
        )}

        {/* ===== AUCTION HISTORY (WON ONLY) =====
            - If the win is PAID (purchaseStatus === 'paid' OR has paymentId),
              show a "Paid" button (disabled) instead of "Complete Purchase". */}
        {tab === "history" && (
          <Section title="Auction History (Won Only)">
            <Grid emptyText="No wins yet.">
              {won.map((w) => {
                const isPaid = w?.purchaseStatus === "paid" || !!w?.paymentId;
                return (
                  <article className="bd-card" key={w.id || w.auctionId}>
                    <div className="bd-badge bd-badge--won">WON</div>
                    {isPaid && <div className="bd-badge bd-badge--paid">PAID</div>}

                    <img className="bd-card__img" src={asset(w.image)} alt={w.title} />
                    <h3 className="bd-card__title">{w.title}</h3>
                    <p className="bd-card__meta">
                      <i className="fa-solid fa-gem" /> {w.type}
                    </p>
                    <div className="bd-price">
                      Final Price: <span>${fmtMoney(w.finalPrice)}</span>
                    </div>
                    <p className="bd-small">Ended: {fmtDate(w.endTime)}</p>

                    {isPaid ? (
                      <button className="bd-btn bd-btn--ok" disabled>Paid</button>
                    ) : (
                      <button className="bd-btn bd-btn--outline" onClick={() => startWinnerCheckout(w)}>
                        Complete Purchase
                      </button>
                    )}
                  </article>
                );
              })}
            </Grid>
          </Section>
        )}

        {/* ===== UPCOMING ===== */}
        {tab === "upcoming" && (
          <Section title="Upcoming Auctions">
            <Grid emptyText="No upcoming auctions">
              {upcoming.map((u) => (
                <article className="bd-card" key={u._id}>
                  <div className="bd-card__timer">
                    <Countdown target={u.startTime} label="Starts in" />
                  </div>
                  <img
                    className="bd-card__img bd-click"
                    src={asset(u.imageUrl)}
                    alt={u.title}
                    onClick={() => openDetails(u, "upcoming")}
                  />
                  <h3 className="bd-card__title">{u.title}</h3>
                  <p className="bd-card__meta">
                    <i className="fa-solid fa-gem" /> {u.type}
                  </p>
                  <div className="bd-price">
                    Base: <span>${fmtMoney(u.basePrice)}</span>
                  </div>
                  <p className="bd-small">
                    Starts: {fmtDate(u.startTime)} • Ends: {fmtDate(u.endTime)}
                  </p>
                  <div className="bd-bid">
                    <button
                      className="bd-btn bd-btn--outline"
                      onClick={() => alert("Reminder set!")}
                    >
                      Set Reminder
                    </button>
                    <button
                      className="bd-btn bd-btn--ghost"
                      type="button"
                      onClick={() => openDetails(u, "upcoming")}
                    >
                      Details
                    </button>
                  </div>
                </article>
              ))}
            </Grid>
          </Section>
        )}

        {/* ===== DETAILS DRAWER (right-side panel) ===== */}
        <DetailsDrawer
          open={detailsOpen}
          details={details}
          onClose={closeDetails}
          onPlace={placeBid}
          onIncrease={increaseBid}
        />

        <Footer />
      </div>
    </div>
  );
}

/* ================================
   SMALL PRESENTATION COMPONENTS
   ================================ */

// A visual section wrapper with a title
function Section({ title, children }) {
  return (
    <section className="bd-section">
      <div className="bd-section__head">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

// Grid layout for cards
function Grid({ children, emptyText }) {
  return (
    <div className="bd-grid">
      {React.Children.count(children) ? children : (
        <div className="bd-empty">{emptyText}</div>
      )}
    </div>
  );
}

// A simple countdown block (Days / Hours / Mins / Secs)
function Countdown({ target, label = "Ends in" }) {
  const total = Date.parse(target) - Date.now();
  const clamp = Math.max(total, 0);
  const seconds = Math.floor((clamp / 1000) % 60);
  const minutes = Math.floor((clamp / (1000 * 60)) % 60);
  const hours = Math.floor((clamp / (1000 * 60 * 60)) % 24);
  const days = Math.floor(clamp / (1000 * 60 * 60 * 24));
  if (clamp <= 0) return <div className="bd-badge bd-badge--ended">ENDED</div>;
  return (
    <div className="bd-countdown" aria-label={label}>
      <div className="bd-countdown__item">
        <div className="bd-countdown__val">{days}</div>
        <div className="bd-countdown__lbl">Days</div>
      </div>
      <div className="bd-countdown__item">
        <div className="bd-countdown__val">{hours}</div>
        <div className="bd-countdown__lbl">Hours</div>
      </div>
      <div className="bd-countdown__item">
        <div className="bd-countdown__val">{minutes}</div>
        <div className="bd-countdown__lbl">Mins</div>
      </div>
      <div className="bd-countdown__item">
        <div className="bd-countdown__val">{seconds}</div>
        <div className="bd-countdown__lbl">Secs</div>
      </div>
    </div>
  );
}

// A single auction card used in Ongoing/Your Bids lists
function Card({ a, yourBid, type, onSubmit, onOpen }) {
  const [val, setVal] = useState("");
  const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const minVal = (a.currentPrice || 0) + 1;
  const ended = isEnded(a.endTime);

  return (
    <article className="bd-card">
      <div className="bd-card__timer">
        <Countdown target={a.endTime} label="Ends in" />
      </div>
      <img className="bd-card__img bd-click" src={asset(a.imageUrl)} alt={a.title} onClick={onOpen} />
      <h3 className="bd-card__title">{a.title}</h3>
      <p className="bd-card__meta">
        <i className="fa-solid fa-gem" /> {a.type}
      </p>
      <div className="bd-price">
        Current: <span>${fmtMoney(a.currentPrice)}</span>
      </div>
      {yourBid && <p className="bd-small">Your Bid: ${fmtMoney(yourBid)}</p>}
      <div className="bd-bid">
        <input
          type="number"
          min={minVal}
          placeholder={`Enter amount (min $${minVal.toLocaleString()})`}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={ended}
        />
        <button
          className="bd-btn"
          type="button"
          disabled={ended}
          onClick={() => {
            if (ended) return;
            const n = Number(val);
            if (Number.isFinite(n) && n > (a.currentPrice || 0)) {
              onSubmit(n);   // Calls placeBid or increaseBid
              setVal("");
            }
          }}
        >
          {type === "your" ? "Increase Bid" : "Place Bid"}
        </button>
        <button className="bd-btn bd-btn--ghost" type="button" onClick={onOpen}>
          Details
        </button>
      </div>
    </article>
  );
}

// Right-side drawer that shows auction details and allows bidding
function DetailsDrawer({ open, details, onClose, onPlace, onIncrease }) {
  const [val, setVal] = useState("");

  // Reset input when opening a different auction
  useEffect(() => {
    setVal("");
  }, [details?.a?._id, open]);

  // When no details, still render the shell (for overlay animation)
  if (!details) {
    return (
      <>
        <div className={`bd-drawer-overlay ${open ? "open" : ""}`} onClick={onClose} />
        <aside className={`bd-drawer ${open ? "open" : ""}`} aria-hidden={!open} />
      </>
    );
  }

  const { a, type, yourBid } = details;
  const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtDate = (iso) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  const minVal = (a.currentPrice || 0) + 1;
  const ended = isEnded(a.endTime);

  return (
    <>
      <div className={`bd-drawer-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`bd-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="bd-drawer__header">
          <div className="bd-drawer__title">{a.title}</div>
          <button className="bd-drawer__close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="bd-drawer__body">
          <img className="bd-drawer__img" src={asset(a.imageUrl)} alt={a.title} />
          <div className="bd-drawer__row">
            <span className="bd-drawer__label">Type:</span>{a.type || "-"}
          </div>

          {a?.description && (
            <div className="bd-drawer__row" style={{ alignItems: "flex-start" }}>
              <span className="bd-drawer__label">Description:</span>
              <span className="bd-drawer__desc" style={{ flex: 1, whiteSpace: "pre-wrap" }}>
                {a.description}
              </span>
            </div>
          )}
          {a.basePrice != null && (
            <div className="bd-drawer__row">
              <span className="bd-drawer__label">Base:</span>${fmtMoney(a.basePrice)}
            </div>
          )}
          <div className="bd-drawer__row">
            <span className="bd-drawer__label">Current:</span>${fmtMoney(a.currentPrice)}
          </div>
          {yourBid != null && (
            <div className="bd-drawer__row">
              <span className="bd-drawer__label">Your Bid:</span>${fmtMoney(yourBid)}
            </div>
          )}
          {a.startTime && (
            <div className="bd-drawer__row">
              <span className="bd-drawer__label">Start:</span>{fmtDate(a.startTime)}
            </div>
          )}
          {a.endTime && (
            <div className="bd-drawer__row">
              <span className="bd-drawer__label">Ends:</span>{fmtDate(a.endTime)}
            </div>
          )}

          {/* Show bid bar if auction is active (ongoing or your), or if upcoming we could hide the input */}
          {(type === "ongoing" || type === "your" || type === "upcoming") && !ended && type !== "upcoming" && (
            <>
              <div className="bd-drawer__row">
                <span className="bd-drawer__label">
                  {type === "your" ? "Increase your bid" : "Place a bid"}
                </span>
              </div>
              <div className="bd-drawer__bidbar">
                <input
                  className="bd-drawer__input"
                  type="number"
                  min={minVal}
                  placeholder={`Min ${minVal.toLocaleString()}`}
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                />
                <button
                  className="bd-drawer__btn"
                  onClick={() => {
                    const n = Number(val);
                    if (!Number.isFinite(n) || n <= (a.currentPrice || 0)) return;
                    if (type === "your") onIncrease(details.bidRecord, n);
                    else onPlace(a, n);
                    setVal("");
                  }}
                >
                  {type === "your" ? "Increase" : "Bid"}
                </button>
              </div>
            </>
          )}

          {(type === "your" || type === "ongoing") && ended && (
            <div className="bd-small" style={{ marginTop: 10 }}>
              This auction has ended.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
