// src/Components/Header.jsx (or Header.js)
import React from "react";
import "./HeaderFooter.css";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  // Header shadow on scroll
      const handleScroll = () => {
        const header = document.getElementById("header");
        if (!header) return;
        if (window.scrollY > 100) header.classList.add("scrolled");
        else header.classList.remove("scrolled");
      };
      window.addEventListener("scroll", handleScroll);

  const handleProfileClick = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      navigate("/login");
    } else {
      switch (user.role) {
        case "admin":
          navigate("/admin-dashboard");
          break;
        case "seller":
          navigate("/seller-dashboard");
          break;
        default:
          navigate("/udashboard");
      }
    }
  };

  // === AUCTION: role-aware navigation for Auction link (guest → centre, buyer → buyer dashboard, seller → seller dashboard, admin → centre)
  const handleAuctionClick = (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return navigate("/auction"); // guest → public Auction Centre
    if (user.role === "seller") return navigate("/auction/seller"); // seller dashboard
    if (user.role === "admin") return navigate("/auction"); // admins → public centre
    return navigate("/auction/buyer"); // buyers/others → buyer dashboard
  };
  // === AUCTION: end

  return (
    <header id="header">
      <div className="logo"><i className="fas fa-gem" aria-hidden="true"></i> GemZyne</div>
      <nav className="nav-links">
        <Link to="/mainhome">Home</Link>

        {/* ✅ Point the link to /inventory and keep onClick as a SPA navigate fallback */}
        <Link to="/inventory">
          Collection
        </Link>

        {/* === AUCTION: wire role-aware handler while preserving the href === */}
        <Link to="/auction" onClick={handleAuctionClick}>
          Auction
        </Link>
        <Link to="/about">About</Link>
        <Link to="/review">Review & Feedback</Link>
      </nav>
      <div className="header-actions">
        <i
          className="fas fa-user"
          onClick={handleProfileClick}
          style={{ cursor: "pointer" }}
        ></i>
        <Link to="/cart">
          <i className="fas fa-shopping-bag"></i>
        </Link>
      </div>
    </header>
  );
};

export default Header;
