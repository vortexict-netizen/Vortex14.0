import eventsData from "../data/eventsData.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize AOS Scroll Animations
  AOS.init({
    duration: 800,
    easing: 'ease-out-cubic',
    once: true,
    offset: 50
  });

  // --- SPA Tab Navigation Logic ---
  const navTabs = document.querySelectorAll(".nav-tab, .nav-logo");
  const tabContents = document.querySelectorAll(".tab-content");

  navTabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = tab.getAttribute("data-target");
      if (!targetId) return;

      document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
      if (tab.classList.contains("nav-tab")) tab.classList.add("active");
      else document.querySelector(`.nav-tab[data-target="${targetId}"]`).classList.add("active");

      tabContents.forEach((content) => content.classList.remove("active"));
      document.getElementById(targetId).classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // --- THEME TOGGLE LOGIC ---
  const themeBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  const htmlElement = document.documentElement;
  
  let isLightMode = false;
  const savedTheme = localStorage.getItem('vortex_theme') || 'dark';
  htmlElement.setAttribute('data-theme', savedTheme);
  themeIcon.className = savedTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  if(savedTheme === 'light') isLightMode = true;

  themeBtn.addEventListener("click", () => {
    const currentTheme = htmlElement.getAttribute("data-theme");
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    htmlElement.setAttribute("data-theme", newTheme);
    themeIcon.className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    localStorage.setItem('vortex_theme', newTheme);
    
    isLightMode = newTheme === 'light'; // Updates the variable for the canvas
  });

  // --- Glowing Cursor Logic ---
  const cursor = document.getElementById('glow-cursor');
  document.addEventListener('mousemove', e => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
  });
  document.addEventListener('mousedown', () => cursor.classList.add('click-active'));
  document.addEventListener('mouseup', () => cursor.classList.remove('click-active'));

  // --- Cart Sidebar Toggle ---
  const cartToggleBtn = document.getElementById("cartToggleBtn");
  const closeCartBtn = document.getElementById("closeCartBtn");
  const cartSidebar = document.getElementById("cartSidebar");
  const cartIcon = document.querySelector(".fa-cart-shopping");

  cartToggleBtn.addEventListener("click", () => cartSidebar.classList.add("active"));
  closeCartBtn.addEventListener("click", () => cartSidebar.classList.remove("active"));

  // Rendering Categories with AOS fade-up added dynamically
  const renderCategory = (catId, containerId) => {
    const items = eventsData.filter((e) => e.cat === catId);
    const container = document.getElementById(containerId);
    let html = "";
    items.forEach((item, index) => {
      const delay = (index % 3) * 100; // Staggers the animation for rows
      html += `
        <div class="event-card" id="card-${item.id}" data-aos="fade-up" data-aos-delay="${delay}">
            <div class="event-info">
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
                <div class="event-price">₹500</div>
            </div>
            <div class="interactive-btn-wrapper">
                <span class="default-label">OPTIONS</span>
                <div class="revealed-actions">
                    <button class="action-btn btn-info">Info</button>
                    <button class="action-btn btn-cart" onclick="handleAddToCart('${item.id}', '${item.name}', '${item.cat}')" id="btn-${item.id}">Add to Cart</button>
                </div>
            </div>
        </div>
      `;
    });
    container.innerHTML = html;
  };

  renderCategory("general", "grid-general");
  renderCategory("prodigy", "grid-prodigy");
  renderCategory("pharma", "grid-pharma");

  // --- CART LOGIC WITH LOCAL STORAGE ---
  let cart = JSON.parse(localStorage.getItem('vortex_cart')) || [];
  let previousDiscountPercent = 0;
  const EVENT_PRICE = 500;

  const createFlyingParticle = (startRect, endRect, color, callback) => {
    const particle = document.createElement("div");
    particle.className = "flying-particle";
    particle.style.background = color;
    const startX = startRect.left + (startRect.width / 2) - 7;
    const startY = startRect.top + (startRect.height / 2) - 7;
    particle.style.left = `0px`;
    particle.style.top = `0px`;
    particle.style.transform = `translate(${startX}px, ${startY}px) scale(1)`;
    document.body.appendChild(particle);
    void particle.offsetWidth;
    const endX = endRect.left + (endRect.width / 2) - 7;
    const endY = endRect.top + (endRect.height / 2) - 7;
    particle.style.transform = `translate(${endX}px, ${endY}px) scale(0.3)`;
    particle.style.opacity = "0.3";
    setTimeout(() => { particle.remove(); if (callback) callback(); }, 600);
  };

  window.handleAddToCart = (id, name, cat) => {
    if (cart.find((item) => item.id === id)) return;
    const btnElement = document.getElementById(`btn-${id}`);
    const btnRect = btnElement.getBoundingClientRect();
    const cartIconRect = cartIcon.getBoundingClientRect();
    createFlyingParticle(btnRect, cartIconRect, "var(--primary-cyan)", () => addToCartLogic(id, name, cat));
    btnElement.textContent = "Adding...";
    btnElement.classList.add("added");
  };

  const addToCartLogic = (id, name, cat) => {
    cart.push({ id, name, category: cat, price: EVENT_PRICE });
    localStorage.setItem('vortex_cart', JSON.stringify(cart));
    const btn = document.getElementById(`btn-${id}`);
    if (btn) btn.textContent = "Added";
    updateCartUI();
  };

  window.handleRemoveFromCart = (id) => {
    const cardElement = document.getElementById(`card-${id}`);
    const cartIconRect = cartIcon.getBoundingClientRect();
    let targetRect = cardElement ? cardElement.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight, width: 0, height: 0 };
    createFlyingParticle(cartIconRect, targetRect, "#ff4757", () => {});
    cart = cart.filter((item) => item.id !== id);
    localStorage.setItem('vortex_cart', JSON.stringify(cart));
    const btn = document.getElementById(`btn-${id}`);
    if (btn) { btn.textContent = "Add to Cart"; btn.classList.remove("added"); }
    updateCartUI();
  };

  const updateCartUI = () => {
    document.getElementById("cartCount").textContent = cart.length;
    const listEl = document.getElementById("cartItemsList");
    if (cart.length === 0) {
      listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 2rem;">Cart is empty.</p>';
    } else {
      listEl.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="item-details"><h4>${item.name}</h4><p>${item.category} Series</p></div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-family: 'Orbitron'; font-size: 0.85rem;">₹${item.price}</span>
                    <button class="remove-item" onclick="handleRemoveFromCart('${item.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`).join("");
    }
    cart.forEach((item) => {
      const btn = document.getElementById(`btn-${item.id}`);
      if (btn) { btn.textContent = "Added"; btn.classList.add("added"); }
    });
    calculateCartTotals();
  };

  const calculateCartTotals = () => {
    const eligibleItems = cart.filter((item) => item.id !== "sridp");
    const ineligibleItems = cart.filter((item) => item.id === "sridp");
    const counts = { general: 0, prodigy: 0, pharma: 0 };
    eligibleItems.forEach((item) => counts[item.category]++);

    let completedSeries = 0;
    if (counts.general === 5) completedSeries++;
    if (counts.prodigy === 4) completedSeries++;
    if (counts.pharma === 5) completedSeries++;

    let newDiscountPercent = 0;
    let msg = "Add more events to unlock series discounts!";
    if (completedSeries === 3) { newDiscountPercent = 0.7; msg = "Incredible! 3 Series complete. 70% OFF applied!"; }
    else if (completedSeries === 2) { newDiscountPercent = 0.62; msg = "Awesome! 2 Series complete. 62% OFF applied!"; }
    else if (completedSeries === 1) { newDiscountPercent = 0.6; msg = "Great job! 1 Series complete. 60% OFF applied!"; }
    else if (eligibleItems.length >= 5) { newDiscountPercent = 0.5; msg = "5+ Events added! 50% OFF applied!"; }

    const eligibleTotal = eligibleItems.length * EVENT_PRICE;
    const ineligibleTotal = ineligibleItems.length * EVENT_PRICE;
    const subtotal = cart.length * EVENT_PRICE;
    const discountAmount = eligibleTotal * newDiscountPercent;
    const finalTotal = eligibleTotal - discountAmount + ineligibleTotal;

    document.getElementById("cartSubtotal").textContent = `₹${subtotal}`;
    document.getElementById("discountLabel").textContent = `Discount (${newDiscountPercent * 100}%)`;
    document.getElementById("cartDiscount").textContent = `-₹${discountAmount}`;
    document.getElementById("cartTotal").textContent = `₹${finalTotal}`;

    const discountMsgEl = document.getElementById("discountMsg");
    discountMsgEl.textContent = newDiscountPercent > 0 ? msg : eligibleItems.length > 0 ? `Add ${5 - eligibleItems.length} more eligible events for 50% off.` : msg;

    if (newDiscountPercent > previousDiscountPercent) {
      const discountContainer = document.getElementById("discountContainer");
      discountContainer.classList.remove("celebrate-animation");
      void discountContainer.offsetWidth;
      discountContainer.classList.add("celebrate-animation");
      discountMsgEl.style.color = "var(--success-green)";
      setTimeout(() => (discountMsgEl.style.color = "var(--primary-cyan)"), 1200);
    }
    previousDiscountPercent = newDiscountPercent;
  };
  updateCartUI();

  // --- SVG PIE Hover & Click Interactions ---
  const pieSlices = document.querySelectorAll(".pie-slice");
  const tip = document.getElementById("nodeTip");
  pieSlices.forEach((slice) => {
    slice.addEventListener("mouseenter", () => {
      tip.querySelector("strong").textContent = slice.getAttribute("data-title");
      tip.querySelector("span").textContent = slice.getAttribute("data-text");
      tip.classList.add("show");
    });
    slice.addEventListener("mousemove", (e) => { tip.style.left = e.clientX + "px"; tip.style.top = e.clientY - 46 + "px"; });
    slice.addEventListener("mouseleave", () => tip.classList.remove("show"));
    slice.addEventListener("click", () => {
      tip.classList.remove("show");
      const target = slice.getAttribute("data-target");
      const tab = document.querySelector(`.nav-tab[data-target="${target}"]`);
      if (tab) tab.click();
      else window.location.href = target;
    });
  });

  // --- Mobile Hamburger Menu ---
  const menuBtn = document.getElementById("menuToggleBtn");
  const navLinksEl = document.querySelector(".nav-links");
  const closeMenu = () => { menuBtn.classList.remove("open"); navLinksEl.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); };
  menuBtn.addEventListener("click", () => {
    const isOpen = navLinksEl.classList.toggle("open");
    menuBtn.classList.toggle("open", isOpen); menuBtn.setAttribute("aria-expanded", isOpen);
    if (isOpen) cartSidebar.classList.remove("active");
  });
  cartToggleBtn.addEventListener("click", closeMenu);
  navLinksEl.addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
  document.querySelector(".nav-logo").addEventListener("click", closeMenu);
  document.addEventListener("click", (e) => { if (!e.target.closest(".navbar")) closeMenu(); });
  window.addEventListener("resize", () => { if (window.innerWidth > 800) closeMenu(); });

  // --- Hide navbar on scroll down ---
  const navbarEl = document.querySelector(".navbar");
  let lastScrollY = window.scrollY;
  let scrollTicking = false;
  const handleNavbarScroll = () => {
    const currentY = Math.max(window.scrollY, 0); 
    const delta = currentY - lastScrollY;
    if (Math.abs(delta) > 8) {
      const menuOpen = navLinksEl.classList.contains("open");
      if (delta > 0 && currentY > navbarEl.offsetHeight && !menuOpen) {
        navbarEl.classList.add("nav-hidden"); document.body.classList.add("nav-is-hidden");
      } else if (delta < 0) {
        navbarEl.classList.remove("nav-hidden"); document.body.classList.remove("nav-is-hidden");
      }
      lastScrollY = currentY;
    }
    if (currentY <= 0) { navbarEl.classList.remove("nav-hidden"); document.body.classList.remove("nav-is-hidden"); }
    scrollTicking = false;
  };
  window.addEventListener("scroll", () => { if (!scrollTicking) { requestAnimationFrame(handleNavbarScroll); scrollTicking = true; } }, { passive: true });

  // ==========================================================================
  // CHEMISTRY CANVAS ANIMATION (Optimized for Mobile & Desktop)
  // ==========================================================================
  const canvas = document.getElementById('chem-canvas');
  const ctx = canvas.getContext('2d', { alpha: true }); 
  
  let width, height;
  const chemicalEquations = [
      "2H₂ + O₂ ➔ 2H₂O", "NaCl + AgNO₃ ➔ AgCl + NaNO₃", "CH₄ + 2O₂ ➔ CO₂ + 2H₂O",
      "C₆H₁₂O₆ ➔ 2C₂H₅OH + 2CO₂", "N₂ + 3H₂ ⇌ 2NH₃", "CaCO₃ ➔ CaO + CO₂",
      "H⁺ + OH⁻ ➔ H₂O", "6CO₂ + 6H₂O ➔ C₆H₁₂O₆ + 6O₂", "E = mc²", "ΔH = ΔU + PΔV", "PV = nRT"
  ];

  function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const isMobile = window.innerWidth < 800; // Performance tuning
  const MAX_FORMULAS = isMobile ? 5 : 15;
  const MAX_ELECTRONS = isMobile ? 12 : 30;
  const MAX_PHOTONS = isMobile ? 2 : 5; 

  const formulas = [];
  const electrons = [];
  const photons = [];

  class Formula {
      constructor() { this.reset(); this.y = Math.random() * height; }
      reset() {
          this.text = chemicalEquations[Math.floor(Math.random() * chemicalEquations.length)];
          this.x = Math.random() * width;
          this.y = height + 50;
          this.speed = (Math.random() * 0.6) + 0.3;
          this.alpha = 0;
          this.maxAlpha = (Math.random() * 0.4) + 0.15;
          this.fadeIn = true;
      }
      update() {
          this.y -= this.speed;
          if (this.fadeIn) {
              this.alpha += 0.008;
              if (this.alpha >= this.maxAlpha) this.fadeIn = false;
          } else if (this.y < height * 0.45) {
              this.alpha -= 0.0025; 
          }
          if (this.alpha <= 0 && !this.fadeIn) this.reset();
      }
      draw() {
          ctx.font = "16px 'Orbitron', monospace";
          const r = isLightMode ? 0 : 255; const g = isLightMode ? 142 : 255; const b = isLightMode ? 176 : 255;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
          ctx.fillText(this.text, this.x, this.y);
      }
  }

  class Electron {
      constructor() { this.reset(); }
      reset() {
          this.x = Math.random() * width;
          this.y = Math.random() * height;
          this.vx = (Math.random() - 0.5) * 1.5;
          this.vy = (Math.random() - 0.5) * 1.5;
          this.radius = Math.random() * 1.5 + 0.5;
          this.baseAlpha = Math.random() * 0.5 + 0.2;
          this.pulse = Math.random() * Math.PI;
      }
      update() {
          this.x += this.vx; this.y += this.vy; this.pulse += 0.05;
          if (this.x < 0) this.x = width; if (this.x > width) this.x = 0;
          if (this.y < 0) this.y = height; if (this.y > height) this.y = 0;
      }
      draw() {
          const alpha = this.baseAlpha + Math.sin(this.pulse) * 0.2;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.fillStyle = isLightMode ? `rgba(106, 27, 154, ${alpha})` : `rgba(0, 242, 254, ${alpha})`;
          ctx.fill();
      }
  }

  class Photon {
      constructor() { this.reset(); }
      reset() {
          this.active = false;
          this.timer = Math.random() * 100; 
          const axes = [ { vx: 1, vy: 0 }, { vx: -1, vy: 0 }, { vx: 1, vy: 1 }, { vx: -1, vy: -1 }, { vx: 1, vy: -1 }, { vx: -1, vy: 1 } ];
          const axis = axes[Math.floor(Math.random() * axes.length)];
          let speed = Math.random() * 12 + 10;
          this.vx = axis.vx * speed; this.vy = axis.vy * speed;
          this.length = Math.random() * 120 + 60;
          
          if (this.vx > 0) this.x = -this.length; else if (this.vx < 0) this.x = width + this.length; else this.x = Math.random() * width;
          if (this.vy > 0) this.y = -this.length; else if (this.vy < 0) this.y = height + this.length; else this.y = Math.random() * height;
      }
      update() {
          if (!this.active) { this.timer--; if (this.timer <= 0) this.active = true; return; }
          this.x += this.vx; this.y += this.vy;
          if ((this.vx > 0 && this.x > width + this.length) || (this.vx < 0 && this.x < -this.length) || (this.vy > 0 && this.y > height + this.length) || (this.vy < 0 && this.y < -this.length)) {
              this.reset();
          }
      }
      draw() {
          if (!this.active) return;
          ctx.beginPath(); ctx.moveTo(this.x, this.y);
          const mag = Math.hypot(this.vx, this.vy);
          const tailX = this.x - (this.vx / mag) * this.length;
          const tailY = this.y - (this.vy / mag) * this.length;
          ctx.lineTo(tailX, tailY);
          ctx.strokeStyle = isLightMode ? 'rgba(138, 43, 226, 0.4)' : 'rgba(0, 242, 254, 0.4)';
          ctx.lineWidth = 1.5; ctx.stroke();
      }
  }

  for(let i = 0; i < MAX_FORMULAS; i++) formulas.push(new Formula());
  for(let i = 0; i < MAX_ELECTRONS; i++) electrons.push(new Electron());
  for(let i = 0; i < MAX_PHOTONS; i++) photons.push(new Photon());

  function animate() {
      ctx.clearRect(0, 0, width, height);
      formulas.forEach(f => { f.update(); f.draw(); });
      electrons.forEach(e => { e.update(); e.draw(); });
      photons.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animate);
  }
  animate();
});