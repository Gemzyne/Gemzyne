import React from "react";
import { Link } from "react-router-dom";   
import "./HeaderFooter.css";

const Header = () => {
  return (
    <header id="header">
      <div className="logo">GemZyne</div>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/collection">Collection</Link>
        <Link to="/auction">Auction</Link>
        <Link to="/about">About</Link>
        <Link to="/reviews">Review & Feedback</Link> 
      </nav>
      <div className="header-actions">
        <i className="fas fa-search"></i>
        <i className="fas fa-user"></i>
        <i className="fas fa-shopping-bag"></i>
      </div>
    </header>
  );
};

export default Header;


