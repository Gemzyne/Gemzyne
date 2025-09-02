import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../Components/Header";
import { api } from "../../api"; // uses same API style as Inventory page
import SellerSidebar from "../../Components/SellerSidebar"; // linked sidebar
import "../SellerAddGem/SellerInventory.css";

const SellerInventory = () => {
  const particlesLoaded = useRef(false);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | in-stock | out-of-stock
  const [page, setPage] = useState(1); // visual only for the demo pagination

  // data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load particles.js and initialize background
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
            line_linked: {
              enable: true,
              distance: 150,
              color: "#d4af37",
              opacity: 0.1,
              width: 1,
            },
            move: { enable: true, speed: 1, direction: "none", random: true, out_mode: "out" },
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
    return () => {
      cancelled = true;
    };
  }, []);

  const numberUSD = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
      : "-";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const matches = (g) => {
      if (!q) return true;
      return (
        g.name?.toLowerCase().includes(q) ||
        g.type?.toLowerCase().includes(q) ||
        g.gemId?.toLowerCase().includes(q) ||
        g.sku?.toLowerCase().includes(q) ||
        g.certificateNumber?.toLowerCase().includes(q)
      );
    };

    const passFilter = (g) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "in-stock") return g.status === "in_stock";
      if (activeFilter === "out-of-stock") return g.status === "out_of_stock";
      return true;
    };

    return (items || []).filter(matches).filter(passFilter);
  }, [items, search, activeFilter]);

  return (
    <div className="inventory-page">
      {/* Particle Background */}
      <div id="particles-js"></div>

      {/* Shared header */}
      <Header />

      {/* Left-aligned page grid (sidebar + content) */}
      <div
        style={{
          // left aligned (no auto-centering)
          maxWidth: "none",
          margin: 0,
          padding: "0 16px",
          marginTop: "120px", // keep content below fixed header
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <aside style={{ position: "sticky", top: 96, alignSelf: "start", zIndex: 2 }}>
          <SellerSidebar />
        </aside>

        {/* Page content */}
        <main className="inventory-container" style={{ paddingTop: 0, margin: 0 }}>
          <div className="inventory-header">
            <h1>Gem Inventory Management</h1>
            <p>
              Manage your precious gem collection with our intuitive inventory system.
              Track availability, update details, and add new arrivals.
            </p>
          </div>

          {/* Controls */}
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
              <button
                className={`filter-btn ${activeFilter === "all" ? "active" : ""}`}
                onClick={() => setActiveFilter("all")}
              >
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

          {/* Inventory Table */}
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
                          <span className={`status ${statusClass}`}>
                            {g.status?.replace(/_/g, " ") || "-"}
                          </span>
                        </td>
                        <td className="nowrap">
                          {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "-"}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn edit-btn">
                              <i className="fas fa-edit"></i> Edit
                            </button>
                            <button className="action-btn delete-btn">
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

          {/* Pagination (visual) */}
          <div className="pagination">
            <button
              className={`pagination-btn ${page === 1 ? "active" : ""}`}
              onClick={() => setPage(1)}
            >
              <i className="fas fa-chevron-left"></i> Previous
            </button>
            <button
              className={`pagination-btn ${page === 1 ? "active" : ""}`}
              onClick={() => setPage(1)}
            >
              1
            </button>
            <button
              className={`pagination-btn ${page === 2 ? "active" : ""}`}
              onClick={() => setPage(2)}
            >
              2
            </button>
            <button
              className={`pagination-btn ${page === 3 ? "active" : ""}`}
              onClick={() => setPage(3)}
            >
              3
            </button>
            <span className="pagination-info">Page {page} of 3</span>
            <button
              className={`pagination-btn ${page === 3 ? "active" : ""}`}
              onClick={() => setPage(3)}
            >
              Next <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          {/* Add New Item Section */}
          <div className="add-item-section">
            <h2>Add New Gem to Inventory</h2>
            <p>Expand your collection by adding new precious gems to the inventory</p>
            <button
              className="btn"
              onClick={() => {
                const qp = new URLSearchParams(window.location.search);
                qp.set("view", "add-gem");
                window.location.search = qp.toString();
              }}
            >
              <i className="fas fa-plus-circle"></i> Add New Gem
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SellerInventory;
