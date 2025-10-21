import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, API_URL } from "../../lib/api";

// Shared chrome
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";

// Seller sidebar (your component)
import SellerSidebar from "../../Components/SellerSidebar";

// Page-scoped styles
import "./AdminFeedbackPage.css";

const initials = (first = "", last = "", email = "") => {
  const a = (first || "").trim()[0];
  const b = (last || "").trim()[0];
  if (a || b) return `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "GG";
};
const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch { return ""; }
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function buildEmailTemplate(f) {
  const cat = f.complaintCategory || "your complaint";
  const name =
    [f.firstName, f.lastName].filter(Boolean).join(" ") || f.email || "Customer";
  const ref =
    f.orderId ? ` (Order #${f.orderId})` : f.productName || f.productId ? ` (${f.productName || f.productId})` : "";
  return (
`Hi ${name},

We’re writing regarding your ${cat}${ref}. 
We’ve reviewed your case and here’s our current update:

• Summary: 
• Next steps: 
• Expected timeline: 

If you have any additional details or questions, just reply to this email.

Best regards,
GemZyne Support`
  );
}


export default function AdminFeedbackPage() {
  const [view, setView] = useState("reviews");       // "reviews" | "complaints"
  const [category, setCategory] = useState("all");   // category filter
  const [statusFilter, setStatusFilter] = useState("all"); // complaints: all|pending|resolved


// Report export controls
const [rStart, setRStart]   = useState("");   // "YYYY-MM-DD"
const [rEnd, setREnd]       = useState("");
const [rType, setRType]     = useState("all");      // all | review | complaint





  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [confirmId, setConfirmId] = useState(null);  // inline delete confirm
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyText, setReplyText] = useState("");

  /** Email compose state **/
const [emailOpenId, setEmailOpenId] = useState(null);
const [emailSubject, setEmailSubject] = useState("");
const [emailBody, setEmailBody] = useState("");

// Modal state
const [modal, setModal] = useState({ open: false, title: "", message: "" });
const openModal = (title, message) => setModal({ open: true, title, message });
const closeModal = () => setModal({ open: false, title: "", message: "" });


  // Particles
  // Particles (unique ID)
  const particlesLoaded = useRef(false);
  useEffect(() => {
    const ensureParticles = () =>
      new Promise((resolve) => {
        if (window.particlesJS) return resolve();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
        s.async = true;
        s.onload = () => resolve();
        document.body.appendChild(s);
      });
    const destroy = () => {
      if (window.pJSDom && window.pJSDom.length) {
        window.pJSDom.forEach((p) => { try { p?.pJS?.fn?.vendors?.destroypJS?.(); } catch {} });
        window.pJSDom = [];
      }
    };
    ensureParticles().then(() => {
      if (particlesLoaded.current) return;
      particlesLoaded.current = true;
      destroy();
      window.particlesJS("adfb-particles", {
        particles: {
          number: { value: 80, density: { enable: true, value_area: 800 } },
          color: { value: "#d4af37" },
          shape: { type: "polygon", polygon: { nb_sides: 6 } },
          opacity: { value: 0.3, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false } },
          size: { value: 3, random: true, anim: { enable: true, speed: 3, size_min: 0.1, sync: false } },
          line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.2, width: 1 },
          move: { enable: true, speed: 2, random: true, out_mode: "out" }
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true },
          modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } } }
        },
        retina_detect: true
      });
    });
    return () => destroy();
  }, []);

  // Fetch all feedback for admins
  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiRequest("/api/feedback?visibility=all", { method: "GET" });
      setItems(Array.isArray(data?.feedback) ? data.feedback : []);
    } catch (e) {
      setError(e.message || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAll(); }, []);

  // Actions
  const doHide = async (id) => {
    try {
      await apiRequest(`/api/feedback/${id}`, { method: "DELETE" });
      setItems((prev) => prev.map((x) => (x._id === id ? { ...x, isAdminHidden: true } : x)));
    } catch (e) { alert(e.message || "Failed to hide"); }
  };
  const doRestore = async (id) => {
    try {
      await apiRequest(`/api/feedback/${id}/restore`, { method: "PATCH" });
      setItems((prev) => prev.map((x) => (x._id === id ? { ...x, isAdminHidden: false } : x)));
    } catch (e) { alert(e.message || "Failed to restore"); }
  };
  const setComplaintStatus = async (id, nextStatus) => {
    try {
      await apiRequest(`/api/feedback/${id}`, { method: "PUT", body: JSON.stringify({ status: nextStatus }) });
      setItems((prev) => prev.map((x) => (x._id === id ? { ...x, status: nextStatus } : x)));
    } catch (e) { alert(e.message || "Failed to update status"); }
  };
  const sendReply = async (id) => {
    const text = (replyText || "").trim();
    if (!text) return alert("Reply cannot be empty.");
    try {
      await apiRequest(`/api/feedback/${id}/reply`, { method: "PATCH", body: JSON.stringify({ text }) });
      await loadAll();
      setReplyText("");
      setReplyOpenId(null);
    } catch (e) { alert(e.message || "Failed to send reply"); }
  };

  // send email
  const sendEmailToComplaint = async (id) => {
  try {
    await apiRequest(`/api/feedback/${id}/email`, {
      method: "POST",
      body: JSON.stringify({
        subject: emailSubject,
        message: emailBody,
      }),
    });
    // Optional: quick UX reset
    setEmailOpenId(null);
    setEmailSubject("");
    setEmailBody("");
    openModal("Email sent", "Email sent successfully.");
  } catch (e) {
  openModal("Email failed", e.message || "Failed to send email");
}
};
const downloadReport = async () => {
  try {
    const params = new URLSearchParams();

    // dates (optional)
    if (rStart) params.set("start", rStart);
    if (rEnd)   params.set("end", rEnd);

    // TYPE —— only send when not "all"
    // rType is your export type selector; if it's "all", omit the param entirely
    if (rType && rType !== "all") {
      params.set("type", rType); // "review" | "complaint"
    }

    // category (optional)
    if (category && category !== "all") params.set("category", category);

    // status (optional) — only include when exporting complaints specifically
    if ((rType === "complaint") && statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API_URL}/api/feedback/report.pdf?${params.toString()}`, {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Download failed (${res.status})`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const labelType = rType || "all";
    a.href = url;
    a.download = `feedback_report_${labelType}_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (e) {
    alert(e.message || "Failed to download report");
  }
};





  // Derived lists
  // Derivations
  const reviews = useMemo(() => items.filter((i) => i.type === "review"), [items]);
  const complaints = useMemo(() => items.filter((i) => i.type === "complaint"), [items]);

  const { responseRate, resolutionRate } = useMemo(() => {
    const total = complaints.length;
    if (!total) return { responseRate: 0, resolutionRate: 0 };
    const responded = complaints.filter((c) => c?.adminReply?.text?.trim()).length;
    const resolved  = complaints.filter((c) => String(c.status || "").toLowerCase() === "resolved").length;
    return {
      responseRate: Math.round((responded / total) * 100),
      resolutionRate: Math.round((resolved  / total) * 100),
    };
  }, [complaints]);

  const categoryMatch = (fb) => {
    if (category === "all") return true;
    if (fb.type === "complaint") {
      return (fb.complaintCategory && fb.complaintCategory === category) ||
             (Array.isArray(fb.categories) && fb.categories.includes(category));
    }
    return Array.isArray(fb.categories) && fb.categories.includes(category);
  };
  const shown = (view === "reviews" ? reviews : complaints)
    .filter(categoryMatch)
    .filter((f) => {
      if (view !== "complaints" || statusFilter === "all") return true;
      const s = String(f.status || "").toLowerCase();
      return statusFilter === "resolved" ? s === "resolved" : s !== "resolved";
    });

  const { totalReviews, totalComplaints, avgRating, dist } = useMemo(() => {
    const totalReviews = reviews.length;
    const totalComplaints = complaints.length;
    const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const avgRating = totalReviews ? (sum / totalReviews).toFixed(1) : "0.0";
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const k = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0)));
      dist[k] += 1;
    });
    return { totalReviews, totalComplaints, avgRating, dist };
  }, [reviews, complaints]);

  const bars = [
    { label: "5 Stars", count: dist[5] || 0 },
    { label: "4 Stars", count: dist[4] || 0 },
    { label: "3 Stars", count: dist[3] || 0 },
    { label: "2 Stars", count: dist[2] || 0 },
    { label: "1 Star", count: dist[1] || 0 },
  ];
  const maxCount = Math.max(1, ...bars.map((b) => b.count));

  return (
    <div className="adfb-root">
      {/* Particles behind everything */}
      <div id="adfb-particles" />

      {/* Shared sticky header */}
      <Header />

      {/* Modal */}
{modal.open && (
  <div className="adfb-modal-backdrop" onClick={closeModal}>
    <div className="adfb-modal" onClick={(e) => e.stopPropagation()}>
      <h3>{modal.title}</h3>
      <p style={{ whiteSpace: "pre-line" }}>{modal.message}</p>
      <div className="adfb-modal-actions">
        <button className="adfb-action" onClick={closeModal}>OK</button>
      </div>
    </div>
  </div>
)}


      {/* Sidebar + main shell */}
      <div className="adfb-shell">
        <SellerSidebar />

        <main className="adfb-main">
          {/* Banner */}
          <section className="adfb-page-header">
            <h1>Feedback Management</h1>
            <p>Manage customer reviews and complaints by category</p>
          </section>

          {/* Filters */}
          <div className="adfb-filter">
            <div className="adfb-filter-group">
              <span className="adfb-filter-label">Category:</span>
              <select
                className="adfb-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="quality">Quality</option>
                <option value="website">Website Issues</option>
                <option value="shipping">Shipping</option>
                <option value="packaging">Packaging</option>
                <option value="value">Value</option>
                <option value="authenticity">Authenticity</option>
              </select>
            </div>

            {view === "complaints" && (
              <div className="adfb-filter-group">
                <span className="adfb-filter-label">Status:</span>
                <select
                  className="adfb-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            )}

            <div className="adfb-toggle">
              <button
                className={`adfb-toggle-btn ${view === "reviews" ? "active" : ""}`}
                onClick={() => setView("reviews")}
              >
                Reviews
              </button>
              <button
                className={`adfb-toggle-btn ${view === "complaints" ? "active" : ""}`}
                onClick={() => setView("complaints")}
              >
                Complaints
              </button>
            </div>


{/* Report controls (right-aligned) */}
<div className="adfb-filter-group" style={{ marginLeft: "auto", flexWrap: "wrap", gap: 10 }}>
  <span className="adfb-filter-label">Report:</span>

  <input
    type="date"
    className="adfb-select"
    value={rStart}
    onChange={(e) => setRStart(e.target.value)}
  />
  <input
    type="date"
    className="adfb-select"
    value={rEnd}
    onChange={(e) => setREnd(e.target.value)}
  />

  <select className="adfb-select" value={rType} onChange={(e) => setRType(e.target.value)}>
    <option value="all">All Types</option>
    <option value="review">Reviews</option>
    <option value="complaint">Complaints</option>
  </select>

  <button className="adfb-action" onClick={downloadReport}>
    <i className="fas fa-download" /> Export PDF
  </button>
</div>


          </div>

          {/* Content grid */}
          <div className="adfb-content">
            {/* List card */}
            <div className="adfb-card">
              <div className="adfb-card-header">
                <h3>{view === "reviews" ? "Customer Reviews" : "Customer Complaints"}</h3>
                {!loading && (
                  <span>
                    Showing {shown.length} of {view === "reviews" ? reviews.length : complaints.length} {view}
                  </span>
                )}
              </div>

              {loading && <div className="adfb-item"><p>Loading…</p></div>}
              {!!error && !loading && <div className="adfb-item"><p style={{ color: "#ff6b6b" }}>{error}</p></div>}
              {!loading && !error && shown.length === 0 && (
                <div className="adfb-item"><p>No items found for this filter.</p></div>
              )}

              {!loading && !error && shown.map((f) => {
                const isReview = f.type === "review";
                const rowClass = isReview ? "adfb-review" : "adfb-complaint";
                const name = [f.firstName, f.lastName].filter(Boolean).join(" ") || f.email || "Anonymous";
                const cats = [
                  ...(isReview ? f.categories || [] : [f.complaintCategory, ...(f.categories || [])]),
                ].filter(Boolean).map(cap);
                const uniqueCats = [...new Set(cats)];
                const rating = Number(f.rating) || 0;
                const orderInfo =
                  f.orderId ? ` • Order #${f.orderId}` :
                  (f.productName || f.productId) ? ` • ${f.productName || f.productId}` : "";
                const isResolved = String(f.status || "").toLowerCase() === "resolved";

                return (
                  <div className={`adfb-item ${rowClass}`} key={f._id}>
                    <div className="adfb-row-head">
                      <div className="adfb-reviewer">
                        <div className="adfb-avatar">{initials(f.firstName, f.lastName, f.email)}</div>
                        <div>
                          <h4 className="adfb-name">{name}</h4>
                          <p className="adfb-meta">{fmtDate(f.createdAt)}{orderInfo}</p>
                        </div>
                      </div>
                      <div className="adfb-rating">
                        {isReview ? ("★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating)) : "—"}
                      </div>
                    </div>

                    <div className="adfb-chips">
                      {uniqueCats.map((c) => (
                        <span key={`${f._id}-${c}`} className={isReview ? "adfb-chip" : "adfb-chip adfb-chip--danger"}>
                          {c}
                        </span>
                      ))}
                    </div>

                    {!isReview && f.adminReply?.text && (
                      <div className="adfb-reply">
                        <strong>Reply:</strong> {f.adminReply.text}
                      </div>
                    )}

                    {!isReview && (
                      <div className={`adfb-status ${isResolved ? "adfb-status--ok" : "adfb-status--warn"}`}>
                        {f.status || "Pending"}
                      </div>
                    )}

                    <div className="adfb-text"><p>{f.feedbackText}</p></div>

                    {(f.productName || f.productId) && (
                      <div className="adfb-gem"><p>{f.productName || f.productId}</p></div>
                    )}

                    <div className="adfb-actions">
                      {!isReview && (
  <>
    {/* Resolve / Mark Pending */}
    <button
      className="adfb-action"
      onClick={() => setComplaintStatus(f._id, isResolved ? "Pending" : "Resolved")}
    >
      <i className="fas fa-check-circle" /> {isResolved ? "Mark Pending" : "Resolve"}
    </button>

    {/* Reply */}
    {replyOpenId === f._id ? (
      <div className="adfb-replybox">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your reply…"
          rows={4}
        />
        <div className="adfb-replybox-actions">
          <button className="adfb-action" onClick={() => sendReply(f._id)}>Send</button>
          <button
            className="adfb-action adfb-action--danger"
            onClick={() => { setReplyOpenId(null); setReplyText(""); }}
          >
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <button
        className="adfb-action"
        onClick={() => { setReplyOpenId(f._id); setReplyText(f.adminReply?.text || ""); }}
      >
        <i className="fas fa-reply" /> Reply
      </button>
    )}

    {/* Email */}
    <button
      className="adfb-action"
      onClick={() => {
        setEmailOpenId((prev) => (prev === f._id ? null : f._id));
        // sensible defaults on open
        setEmailSubject((prev) =>
          prev?.trim() ? prev : `Update on your ${f.complaintCategory || "GemZyne"} complaint`
        );
        setEmailBody((prev) => (prev?.trim() ? prev : buildEmailTemplate(f)));
      }}
    >
      <i className="fas fa-envelope" /> Email
    </button>

    {/* Inline email composer */}
    {emailOpenId === f._id && (
      <div style={{ width: "100%", marginTop: 10, display: "grid", gap: 8 }}>
        <input
          type="text"
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          placeholder="Subject"
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#141414",
            color: "#eee",
          }}
        />
        <textarea
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          placeholder="Type your message…"
          rows={4}
          style={{
            padding: "10px",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#141414",
            color: "#eee",
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8 , justifyContent: "flex-end" }}>
          <button
            className="adfb-action"
            onClick={() => sendEmailToComplaint(f._id)}
            disabled={!emailBody.trim()}
            title={!emailBody.trim() ? "Message required" : "Send"}
          >
            Send Email
          </button>
          <button
            className="adfb-action adfb-action--danger"
            onClick={() => {
              setEmailOpenId(null);
              setEmailSubject("");
              setEmailBody("");
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </>
)}


                      {f.isAdminHidden ? (
                        <button className="adfb-action" onClick={() => doRestore(f._id)}>
                          <i className="fas fa-undo" /> Restore
                        </button>
                      ) : confirmId === f._id ? (
                        <>
                          <button
                            className="adfb-action adfb-action--danger"
                            onClick={() => { doHide(f._id); setConfirmId(null); }}
                          >
                            Confirm
                          </button>
                          <button
                            className="adfb-action adfb-action--danger"
                            onClick={() => setConfirmId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="adfb-action adfb-action--danger"
                          onClick={() => setConfirmId(f._id)}
                        >
                          <i className="fas fa-trash" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sidebar stats (right side) */}
            <aside className="adfb-sidecard">
              <div className="adfb-sidecard__title">Feedback Overview</div>
              <div className="adfb-sidecard__body">
                <div className="adfb-stat"><span>Total Reviews</span><span className="adfb-stat__val">{totalReviews}</span></div>
                <div className="adfb-stat"><span>Total Complaints</span><span className="adfb-stat__val adfb-stat__val--danger">{totalComplaints}</span></div>
                <div className="adfb-stat"><span>Average Rating</span><span className="adfb-stat__val">{avgRating}</span></div>
                <div className="adfb-stat" title="Complaints with at least one reply">
                  <span>Response Rate</span><span className="adfb-stat__val">{responseRate}%</span>
                </div>
                <div className="adfb-stat" title="Complaints marked Resolved">
                  <span>Resolution Rate</span><span className="adfb-stat__val">{resolutionRate}%</span>
                </div>

                <div className="adfb-dist">
                  <h4>Rating Distribution</h4>
                  {bars.map((row) => {
                    const widthPct = maxCount === 0 ? "0%" : `${(row.count / maxCount) * 100}%`;
                    return (
                      <div className="adfb-bar" key={row.label}>
                        <span className="adfb-bar__label">{row.label}</span>
                        <div className="adfb-bar__track">
                          <div className="adfb-bar__fill" style={{ width: widthPct }} />
                        </div>
                        <span className="adfb-bar__count">{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Shared footer */}
      <Footer />
    </div>
  );
}
