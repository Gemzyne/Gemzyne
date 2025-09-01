import React from "react";
import "./HeaderFooter.css";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    const user = JSON.parse(localStorage.getItem("user")); // comes from login response
    if (!user) {
      navigate("/login"); // not logged in
    } else {
      // redirect based on role
      switch (user.role) {
        case "admin":
          navigate("/admin-dashboard");
          break;
        case "seller":
          navigate("/seller-dashboard");
          break;
        default: // buyer
          navigate("/udashboard");
      }
    }
  };

  return (
    <header id="header">
      <div className="logo">GemZyne</div>
      <nav className="nav-links">
        <Link to="/mainhome">Home</Link>
        <Link to="/collection">Collection</Link>
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
