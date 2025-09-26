// src/Components/WinNotifications.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../api";
import "./WinNotifications.css"; // ✅ scoped styles

const STORAGE_KEY = "gemzyne_win_seen_v1";

function useOutsideClick(ref, onClose) {
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, ref]);
}

export default function WinNotifications({ pollMs = 30000 }) {
  const [open, setOpen] = useState(false);
  const [wins, setWins] = useState([]);
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

  const fetchWins = async () => {
    try {
      setLoading(true);
      const res = await request("/api/wins/my");
      const items = res?.items || res?.data?.items || res?.data || [];
      setWins(Array.isArray(items) ? items : []);
    } catch {
      setWins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWins();
    const t = setInterval(fetchWins, pollMs);
    return () => clearInterval(t);
  }, [pollMs]);

  const unseenCount = useMemo(() => {
    let c = 0;
    for (const w of wins) {
      const key = w?._id || w?.id || w?.auctionCode;
      if (key && !seen[key]) c++;
    }
    return c;
  }, [wins, seen]);

  const markSeen = (id) => {
    if (!id) return;
    const next = { ...seen, [id]: Date.now() };
    setSeen(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const goHistory = () => {
    setOpen(false);
    navigate("/auction/buyer?tab=history");
  };

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
          <div className="gz-wn-head">Winner Notifications</div>

          <div className="gz-wn-list">
            {loading && <div className="gz-wn-loading">Loading…</div>}
            {!loading && (!wins || wins.length === 0) && (
              <div className="gz-wn-empty">No wins yet.</div>
            )}

            {!loading &&
              wins.map((w) => {
                const id = w?._id || w?.id || w?.auctionCode;
                const title = w?.title || w?.auctionTitle || w?.auctionCode;
                const status = (w?.purchaseStatus || "").toUpperCase();
                const amount =
                  typeof w?.finalPrice === "number"
                    ? new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(w.finalPrice)
                    : w?.finalPrice || "";

                const isUnseen = id && !seen[id];

                return (
                  <button
                    key={id}
                    className="gz-wn-item"
                    onClick={() => {
                      if (id) markSeen(id);
                      goHistory();
                    }}
                  >
                    <div className="gz-wn-row">
                      <i className="fas fa-trophy gz-wn-ico" />
                      <div style={{ flex: 1 }}>
                        <div className="gz-wn-title">You won: {title}</div>
                        <div className="gz-wn-meta">
                          Final: {amount} • Status: {status || "PENDING"}
                        </div>
                      </div>
                      {isUnseen && <span className="gz-wn-new" title="new" />}
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="gz-wn-foot">
            <button className="gz-wn-viewall" onClick={goHistory}>
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
