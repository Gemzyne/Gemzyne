import React from "react";
import "./HeaderFooter.css";

const Footer = () => {
  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-col">
          <h3>GemZyne</h3>
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
            <li>Email: Gemzyne2025@gmail.com</li>
            <li>Phone: +94 11 2 975 518</li>
            <li>Address: 123 Wenurage gedara,Rathnapura</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        &copy; 2025 GemZyne. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
