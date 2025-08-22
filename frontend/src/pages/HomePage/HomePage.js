import React, { useEffect } from "react";
import "./HomePage.css";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";



const HomePage = () => {

  useEffect(() => {
    // Particles.js
    if (window.particlesJS) {
      window.particlesJS('particles-js', {
        particles: {
          number: { value: 60, density: { enable: true, value_area: 800 } },
          color: { value: "#d4af37" },
          shape: { type: "circle" },
          opacity: { value: 0.3, random: true },
          size: { value: 3, random: true },
          line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.1, width: 1 },
          move: { enable: true, speed: 1, direction: "none", random: true, straight: false, out_mode: "out", bounce: false }
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true }
        },
        retina_detect: true
      });
    }

    // Header scroll effect
    const handleScroll = () => {
      const header = document.getElementById("header");
      if (window.scrollY > 100) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", handleScroll);

    // Three.js main gem and featured gems
    const initGems = () => {
      const gemContainer = document.getElementById("gem-container");
      if (!gemContainer || !window.THREE) return;

      // Main Gem
      let mainScene, mainCamera, mainRenderer, mainGem;
      let pointLights = [];

      mainScene = new window.THREE.Scene();
      mainCamera = new window.THREE.PerspectiveCamera(45, gemContainer.clientWidth / gemContainer.clientHeight, 0.1, 1000);
      mainCamera.position.z = 12;
      mainRenderer = new window.THREE.WebGLRenderer({ antialias: true, alpha: true });
      mainRenderer.setSize(gemContainer.clientWidth, gemContainer.clientHeight);
      mainRenderer.setPixelRatio(window.devicePixelRatio);
      gemContainer.appendChild(mainRenderer.domElement);

      // Lights
      const ambientLight = new window.THREE.AmbientLight(0xffffff, 2.0);
      mainScene.add(ambientLight);
      const dirLight1 = new window.THREE.DirectionalLight(0xffffff, 3);
      dirLight1.position.set(10, 10, 10); mainScene.add(dirLight1);
      const dirLight2 = new window.THREE.DirectionalLight(0x3498db, 2);
      dirLight2.position.set(-10, 10, 5); mainScene.add(dirLight2);

      const point1 = new window.THREE.PointLight(0xffe0b2, 2, 50);
      point1.position.set(5, 5, 5); mainScene.add(point1); pointLights.push(point1);
      const point2 = new window.THREE.PointLight(0xd4af37, 2, 50);
      point2.position.set(-5, -5, 5); mainScene.add(point2); pointLights.push(point2);

      const hemiLight = new window.THREE.HemisphereLight(0xffffbb, 0x080820, 1.5);
      mainScene.add(hemiLight);

      // Load main gem
      const loader = new window.THREE.GLTFLoader();
      loader.load(
        "gem.glb",
        function (gltf) {
          mainGem = gltf.scene;
          mainGem.traverse((child) => {
            if (child.isMesh) {
              child.material.color.set(0xffffff);
              child.material.emissive = new window.THREE.Color(0xaaaaaa);
              child.material.emissiveIntensity = 0.5;
              child.material.metalness = 0.7;
              child.material.roughness = 0.1;
            }
          });
          mainGem.scale.set(3, 3, 3);
          mainGem.position.y = -0.5;
          mainGem.rotation.x = Math.PI / 6;
          mainScene.add(mainGem);
          gemContainer.querySelector(".loader").style.display = "none";
        },
        undefined,
        function (error) {
          console.error(error);
          gemContainer.querySelector(".loader").style.display = "none";
          gemContainer.innerHTML = '<div style="color:#d4af37;text-align:center;padding-top:40%;font-size:18px;">Gem Model Preview</div>';
        }
      );

      const animateMainGem = () => {
        requestAnimationFrame(animateMainGem);
        if (mainGem) mainGem.rotation.y += 0.005;
        const time = Date.now() * 0.001;
        pointLights.forEach((light, i) => {
          light.position.x = Math.sin(time * 0.7 + i) * 8;
          light.position.y = Math.cos(time * 0.5 + i) * 8;
          light.position.z = Math.sin(time * 0.3 + i) * 8;
        });
        mainRenderer.render(mainScene, mainCamera);
      };
      animateMainGem();
      window.addEventListener("resize", () => {
        mainCamera.aspect = gemContainer.clientWidth / gemContainer.clientHeight;
        mainCamera.updateProjectionMatrix();
        mainRenderer.setSize(gemContainer.clientWidth, gemContainer.clientHeight);
      });

      // Featured Gems
      const gemList = [
        { id: "gem1", modelPath: "gem2.glb" },
        { id: "gem2", modelPath: "gem2.glb" },
        { id: "gem3", modelPath: "gem2.glb" },
      ];

      gemList.forEach((container) => {
        const gemElement = document.getElementById(container.id);
        const parent = gemElement.parentElement;
        const loader = parent.querySelector(".loader");

        const scene = new window.THREE.Scene();
        const camera = new window.THREE.PerspectiveCamera(45, gemElement.clientWidth / gemElement.clientHeight, 0.1, 100);
        camera.position.z = 10;

        const renderer = new window.THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(gemElement.clientWidth, gemElement.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        gemElement.appendChild(renderer.domElement);

        scene.add(new window.THREE.AmbientLight(0xffffff, 1.5));
        const dir1 = new window.THREE.DirectionalLight(0xffffff, 2);
        dir1.position.set(5, 5, 5); scene.add(dir1);
        const dir2 = new window.THREE.DirectionalLight(0xd4af37, 1.5);
        dir2.position.set(-5, 5, 5); scene.add(dir2);
        const pointLight = new window.THREE.PointLight(0xffffff, 2, 30);
        pointLight.position.set(0, 0, 10); scene.add(pointLight);

        const modelLoader = new window.THREE.GLTFLoader();
        modelLoader.load(
          container.modelPath,
          function (gltf) {
            const gem = gltf.scene;
            const box = new window.THREE.Box3().setFromObject(gem);
            const center = box.getCenter(new window.THREE.Vector3());
            gem.position.sub(center);
            gem.traverse((child) => {
              if (child.isMesh) {
                child.material.color.set(0xffffff);
                child.material.emissive = new window.THREE.Color(0x888888);
                child.material.emissiveIntensity = 0.4;
                child.material.metalness = 0.6;
                child.material.roughness = 0.2;
              }
            });
            gem.scale.set(2, 2, 2);
            scene.add(gem);
            loader.style.display = "none";

            const animate = () => {
              requestAnimationFrame(animate);
              gem.rotation.y += 0.01;
              renderer.render(scene, camera);
            };
            animate();
          },
          undefined,
          function (error) {
            console.error(error);
            loader.style.display = "none";
            gemElement.innerHTML = '<div style="color:#d4af37;text-align:center;padding-top:40%;">Gem Preview</div>';
          }
        );
      });
    };

    initGems();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="home-container">
      <div id="particles-js"></div>

      <Header/>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>Rare Gems, Timeless Beauty</h1>
          <p>Discover our exclusive collection of ethically sourced, premium quality gemstones for collectors and connoisseurs.</p>
          <button className="btn">Explore Collection</button>
        </div>
        <div id="gem-container" className="gem-loading">
          <div className="loader"></div>
        </div>
      </section>

      {/* Featured Gems */}
      <section className="featured-gems">
        <div className="section-title">
          <h2>Exquisite Selection</h2>
          <p>Handpicked gems of exceptional quality and brilliance</p>
        </div>
        <div className="gems-grid">
          {["Royal Blue Sapphire", "Burmese Ruby", "Emerald Cut Diamond"].map((name, idx) => (
            <div key={idx} className="gem-card">
              <div className="gem-image gem-loading">
                <div className="loader"></div>
                <div className="gem-model" id={`gem${idx + 1}`}></div>
              </div>
              <div className="gem-info">
                <h3>{name}</h3>
                <div className="gem-price">{["$8,450", "$12,800", "$15,200"][idx]}</div>
                <div className="gem-specs">
                  <span>{["3.25 Carat", "2.75 Carat", "2.10 Carat"][idx]}</span>
                  <span>{["AAA Quality", "Pigeon Blood", "VVS1 Clarity"][idx]}</span>
                </div>
                <a href="#" className="cta-btn">View Details</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="benefits">
        <div className="section-title">
          <h2>Why Choose Lux Gems</h2>
          <p>Our commitment to excellence in every facet</p>
        </div>
        <div className="benefits-grid">
          {[
            { icon: "fas fa-gem", title: "Premium Quality", desc: "Each gem is hand-selected for exceptional color, clarity, and brilliance." },
            { icon: "fas fa-globe-americas", title: "Ethically Sourced", desc: "We ensure responsible mining practices and fair trade principles." },
            { icon: "fas fa-certificate", title: "Certified Authenticity", desc: "All gems come with internationally recognized certification." },
            { icon: "fas fa-shipping-fast", title: "Secure Delivery", desc: "Discreet packaging and insured worldwide shipping." },
          ].map((b, i) => (
            <div key={i} className="benefit-card">
              <div className="benefit-icon"><i className={b.icon}></i></div>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter">
        <h2>Join Our Exclusive List</h2>
        <p>Subscribe to receive updates on new arrivals, special offers, and gemstone insights.</p>
        <div className="newsletter-form">
          <input type="email" placeholder="Your email address" />
          <button>Subscribe</button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
