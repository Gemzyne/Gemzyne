import React from "react";
import "./HeaderFooter.css";

const Header = () => {
  return (
    <header id="header">
      <div className="logo">GemZyne</div>
      <nav className="nav-links">
        <a href="#">Home</a>
        <a href="#">Collection</a>
        <a href="#">Auction</a>
        <a href="#">About</a>
        <a href="#">Review & Feedback</a>
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

