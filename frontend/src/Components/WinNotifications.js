import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../api";
import "./WinNotifications.css"; // ✅ scoped styles only

const STORAGE_KEY = "gemzyne_win_seen_v1";
const PAYMENTS_ROUTE = "/payments/history"; // 🔧 change if your payments page is different

function useOutsideClick(ref, onClose) {
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, ref]);
}

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

export default function WinNotifications({ pollMs = 30000 }) {
  const [open, setOpen] = useState(false);
  const [wins, setWins] = useState([]);
  const [payments, setPayments] = useState([]); // ✅ new
  const [loading, setLoading] = useState(false);
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

  // --- Fetchers -------------------------------------------------------------
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [wRes, pRes] = await Promise.all([
        request("/api/wins/my"),
        // If filter by status is not supported, we filter client-side below
        request("/api/payments/my?status=paid"),
      ]);

      const wItems = wRes?.items || wRes?.data?.items || wRes?.data || [];
      setWins(Array.isArray(wItems) ? wItems : []);

      const pItemsRaw = pRes?.items || pRes?.data?.items || pRes?.data || [];
      const pItems = Array.isArray(pItemsRaw) ? pItemsRaw : [];
      // Keep only successful payments (API shapes can vary slightly)
      const paidOnly = pItems.filter(
        (p) =>
          (p?.status || p?.payment?.status || "").toLowerCase() === "paid"
      );
      setPayments(paidOnly.slice(0, 15)); // cap to avoid huge lists
    } catch {
      setWins([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, pollMs);
    return () => clearInterval(t);
  }, [pollMs]);

  // --- Build merged notifications ------------------------------------------
  const notifications = useMemo(() => {
    const winCards =
      (wins || []).map((w) => {
        const id = w?._id || w?.id || w?.auctionCode;
        const title = w?.title || w?.auctionTitle || w?.auctionCode || "Auction";
        const status = (w?.purchaseStatus || "pending").toUpperCase();
        const amount =
          typeof w?.finalPrice === "number"
            ? money(w?.finalPrice, "USD")
            : w?.finalPrice || "";
        const ts =
          new Date(w?.endedAt || w?.createdAt || Date.now()).getTime();

        return {
          id,
          type: "win",
          title: `You won: ${title}`,
          meta: `Final: ${amount} • Status: ${status}`,
          ts,
          onClick: () => {
            if (id) markSeen(id);
            setOpen(false);
            navigate("/auction/buyer?tab=history");
          },
        };
      }) || [];

    const payCards =
      (payments || []).map((p) => {
        const id = p?._id || p?.id || p?.orderNo || p?.orderId;
        const orderNo = p?.orderNo || (p?.order && p?.order.orderNo) || "—";
        const ccy = p?.currency || p?.amounts?.currency || "USD";
        const total = p?.total ?? p?.amounts?.total ?? p?.subtotal ?? 0;
        const ts = new Date(p?.updatedAt || p?.createdAt || Date.now()).getTime();

        return {
          id,
          type: "payment",
          title: `Payment Success`,
          meta: `Order ${orderNo} • ${money(total, ccy)}`,
          ts,
          onClick: () => {
            if (id) markSeen(id);
            setOpen(false);
            navigate(PAYMENTS_ROUTE);
          },
        };
      }) || [];

    // Sort newest first if timestamps exist
    return [...winCards, ...payCards].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }, [wins, payments]);

  // --- Unseen count over combined list --------------------------------------
  const unseenCount = useMemo(() => {
    let c = 0;
    for (const n of notifications) if (n.id && !seen[n.id]) c++;
    return c;
  }, [notifications, seen]);

  // --- Seen helpers ---------------------------------------------------------
  const markSeen = (id) => {
    if (!id) return;
    const next = { ...seen, [id]: Date.now() };
    setSeen(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const clearAll = () => {
    if (!notifications?.length) return;
    const next = { ...seen };
    for (const n of notifications) {
      if (n.id) next[n.id] = Date.now();
    }
    setSeen(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Clear current visual list
    setWins([]);
    setPayments([]);
    // setOpen(false); // optional: close after clearing
  };

  // --- UI -------------------------------------------------------------------
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
                  <button key={n.id || Math.random()} className={itemCls} onClick={n.onClick}>
                    <div className="gz-wn-row">
                      <i className={`fas ${iconClass} gz-wn-ico`} />
                      <div style={{ flex: 1 }}>
                        <div className="gz-wn-title">{n.title}</div>
                        <div className="gz-wn-meta">{n.meta}</div>
                      </div>
                      {isUnseen && <span className="gz-wn-new" title="new" />}
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="gz-wn-foot">
            <button className="gz-wn-clear" onClick={clearAll} disabled={!notifications?.length}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
