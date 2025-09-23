// AboutUS.jsx
import React, { useEffect } from "react";
import "./AboutUs.css";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import founderImg from "../../Assets/founder.jpg";
import Gemimg from "../../Assets/rathnapura-gems.webp";
import Gems from "../../Assets/gems.webp";
import Bggems from "../../Assets/gemhero.jpg";
import signature from "../../Assets/sig.png";

const AboutUs = () => {
  // Particles (same vibe as Home, slightly lighter)
  useEffect(() => {
    if (window.particlesJS) {
      window.particlesJS("particles-js-about", {
        particles: {
          number: { value: 45, density: { enable: true, value_area: 900 } },
          color: { value: "#d4af37" },
          shape: { type: "circle" },
          opacity: { value: 0.25, random: true },
          size: { value: 2.6, random: true },
          line_linked: {
            enable: true,
            distance: 140,
            color: "#d4af37",
            opacity: 0.08,
            width: 1,
          },
          move: { enable: true, speed: 0.9, random: true, out_mode: "out" },
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
    }
  }, []);
  

  return (
    <div className="about-container">
      <div id="particles-js-about" />

      <Header />

      {/* Hero */}
      <section
        className="about-hero"
        style={{
          // local image to avoid broken external URLs
          backgroundImage: `linear-gradient(rgba(10,10,10,.72), rgba(10,10,10,.72)), url(${Bggems})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="about-hero-content">
          <h1>Our Legacy in Gemstones</h1>
          <p>
            For generations we’ve connected the world with Sri Lanka’s finest,
            ethically sourced gemstones.
          </p>

          {/* Quick trust badges */}
          <div className="about-stats" aria-label="GemZyne highlights">
            <div className="stat">
              <span className="stat-num">35+</span>
              <span className="stat-label">Years Expertise</span>
            </div>
            <div className="stat">
              <span className="stat-num">2,500+</span>
              <span className="stat-label">Gems Certified</span>
            </div>
            <div className="stat">
              <span className="stat-num">100%</span>
              <span className="stat-label">Ethically Sourced</span>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="about-story">
        <div className="section-title">
          <h2>The GemZyne Story</h2>
          <p>From the heart of Ratnapura to collectors worldwide</p>
        </div>

        <div className="story-content">
          <div className="story-text">
            <p>
              GemZyne was founded by <strong>Mr. Hapuu</strong>, a master
              gemologist with deep roots in Ratnapura—Sri Lanka’s legendary
              “City of Gems.” For over three decades, our family has sourced
              exceptional stones directly from trusted miners and artisanal
              cutters.
            </p>
            <p>
              What began as a small family workshop has grown into a trusted
              platform serving connoisseurs across the globe. We focus on{" "}
              <em>traceable origin</em>, <em>honest grading</em>, and{" "}
              <em>museum-grade preparation</em> for every gem that bears the
              GemZyne name.
            </p>
            <p>
              Today, we combine traditional Sri Lankan craftsmanship with
              modern, transparent buying—high-resolution imagery, third-party
              certificates, and a customer experience tuned for serious
              collectors and first-time buyers alike.
            </p>
          </div>

          <div className="story-image">
            <img
              src={Gemimg}
              alt="Ratnapura gem region in Sri Lanka"
              loading="lazy"
            />
            <div className="image-caption">
              The gem-rich lands of Ratnapura, Sri Lanka
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="founder-section">
        <div className="founder-content">
          <div className="founder-image">
            <img
              src={founderImg}
              alt="Mr. Wickramarathna — Founder of GemZyne"
              loading="lazy"
            />
          </div>

          <div className="founder-details">
            <h2>Mr. Hapuu</h2>
            <h3>Founder &amp; Master Gemologist</h3>
            <p>
              With over <strong>35 years</strong> in the trade, Mr.
              Hapuu is known for uncompromising standards in color,
              clarity, and cut. He personally oversees the selection and
              preparation of each stone, working with a network of Sri Lankan
              miners whose families have collaborated with ours for generations.
            </p>
            <p>
              Every GemZyne piece reflects his core principles:{" "}
              <strong>integrity</strong>, <strong>authenticity</strong>, and{" "}
              <strong>respect</strong> for the people and places that make these
              gems possible.
            </p>
            <div className="founder-signature">
              <img src={signature} alt="Founder’s signature" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="values-section">
        <div className="section-title">
          <h2>Our Values</h2>
          <p>The principles that guide everything we do</p>
        </div>

        <div className="values-grid">
          <div className="value-card">
            <div className="value-icon">
              <i className="fas fa-handshake" aria-hidden="true"></i>
            </div>
            <h3>Integrity</h3>
            <p>
              Transparent origin, accurate grading, and honest pricing—always.
            </p>
          </div>

          <div className="value-card">
            <div className="value-icon">
              <i className="fas fa-seedling" aria-hidden="true"></i>
            </div>
            <h3>Sustainability</h3>
            <p>
              Ethical sourcing and fair partnerships with Sri Lankan miners and
              cutters.
            </p>
          </div>

          <div className="value-card">
            <div className="value-icon">
              <i className="fas fa-award" aria-hidden="true"></i>
            </div>
            <h3>Expertise</h3>
            <p>
              Generations of knowledge ensure every gem meets museum-grade
              standards.
            </p>
          </div>

          <div className="value-card">
            <div className="value-icon">
              <i className="fas fa-heart" aria-hidden="true"></i>
            </div>
            <h3>Passion</h3>
            <p>
              We’re storytellers as much as sellers—each stone is a piece of Sri
              Lanka’s heritage.
            </p>
          </div>
        </div>
      </section>

      {/* Sri Lankan Gems */}
      <section className="sl-gems">
        <div className="section-title">
          <h2>The Sri Lankan Gem Heritage</h2>
          <p>Why Sri Lankan stones are revered by collectors</p>
        </div>

        <div className="heritage-content">
          <div className="heritage-text">
            <p>
              Sri Lanka has supplied the world with exceptional gems for more
              than <strong>2,500 years</strong>. Unique geology and artisanal
              expertise produce stones with world-class color and life:
            </p>

            <ul>
              <li>
                <strong>Sapphires:</strong> Iconic <em>cornflower blue</em> and
                coveted Padparadscha varieties
              </li>
              <li>
                <strong>Rubies:</strong> Highly saturated reds with superb
                clarity
              </li>
              <li>
                <strong>Cat’s Eye:</strong> Mesmerizing chatoyancy with crisp,
                centered lines
              </li>
              <li>
                <strong>Padparadscha:</strong> Rare pink-orange sapphire unique
                to the island
              </li>
              <li>
                <strong>Alexandrite:</strong> Dramatic color-change from green
                to red
              </li>
            </ul>

            <p>
              Every GemZyne stone is offered with proper certification and full
              disclosures, so you can collect with confidence.
            </p>
          </div>

          <div className="heritage-image">
            <img
              src={Gems}
              alt="A spread of Sri Lankan sapphire, ruby, and cat's eye gems"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="about-cta"
        // keep it theme-consistent and fast — no external bg:
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(26,26,26,.85), rgba(10,10,10,.92))",
        }}
      >
        <div className="cta-content">
          <h2>Experience the GemZyne Difference</h2>
          <p>
            Explore our curated collection of certified Sri Lankan gemstones.
          </p>
          <a href="/inventory" className="btn">
            Browse Collection
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;
