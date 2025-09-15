import React from "react";
import "./HeaderFooter.css";

const Footer = () => {
  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-col">
          <h3>LUX GEMS</h3>
          <p>
            Discover the world's most exceptional gemstones, curated for
            discerning collectors.
          </p>
        </div>
        <div className="footer-col">
          <h3>Collections</h3>
          <ul>
            {["Sapphires", "Rubies", "Emeralds", "Diamonds", "Rare Gems"].map(
              (c, i) => (
                <li key={i}>
                  <a href="#">
                    <i className="fas fa-gem"></i> {c}
                  </a>
                </li>
              )
            )}
          </ul>
        </div>
        <div className="footer-col">
          <h3>Contact</h3>
          <ul>
            <li>Email: contact@luxgems.com</li>
            <li>Phone: +1 234 567 890</li>
            <li>Address: 123 Gem Street, New York</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        &copy; 2025 Lux Gems. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
