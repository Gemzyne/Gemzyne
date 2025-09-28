import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../api";
import "./Notifications.css";

// LocalStorage key for per-item "seen" flags
const STORAGE_KEY = "gemzyne_win_seen_v1";

// Route for payment history and auction history path
const PAYMENTS_ROUTE = "/payment-history";
const Auction_His = "/auction/buyer?tab=history";

/* =========================
   SECTION 2 — Small Utilities
   ========================= */

// Close dropdown if clicking outside of the component
function useOutsideClick(ref, onClose) {
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, ref]);
}

// Safe currency formatter
const money = (n, ccy = "USD") => {
  const amt = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: amt % 1 === 0 ? 0 : 2,
    }).format(amt);
  } catch {
    return `${ccy} ${amt.toFixed ? amt.toFixed(2) : amt}`;
  }
};

// Robust timestamp normalizer → number (ms since epoch) or 0
const toTs = (v) => {
  if (!v) return 0;
  if (typeof v === "number") return v;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
};

//Format a human-readable datetime (locale-aware)
const formatWhen = (ts) => {
  if (!ts) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "";
  }
};

/* =========================
   SECTION 3 — Component
   ========================= */
export default function WinNotifications({ pollMs = 30000 }) {
  /* ---------------------------------
     3A — State, refs, and navigation
     --------------------------------- */
  const [open, setOpen] = useState(false);
  const [wins, setWins] = useState([]); // auction wins
  const [payments, setPayments] = useState([]); // successful payments
  const [loading, setLoading] = useState(false);

  // Load "seen" map from localStorage once
  const [seen, setSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  const navigate = useNavigate();
  const boxRef = useRef(null);
  useOutsideClick(boxRef, () => setOpen(false));

  /* ---------------------------------
     3B — Fetchers (wins + payments)
     --------------------------------- */
  const fetchAll = async () => {
    try {
      setLoading(true);

      const [wRes, pRes] = await Promise.all([
        request("/api/wins/my"),
        // If the API doesn't support ?status=paid, we filter below anyway.
        request("/api/payments/my?status=paid"),
      ]);

      // Wins
      const wItems = wRes?.items || wRes?.data?.items || wRes?.data || [];
      setWins(Array.isArray(wItems) ? wItems : []);

      // Payments (filter to only paid)
      const pItemsRaw = pRes?.items || pRes?.data?.items || pRes?.data || [];
      const pItems = Array.isArray(pItemsRaw) ? pItemsRaw : [];
      const paidOnly = pItems.filter(
        (p) => (p?.status || p?.payment?.status || "").toLowerCase() === "paid"
      );
      setPayments(paidOnly.slice(0, 15)); // cap list to be safe
    } catch {
      setWins([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------
     3C — Polling effect
     --------------------------------- */
  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, pollMs);
    return () => clearInterval(t);
  }, [pollMs]);

  /* ---------------------------------
     3D — Build merged notifications
     (consistent IDs, titles, meta, click handlers, timestamps)
     --------------------------------- */
  const notifications = useMemo(() => {
    // Map wins → notification cards
    const winCards = (wins || []).map((w) => {
      const id = w?._id || w?.id || w?.auctionCode;
      const title = w?.title || w?.auctionTitle || w?.auctionCode || "Auction";
      const status = (w?.purchaseStatus || "pending").toUpperCase();
      const amount =
        typeof w?.finalPrice === "number"
          ? money(w?.finalPrice, "USD")
          : w?.finalPrice || "";

      // Prefer the most relevant timestamp for "newest-first" ordering
      const ts =
        Math.max(
          toTs(w?.updatedAt),
          toTs(w?.winnerCreatedAt),
          toTs(w?.endedAt),
          toTs(w?.createdAt)
        ) || 0;

      return {
        id,
        type: "win",
        title: `You won: ${title}`,
        meta: `Final: ${amount} • Status: ${status}`,
        ts,
        onClick: () => {
          if (id) markSeen(id);
          setOpen(false);
          navigate(Auction_His);
        },
      };
    });

    // Map paid payments → notification cards
    const payCards = (payments || []).map((p) => {
      const id = p?._id || p?.id || p?.orderNo || p?.orderId;
      const orderNo = p?.orderNo || (p?.order && p?.order.orderNo) || "—";
      const ccy = p?.currency || p?.amounts?.currency || "USD";
      const total = p?.total ?? p?.amounts?.total ?? p?.subtotal ?? 0;

      const ts =
        Math.max(toTs(p?.paidAt), toTs(p?.updatedAt), toTs(p?.createdAt)) || 0;

      return {
        id,
        type: "payment",
        title: "Payment Success",
        meta: `Order ${orderNo} • ${money(total, ccy)}`,
        ts,
        onClick: () => {
          if (id) markSeen(id);
          setOpen(false);
          navigate(PAYMENTS_ROUTE);
        },
      };
    });

    // Merge and sort: newest first; stable by original index to avoid jitter
    return [...winCards, ...payCards]
      .map((n, i) => ({ ...n, _i: i }))
      .sort((a, b) => b.ts - a.ts || a._i - b._i);
  }, [wins, payments]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------
     3E — Unseen counter & "seen" helpers
     --------------------------------- */
  const unseenCount = useMemo(() => {
    let c = 0;
    for (const n of notifications) if (n.id && !seen[n.id]) c++;
    return c;
  }, [notifications, seen]);

  // Mark a single notification as seen
  const markSeen = (id) => {
    if (!id) return;
    const next = { ...seen, [id]: Date.now() };
    setSeen(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  // Clear: mark all current notifications as seen, then empty both lists
  const clearAll = () => {
    if (!notifications?.length) return;
    const next = { ...seen };
    for (const n of notifications) if (n.id) next[n.id] = Date.now();
    setSeen(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setWins([]);
    setPayments([]);
    // setOpen(false); // ← uncomment if you want to close the menu after clearing
  };

  /* ---------------------------------
     3F — UI (Bell, badge, dropdown, list, footer)
     --------------------------------- */
  return (
    <div ref={boxRef} className="gz-wn-wrap">
      {/* Bell */}
      <button
        aria-label="Notifications"
        className="gz-wn-bell"
        onClick={() => setOpen((v) => !v)}
      >
        <i className="fas fa-bell" />
        {unseenCount > 0 && <span className="gz-wn-badge">{unseenCount}</span>}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="gz-wn-menu">
          <div className="gz-wn-head">Notifications</div>

          <div className="gz-wn-list">
            {loading && <div className="gz-wn-loading">Loading…</div>}

            {!loading && (!notifications || notifications.length === 0) && (
              <div className="gz-wn-empty">No notifications.</div>
            )}

            {!loading &&
              notifications.map((n) => {
                const isUnseen = n.id && !seen[n.id];
                const iconClass =
                  n.type === "payment" ? "fa-credit-card" : "fa-trophy";
                const itemCls =
                  n.type === "payment" ? "gz-wn-item pay" : "gz-wn-item win";

                return (
                  <button
                    key={`${n.type}:${n.id || n.ts}`}
                    className={itemCls}
                    onClick={n.onClick}
                  >
                    <div className="gz-wn-row">
                      <i className={`fas ${iconClass} gz-wn-ico`} />
                      <div style={{ flex: 1 }}>
                        <div className="gz-wn-title">{n.title}</div>
                        {/*Date*/}
                        <div className="gz-wn-meta">
                          {n.meta}
                          {n.ts ? (
                            <span className="gz-wn-time">
                              {" "}
                              • {formatWhen(n.ts)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {isUnseen && <span className="gz-wn-new" title="new" />}
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="gz-wn-foot">
            <button
              className="gz-wn-clear"
              onClick={clearAll}
              disabled={!notifications?.length}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
