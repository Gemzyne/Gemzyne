// src/pages/Order/SellerOrders.js
// Columns: Order ID | Customer Name | Gemstone Details | Total | Payment Status | Status (Edit/Save)
// No delete button. No "Rows:" selector. Correct payment status mapping.

import React, { useEffect, useMemo, useState } from "react";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import SellerSidebar from "../../Components/SellerSidebar";
import "./SellerOrders.css";
import { api } from "../../api";

/* ========= request helper (fallback to local if needed) ========= */
let coreRequest = null;
try { const mod = require("../../api"); coreRequest = mod.request || mod.apiRequest || null; } catch (_) {}
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
async function localRequest(path, { method = "GET", body, headers } = {}) {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || `${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
const request = coreRequest || localRequest;

/* ========= utils ========= */
const STATUS_OPTIONS = [
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
];

// robust customer name extractor
const customerName = (buyer) => {
  if (!buyer) return "—";
  if (typeof buyer === "string") return buyer; // fallback id
  return (
    buyer.name ||
    buyer.fullName ||
    [buyer.firstName, buyer.lastName].filter(Boolean).join(" ") ||
    buyer.username ||
    buyer.email ||
    buyer._id ||
    "—"
  );
};

const toText = (v) =>
  v == null ? "—" : typeof v === "object" ? (v.title || v.name || v._id || JSON.stringify(v)) : String(v);

const money = (n, cur = "USD") => `${cur === "USD" ? "$" : cur + " "}${Number(n || 0).toLocaleString()}`;

const gemSummary = (sel = {}) => {
  const type = toText(sel.type);
  const shape = toText(sel.shape);
  const wt =
    typeof sel.weight === "object"
      ? toText(sel.weight?.value ?? sel.weight?.amount ?? sel.weight)
      : toText(sel.weight);
  const parts = [type, shape, wt ? `${wt} ct` : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
};

// normalize payment status from different backends
const normalizePayStatus = (orderObj, paymentObj) => {
  const raw =
    orderObj?.status ??
    paymentObj?.status ??
    paymentObj?.payment?.status ??
    "pending";
  const val = String(raw).toLowerCase();
  if (val === "paid" || val === "success" || val === "succeeded") return "paid";
  if (val === "cancelled" || val === "canceled" || val === "failed") return "cancelled";
  return "pending";
};

export default function SellerOrders() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20); // fixed; row-count selector removed
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState(null);

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");

  const pages = Math.max(1, Math.ceil(total / limit));
  const showToast = (kind, msg) => { setToast({ kind, msg }); setTimeout(() => setToast(null), 2200); };

  // Try /api/orders -> fallback /api/payments (seller list)
  const fetchOrders = async () => {
    setLoading(true); setError("");
    try {
      try {
        const data = await request(`/api/orders?page=${page}&limit=${limit}`);
        if (data?.items) {
          setItems(data.items || []);
          setTotal(data.total || data.items.length || 0);
          setLoading(false);
          return;
        }
      } catch (err) {
        if (err?.status !== 404) throw err;
      }

      // Fallback to payments list if orders endpoint not available
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      const data2 = await request(`/api/payments?${qs.toString()}`);
      const rows = (data2?.items || []).map((pay) => {
        const o = pay?.order || {};
        return {
          _id: o._id || pay.orderId || pay._id,
          orderNo: o.orderNo || pay.orderNo,
          buyerId: o.buyerId || pay.buyer || pay.buyerId, // may be object
          selections: o.selections || {},
          pricing: o.pricing || { subtotal: pay?.amounts?.total || pay?.amounts?.subtotal },
          currency: o.currency || pay.currency || "USD",
          orderStatus: o.orderStatus || "processing",
          payStatus: normalizePayStatus(o, pay),
        };
      });
      setItems(rows);
      setTotal(data2?.total || rows.length || 0);
    } catch (e) {
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); /* eslint-disable-next-line */ }, [page]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((o) => {
      const hay = [
        o?.orderNo,
        o?._id,
        customerName(o?.buyerId),
        gemSummary(o?.selections),
        o?.orderStatus,
        o?.payStatus,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [q, items]);

  const beginEdit = (row) => { setEditingId(row._id); setDraftStatus(row.orderStatus || "processing"); };

  const commitEdit = async () => {
    const id = editingId; if (!id) return;
    try {
      await api.orders.updateStatus(id, draftStatus);
      setItems((prev) => prev.map((it) => (it._id === id ? { ...it, orderStatus: draftStatus } : it)));
      showToast("ok", "Status saved.");
    } catch (e) {
      showToast("error", e?.message || "Save failed");
    } finally {
      setEditingId(null);
      setDraftStatus("");
    }
  };

  const cancelEdit = () => { setEditingId(null); setDraftStatus(""); };

  return (
    <div className="so-root">
      <Header />

      <div className="so-shell">
        <aside className="so-sidebar"><SellerSidebar /></aside>

        <main className="so-main">
          <div className="so-top">
            <div>
              <h1 className="so-title">Custom Orders</h1>
              <p className="so-sub">Manage custom orders. Edit the production status.</p>
            </div>
            <div className="so-actions">
              <button className="so-btn" onClick={fetchOrders} disabled={loading}>
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          <div className="so-toolbar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="so-input"
              placeholder="Search order id, customer, gem…"
            />
            <div className="so-spacer" />
            {/* Row-count selector removed as requested */}
          </div>

          {error ? <div className="so-alert so-alert-error">{String(error)}</div> : null}

          <div className="so-card">
            <div className="so-table-wrap">
              <table className="so-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer Name</th>
                    <th>Gemstone Details</th>
                    <th>Total</th>
                    <th>Payment Status</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="6" className="so-empty">{loading ? "Loading…" : "No orders found"}</td></tr>
                  ) : (
                    filtered.map((o) => {
                      const isEditing = editingId === o._id;
                      const orderId = String(o.orderNo || o._id);
                      const name = customerName(o.buyerId);
                      const gem = gemSummary(o.selections);
                      const total = money(o?.pricing?.subtotal, o.currency || "USD");

                      return (
                        <tr key={o._id}>
                          <td className="so-ono">{orderId}</td>
                          <td>{name}</td>
                          <td>{gem}</td>
                          <td className="so-price">{total}</td>
                          <td>
                            <span className={`so-badge so-badge-${(o.payStatus || "pending").toLowerCase()}`}>
                              {String(o.payStatus || "pending").toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <select
                                className="so-select"
                                value={isEditing ? draftStatus : (o.orderStatus || "processing")}
                                disabled={!isEditing}
                                onChange={(e) => setDraftStatus(e.target.value)}
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>

                              {!isEditing ? (
                                <button className="so-btn ghost" onClick={() => beginEdit(o)}>Edit</button>
                              ) : (
                                <>
                                  <button className="so-btn" onClick={commitEdit}>Save</button>
                                  <button className="so-btn ghost" onClick={cancelEdit}>Cancel</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="so-pager">
              <button className="so-btn ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>Prev</button>
              <div className="so-pageinfo">Page {page} / {pages}</div>
              <button className="so-btn ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages || loading}>Next</button>
            </div>
          </div>
        </main>
      </div>

      <Footer />

      {toast && <div className={`so-toast ${toast.kind === "error" ? "error" : "ok"}`} role="status">{toast.msg}</div>}
    </div>
  );
}
