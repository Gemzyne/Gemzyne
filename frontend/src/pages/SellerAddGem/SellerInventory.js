import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../Components/Header";
import { api } from "../../api";
import SellerSidebar from "../../Components/SellerSidebar";
import "../SellerAddGem/SellerInventory.css";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const SellerInventory = () => {
  const particlesLoaded = useRef(false);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, name: "" });

  // Particles
  useEffect(() => {
    const initParticles = () => {
      if (window.particlesJS && !particlesLoaded.current) {
        window.particlesJS("particles-js", {
          particles: {
            number: { value: 60, density: { enable: true, value_area: 800 } },
            color: { value: "#d4af37" },
            shape: { type: "circle" },
            opacity: { value: 0.3, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1 },
            move: { enable: true, speed: 1, direction: "none", random: true, out_mode: "out" },
          },
          interactivity: {
            detect_on: "canvas",
            events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true },
          },
          retina_detect: true,
        });
        particlesLoaded.current = true;
      }
    };
    if (!window.particlesJS) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
      script.async = true;
      script.onload = initParticles;
      document.head.appendChild(script);
      return () => document.head.removeChild(script);
    } else {
      initParticles();
    }
  }, []);

  // Fetch gems
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.gems.list({ page: 1, limit: 1000 });
        if (!cancelled) setItems(res?.data || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch *my* gems (show all statuses to seller)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.gems.mine();
        if (!cancelled) setItems(res?.data || res || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const numberUSD = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
      : "-";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (g) =>
      !q ||
      g.name?.toLowerCase().includes(q) ||
      g.type?.toLowerCase().includes(q) ||
      g.gemId?.toLowerCase().includes(q) ||
      g.sku?.toLowerCase().includes(q) ||
      g.certificateNumber?.toLowerCase().includes(q);

    const passFilter = (g) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "in-stock") return g.status === "in_stock";
      if (activeFilter === "out-of-stock") return g.status === "out_of_stock";
      return true;
    };

    return (items || []).filter(matches).filter(passFilter);
  }, [items, search, activeFilter]);

  // ---- EDIT: go to /seller/gems/:id/edit
  const handleEdit = (g) => {
    navigate(`/seller/gems/${g._id}/edit`);
  };

  // ---- DELETE ----
  const askDelete = (g) => setConfirmDelete({ open: true, id: g._id, name: g.name || g.gemId || "this gem" });
  const doDelete = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/api/gems/${confirmDelete.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert(`Delete failed: ${res.status} ${txt || res.statusText}`);
        return;
      }
      setItems((prev) => prev.filter((x) => x._id !== confirmDelete.id));
      setConfirmDelete({ open: false, id: null, name: "" });
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  return (
    <div className="inventory-page">
      <div id="particles-js"></div>
      <Header />

      <div
        style={{
          maxWidth: "none",
          margin: 0,
          padding: "0 16px 0 0",
          marginTop: "96px",
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <aside style={{ position: "sticky", top: 96, alignSelf: "start", zIndex: 2 }}>
          <SellerSidebar />
        </aside>

        <main className="inventory-container" style={{ paddingTop: 0, margin: 0 }}>
          <div className="inventory-header">
            <div className="header-text">
              <h1>Gem Inventory Management</h1>
              <p>Manage your precious gem collection with our intuitive inventory system.</p>
            </div>

            {/* Moved: Only the Add New Gem button sits to the right side */}
            <button
              className="btn add-gem-btn"
              onClick={() => {
                navigate("/seller/gems/new");
              }}
            >
              <i className="fas fa-plus-circle"></i> Add New Gem
            </button>
          </div>

          <div className="inventory-controls">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search gems by name, type, ID, SKU or certificate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-options">
              <button className={`filter-btn ${activeFilter === "all" ? "active" : ""}`} onClick={() => setActiveFilter("all")}>
                <i className="fas fa-gem"></i> All Gems
              </button>
              <button
                className={`filter-btn ${activeFilter === "in-stock" ? "active" : ""}`}
                onClick={() => setActiveFilter("in-stock")}
              >
                <i className="fas fa-box-open"></i> In Stock
              </button>
              <button
                className={`filter-btn ${activeFilter === "out-of-stock" ? "active" : ""}`}
                onClick={() => setActiveFilter("out-of-stock")}
              >
                <i className="fas fa-times-circle"></i> Out of Stock
              </button>
            </div>
          </div>

          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Gem&nbsp;ID</th>
                  <th>Gem&nbsp;Name</th>
                  <th>Type</th>
                  <th>Carat</th>
                  <th>Dimensions (mm)</th>
                  <th>Color</th>
                  <th>Shape/Cut</th>
                  <th>Clarity</th>
                  <th>Cut Quality</th>
                  <th>Treatment</th>
                  <th>Certification</th>
                  <th>Cert&nbsp;#</th>
                  <th>Price&nbsp;($)</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={16} style={{ textAlign: "center", color: "#b0b0b0", padding: "18px" }}>
                      Loading…
                    </td>
                  </tr>
                )}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={16} style={{ textAlign: "center", color: "#b0b0b0", padding: "18px" }}>
                      No gems found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((g) => {
                    const statusClass =
                      g.status === "in_stock"
                        ? "in-stock"
                        : g.status === "out_of_stock"
                        ? "out-of-stock"
                        : g.status === "reserved"
                        ? "reserved"
                        : g.status === "sold"
                        ? "sold"
                        : "";

                    return (
                      <tr key={g._id}>
                        <td className="nowrap">{g.gemId}</td>
                        <td>{g.name}</td>
                        <td className="nowrap">{g.type}</td>
                        <td className="nowrap">{g.carat}</td>
                        <td className="nowrap">{g.dimensionsMm || "-"}</td>
                        <td className="nowrap">{g.colorGrade || "-"}</td>
                        <td className="nowrap">{g.shape || "-"}</td>
                        <td className="nowrap">{g.clarityGrade || "-"}</td>
                        <td className="nowrap">{g.cutQuality || "-"}</td>
                        <td className="nowrap">{g.treatment || "-"}</td>
                        <td className="nowrap">{g.certificationAgency || "-"}</td>
                        <td className="nowrap">{g.certificateNumber || "-"}</td>
                        <td className="nowrap">{numberUSD(g.priceUSD)}</td>
                        <td>
                          <span className={`status ${statusClass}`}>{g.status?.replace(/_/g, " ") || "-"}</span>
                        </td>
                        <td className="nowrap">
                          {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "-"}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn edit-btn" onClick={() => handleEdit(g)}>
                              <i className="fas fa-edit"></i> Edit
                            </button>
                            <button className="action-btn delete-btn" onClick={() => askDelete(g)}>
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination (visual only) */}
          <div className="pagination">
            <button className={`pagination-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>
              <i className="fas fa-chevron-left"></i> Previous
            </button>
            <button className={`pagination-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>1</button>
            <button className={`pagination-btn ${page === 2 ? "active" : ""}`} onClick={() => setPage(2)}>2</button>
            <button className={`pagination-btn ${page === 3 ? "active" : ""}`} onClick={() => setPage(3)}>3</button>
            <span className="pagination-info">Page {page} of 3</span>
            <button className={`pagination-btn ${page === 3 ? "active" : ""}`} onClick={() => setPage(3)}>
              Next <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          {/* Removed the old "Add New Gem to Inventory" container content (kept only the button, now in header) */}
        </main>
      </div>

      {/* Delete confirm */}
      {confirmDelete.open && (
        <div
          onClick={() => setConfirmDelete({ open: false, id: null, name: "" })}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2147483647
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1a1a", border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 12, padding: 24, width: "min(520px, 92vw)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.45)"
            }}
          >
            <h3 style={{ marginBottom: 10 }}>Delete “{confirmDelete.name}”?</h3>
            <p style={{ color: "#b0b0b0", marginBottom: 20 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setConfirmDelete({ open: false, id: null, name: "" })}>
                Cancel
              </button>
              <button className="btn" onClick={doDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerInventory;
