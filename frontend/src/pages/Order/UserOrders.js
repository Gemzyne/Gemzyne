// src/pages/Order/UserOrders.jsx
// Fully functional page that calls GET /api/my-orders.
// Columns: Order Code | Title | Order Details | Payment Status | Order Status.
// If orderStatus is missing in DB, UI shows "processing" (by backend already).

import React, { useEffect, useMemo, useState } from "react";
import Header from "../../Components/Header";

import UserSidebar from "../../Components/UserSidebar";
import "./UserOrders.css";

// Use your existing helper from src/api.js (you already use this pattern elsewhere)
import { request } from "../../api";

// --- helpers ---
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const detailsText = (sel) => {
  if (!sel) return "-";
  const parts = [
    sel.type && cap(sel.type),
    sel.shape && cap(sel.shape),
    (sel.weight || sel.weight === 0) ? `${sel.weight} ct` : "",
    sel.grade,
    sel.polish,
    sel.symmetry,
  ].filter(Boolean);
  return parts.join(" · ");
};

export default function UserOrders() {
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]     = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await request("/api/my-orders", { method: "GET" });
        const list =
          (Array.isArray(res) && res) ||
          res?.items ||
          res?.data ||
          res?.orders ||
          [];

        const mapped = list.map((o) => ({
          id: o.id || o._id,
          orderNo: o.orderNo || o.code || o.orderCode || "-",
          title: o.title || "-",
          details: detailsText(o.selections || o.selection || o.specs),
          paymentStatus: String(o.paymentStatus || "pending"),
          orderStatus: String(o.orderStatus || "processing"),
        }));

        if (mounted) setRows(mapped);
      } catch (e) {
        if (mounted) setErr(e?.message || "Failed to load orders");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const empty = !loading && !rows.length && !err;

  const counts = useMemo(() => {
    const c = { all: rows.length, paid: 0, pending: 0, cancelled: 0 };
    for (const r of rows) {
      if (r.paymentStatus === "paid") c.paid++;
      else if (r.paymentStatus === "cancelled") c.cancelled++;
      else c.pending++;
    }
    return c;
  }, [rows]);

  return (
    <div className="userorders-root">
      {/* particles layer if you use it globally */}
      <div id="particles-js" />

      <Header />

      <div className="userorders-layout">
        <UserSidebar />

        <main className="userorders-main">
          <div className="userorders-header">
            <h1>My Orders</h1>
            <p>See your custom gemstone orders. If the seller hasn’t set an order status yet, it shows <b>processing</b>.</p>
          </div>

          {/* counters */}
          <div className="uo-counters">
            <div className="uo-counter"><div className="uo-counter-label">All</div><div className="uo-counter-value">{counts.all}</div></div>
            <div className="uo-counter"><div className="uo-counter-label">Paid</div><div className="uo-counter-value">{counts.paid}</div></div>
            <div className="uo-counter"><div className="uo-counter-label">Pending</div><div className="uo-counter-value">{counts.pending}</div></div>
            <div className="uo-counter"><div className="uo-counter-label">Cancelled</div><div className="uo-counter-value">{counts.cancelled}</div></div>
          </div>

          {loading && <div className="uo-card">Loading…</div>}
          {err && <div className="uo-card uo-error">{err}</div>}
          {empty && <div className="uo-card">No orders yet.</div>}

          {!loading && !err && !!rows.length && (
            <div className="uo-table-wrap uo-card">
              <table className="uo-table">
                <thead>
                  <tr>
                    <th>Order Code</th>
                    <th>Title</th>
                    <th>Order Details</th>
                    <th>Payment Status</th>
                    <th>Order Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id || r.orderNo}>
                      <td className="uo-code">{r.orderNo}</td>
                      <td className="uo-title">{r.title}</td>
                      <td className="uo-details">{r.details}</td>
                      <td><span className={`uo-badge ps-${r.paymentStatus}`}>{cap(r.paymentStatus)}</span></td>
                      <td><span className={`uo-badge os-${r.orderStatus}`}>{cap(r.orderStatus)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="uo-hint">
                Note: Order status defaults to <b>processing</b> until it changes to <b>shipping</b> or <b>completed</b> by the seller.
              </div>
            </div>
          )}
        </main>
      </div>


    </div>
  );
}
