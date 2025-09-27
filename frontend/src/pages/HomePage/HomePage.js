import React, { useEffect, useState, useCallback } from "react";
import "./HomePage.css";
import Header from "../../Components/Header";
import { request } from "../../api";
import Footer from "../../Components/Footer";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const HomePage = () => {
  // ---------- Random Gems ----------
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  const imgUrl = (p) => {
    if (!p) return "/assets/fallback-gem.jpg";
    if (/^https?:\/\//i.test(p) || /^data:/i.test(p)) return p;
    return `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
  };

  const loadRandom = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request("/api/gems/random?limit=3");
      const arr = (data?.items || []).map((g) => ({
        id: g._id,
        name: g.title || g.name,
        price: `$${Number(g.priceUSD || 0).toLocaleString()}`,
        specA: (g.type || "Gem").toUpperCase(),
        specB: "Certified",
        img: imgUrl((g.images || [])[0]),
      }));
      setCards(arr);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- Effects (Particles + Header + Main GLB) ----------
  useEffect(() => {
    // Particles.js (gold theme)
    if (window.particlesJS) {
      window.particlesJS("home-particles", {
        particles: {
          number: { value: 80, density: { enable: true, value_area: 1000 } },
          color: { value: "#d4af37" },
          shape: {
            type: "circle",
            stroke: { width: 0, color: "#000000" },
            polygon: { nb_sides: 5 },
          },
          opacity: {
            value: 0.4,
            random: true,
            anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false },
          },
          size: {
            value: 4,
            random: true,
            anim: { enable: true, speed: 2, size_min: 0.1, sync: false },
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: "#d4af37",
            opacity: 0.2,
            width: 1.5,
          },
          move: {
            enable: true,
            speed: 1.5,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false,
            attract: { enable: true, rotateX: 600, rotateY: 1200 },
          },
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: { enable: true, mode: "bubble" },
            onclick: { enable: true, mode: "repulse" },
            resize: true,
          },
          modes: {
            bubble: {
              distance: 250,
              size: 6,
              duration: 2,
              opacity: 0.8,
              speed: 3,
            },
            repulse: { distance: 200, duration: 0.4 },
          },
        },
        retina_detect: true,
      });
    }

    // Header shadow on scroll
    const handleScroll = () => {
      const header = document.getElementById("header");
      if (!header) return;
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", handleScroll);

    // Three.js premium gem
    const initGems = () => {
      const gemContainer = document.getElementById("gem-container");
      if (!gemContainer || !window.THREE) return;

      const THREE = window.THREE;
      const scene = new THREE.Scene();
      scene.background = null;

      const camera = new THREE.PerspectiveCamera(
        35,
        gemContainer.clientWidth / gemContainer.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0.8, 8.5);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(gemContainer.clientWidth, gemContainer.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      gemContainer.appendChild(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0x332900, 0.6);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffd700, 2.5);
      keyLight.position.set(5, 8, 5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xffb347, 1.2);
      fillLight.position.set(-5, 3, 5);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xffe0a3, 1.8);
      rimLight.position.set(0, 2, -8);
      scene.add(rimLight);

      const pointLight1 = new THREE.PointLight(0xffd700, 1.5, 20);
      pointLight1.position.set(3, 2, 3);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0xffaa00, 1.2, 20);
      pointLight2.position.set(-3, -1, 4);
      scene.add(pointLight2);

      const loader = new THREE.GLTFLoader();
      let gem = null;

      const deg = (d) => (d * Math.PI) / 180;

      loader.load(
        "gem2.glb",
        (gltf) => {
          gem = gltf.scene;
          gem.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshPhysicalMaterial({
                color: 0xd4af37,
                emissive: 0x332200,
                metalness: 0.8,
                roughness: 0.15,
                transmission: 0.4,
                ior: 1.8,
                thickness: 0.9,
                specularIntensity: 1.4,
                clearcoat: 0.9,
                clearcoatRoughness: 0.08,
                envMapIntensity: 2.0,
              });
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          gem.scale.set(1.8, 1.8, 1.8);
          gem.position.set(0, 0, 0);
          gem.rotation.set(deg(-15), deg(25), deg(5));

          scene.add(gem);

          const ld = gemContainer.querySelector(".loader");
          if (ld) ld.style.display = "none";
        },
        undefined,
        () => {
          const ld = gemContainer.querySelector(".loader");
          if (ld) ld.style.display = "none";
          gemContainer.innerHTML =
            '<div style="color:#d4af37;text-align:center;padding-top:40%;font-size:18px;">Premium Gem Preview</div>';
        }
      );

      const environment = new THREE.Mesh(
        new THREE.SphereGeometry(20, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0x222222,
          side: THREE.BackSide,
        })
      );
      environment.visible = false;
      scene.add(environment);

      let raf = null;
      const clock = new THREE.Clock();

      const animate = () => {
        raf = requestAnimationFrame(animate);
        const delta = clock.getDelta();

        if (gem) {
          gem.rotation.y += 0.2 * delta;
          gem.rotation.x = Math.sin(clock.elapsedTime * 0.3) * 0.1 - 0.15;
        }

        camera.position.x = Math.sin(clock.elapsedTime * 0.2) * 0.2;
        camera.position.y = Math.cos(clock.elapsedTime * 0.3) * 0.1 + 0.8;

        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        camera.aspect = gemContainer.clientWidth / gemContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(gemContainer.clientWidth, gemContainer.clientHeight);
      };
      window.addEventListener("resize", onResize);

      const onVis = () => {
        if (document.hidden) {
          if (raf) cancelAnimationFrame(raf);
          raf = null;
        } else if (!raf) {
          animate();
        }
      };
      document.addEventListener("visibilitychange", onVis);

      // Cleanup
      return () => {
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("resize", onResize);
        if (raf) cancelAnimationFrame(raf);
        renderer.dispose?.();
        renderer.forceContextLoss?.();
        renderer.domElement?.remove();
      };
    };

    const dispose = initGems();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      dispose && dispose();
    };
  }, []);

  useEffect(() => {
    loadRandom();
  }, [loadRandom]);

  return (
    <div className="home-container">
      <div id="home-particles" />

      <Header />

      {/* Premium Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Rare Gems, Timeless Beauty</h1>
          <p>
            Discover our exclusive collection of ethically sourced, premium
            quality gemstones for collectors and connoisseurs.
          </p>
        <div className="hero-actions">
            <a className="btn btn-primary" href="/inventory">
              Explore Collection
            </a>
            <a className="btn btn-secondary" href="/about">
              Learn More
            </a>
          </div>
        </div>
        <div id="gem-container" className="gem-loading"></div>
      </section>

      {/* Random Gems */}
      <section className="featured-gems">
        <div className="section-title">
          <h2>Exquisite Selection</h2>
          <p>Handpicked gems from our premium collection</p>
        </div>

        <div className="gems-grid">
          {cards.map((g) => (
            <div key={g.id} className="gem-card">
              <div className="gem-image">
                <div className="premium-badge">Premium</div>
                <img src={g.img} alt={g.name} loading="lazy" />
                <div className="gem-overlay">
                  <a href={`/gems/${g.id}`} className="view-details-btn">
                    Quick View
                  </a>
                </div>
              </div>
              <div className="gem-info">
                <h3>{g.name}</h3>
                <div className="gem-price">{g.price}</div>
                <div className="gem-specs">
                  <span>{g.specA}</span>
                  <span>{g.specB}</span>
                </div>
                <a href={`/gems/${g.id}`} className="cta-btn">
                  View Details
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="benefits">
        <div className="section-title">
          <h2>Why Choose GemZyne</h2>
          <p>Excellence in every facet of our service</p>
        </div>
        <div className="benefits-grid">
          {[
            {
              icon: "fas fa-gem",
              title: "Premium Quality",
              desc:
                "Each gem is hand-selected for exceptional color, clarity, and brilliance.",
            },
            {
              icon: "fas fa-globe-americas",
              title: "Ethically Sourced",
              desc:
                "We ensure responsible mining practices and fair trade principles.",
            },
            {
              icon: "fas fa-certificate",
              title: "Certified Authenticity",
              desc:
                "All gems come with internationally recognized certification.",
            },
            {
              icon: "fas fa-shipping-fast",
              title: "Secure Delivery",
              desc:
                "Discreet packaging and insured worldwide shipping.",
            },
          ].map((b, i) => (
            <div key={i} className="benefit-card">
              <div className="benefit-icon">
                <i className={b.icon} />
              </div>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter">
        <div className="newsletter-content">
          <h2>Join Our Exclusive Collector's Circle</h2>
          <p>
            Be the first to access new arrivals, private viewings, and special
            offers.
          </p>
          <div className="newsletter-form">
            <input
              type="email"
              placeholder="Your email address"
              className="premium-input"
            />
            <button className="premium-button">Subscribe</button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
