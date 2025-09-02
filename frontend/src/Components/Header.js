// src/Components/Header.jsx (or Header.js)
import React from "react";
import "./HeaderFooter.css";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

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

  // ✅ Always send users to /inventory so InventoryPage loads
  const handleCollectionClick = (e) => {
    e.preventDefault();
    navigate("/inventory");
  };

  return (
    <header id="header">
      <div className="logo">GemZyne</div>
      <nav className="nav-links">
        <Link to="/mainhome">Home</Link>
        {/* ✅ Point the link to /inventory and keep onClick as a SPA navigate fallback */}
        <Link to="/inventory" onClick={handleCollectionClick}>
          Collection
        </Link>
        <Link to="/auction">Auction</Link>
        <Link to="/about">About</Link>
        <Link to="/review">Review & Feedback</Link>
      </nav>
      <div className="header-actions">
        <i className="fas fa-search"></i>
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
