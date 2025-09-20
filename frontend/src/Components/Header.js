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

  const handleCollectionClick = (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user"));

    // decide destination based on role
    if (!user) {
      // guest → let them use the customizer
      return navigate("/custom");
    }
    if (user.role === "admin") {
      // if admins shouldn't customize, send to admin area
      return navigate("/custom");
    }
    if (user.role === "seller") {
      // if sellers shouldn't customize, send to seller area
      return navigate("/custom");
    }

    // buyers/default → custom page
    return navigate("/custom");
  };

  return (
    <header id="header">
      <div className="logo">GemZyne</div>
      <nav className="nav-links">
        <Link to="/mainhome">Home</Link>
        <Link to="/custom" onClick={handleCollectionClick}>
          Collection
        </Link>
        <Link to="/auction">Auction</Link>
        <Link to="/about">About</Link>
        <Link to="/reviews">Review & Feedback</Link>
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
