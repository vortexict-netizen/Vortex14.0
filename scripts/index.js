import eventsData from "../data/eventsData.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- SPA Tab Navigation Logic ---
  const navTabs = document.querySelectorAll(".nav-tab, .nav-logo");
  const tabContents = document.querySelectorAll(".tab-content");

  navTabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = tab.getAttribute("data-target");
      if (!targetId) return;

      // Update Links
      document
        .querySelectorAll(".nav-tab")
        .forEach((t) => t.classList.remove("active"));
      if (tab.classList.contains("nav-tab")) tab.classList.add("active");
      else
        document
          .querySelector(`.nav-tab[data-target="${targetId}"]`)
          .classList.add("active");

      // Switch Content Without Scrolling Down
      tabContents.forEach((content) => {
        content.classList.remove("active");
      });
      document.getElementById(targetId).classList.add("active");

      // Scroll to top of the page smoothly
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // --- 1. THEME TOGGLE WITH LOCAL STORAGE ---
  const themeBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  const htmlElement = document.documentElement;

  // Load saved theme on startup
  const savedTheme = localStorage.getItem('vortex_theme') || 'dark';
  htmlElement.setAttribute('data-theme', savedTheme);
  themeIcon.className = savedTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';

  themeBtn.addEventListener("click", () => {
    const currentTheme = htmlElement.getAttribute("data-theme");
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    htmlElement.setAttribute("data-theme", newTheme);
    themeIcon.className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    
    // Save to Local Storage
    localStorage.setItem('vortex_theme', newTheme);
  });

  // --- Cart Sidebar Toggle ---
  const cartToggleBtn = document.getElementById("cartToggleBtn");
  const closeCartBtn = document.getElementById("closeCartBtn");
  const cartSidebar = document.getElementById("cartSidebar");
  const cartIcon = document.querySelector(".fa-cart-shopping");

  cartToggleBtn.addEventListener("click", () =>
    cartSidebar.classList.add("active"),
  );
  closeCartBtn.addEventListener("click", () =>
    cartSidebar.classList.remove("active"),
  );

  // for rendering specific category from the eventsData
  const renderCategory = (catId, containerId) => {
    const items = eventsData.filter((e) => e.cat === catId);
    const container = document.getElementById(containerId);
    let html = "";
    items.forEach((item) => {
      html += `
        <div class="event-card" id="card-${item.id}">
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

  // displaying the three categories
  renderCategory("general", "grid-general");
  renderCategory("prodigy", "grid-prodigy");
  renderCategory("pharma", "grid-pharma");

  // --- 2. CART LOGIC WITH LOCAL STORAGE ---
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

    setTimeout(() => {
      particle.remove();
      if (callback) callback();
    }, 600);
  };

  window.handleAddToCart = (id, name, cat) => {
    if (cart.find((item) => item.id === id)) return;

    const btnElement = document.getElementById(`btn-${id}`);
    const btnRect = btnElement.getBoundingClientRect();
    const cartIconRect = cartIcon.getBoundingClientRect();

    createFlyingParticle(btnRect, cartIconRect, "var(--primary-cyan)", () => {
      addToCartLogic(id, name, cat);
    });

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

    let targetRect = cardElement
      ? cardElement.getBoundingClientRect()
      : {
          left: window.innerWidth / 2,
          top: window.innerHeight,
          width: 0,
          height: 0,
        };

    createFlyingParticle(cartIconRect, targetRect, "#ff4757", () => {});

    cart = cart.filter((item) => item.id !== id);
    localStorage.setItem('vortex_cart', JSON.stringify(cart));

    const btn = document.getElementById(`btn-${id}`);
    if (btn) {
      btn.textContent = "Add to Cart";
      btn.classList.remove("added");
    }
    updateCartUI();
  };

  const updateCartUI = () => {
    document.getElementById("cartCount").textContent = cart.length;

    const listEl = document.getElementById("cartItemsList");
    if (cart.length === 0) {
      listEl.innerHTML =
        '<p style="color: var(--text-muted); text-align: center; margin-top: 2rem;">Cart is empty.</p>';
    } else {
      listEl.innerHTML = cart
        .map(
          (item) => `
            <div class="cart-item">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>${item.category} Series</p>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-family: 'Orbitron'; font-size: 0.85rem;">₹${item.price}</span>
                    <button class="remove-item" onclick="handleRemoveFromCart('${item.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `,
        )
        .join("");
    }

    // Ensure buttons remain in "Added" state upon refresh
    cart.forEach((item) => {
      const btn = document.getElementById(`btn-${item.id}`);
      if (btn) {
        btn.textContent = "Added";
        btn.classList.add("added");
      }
    });

    calculateCartTotals();
  };

  const calculateCartTotals = () => {
    const eligibleItems = cart.filter((item) => item.id !== "sridp");
    const ineligibleItems = cart.filter((item) => item.id === "sridp");

    const counts = { general: 0, prodigy: 0, pharma: 0 };
    eligibleItems.forEach((item) => {
      counts[item.category]++;
    });

    let completedSeries = 0;
    if (counts.general === 5) completedSeries++;
    if (counts.prodigy === 4) completedSeries++;
    if (counts.pharma === 5) completedSeries++;

    let newDiscountPercent = 0;
    let msg = "Add more events to unlock series discounts!";

    if (completedSeries === 3) {
      newDiscountPercent = 0.7;
      msg = "Incredible! 3 Series complete. 70% OFF applied!";
    } else if (completedSeries === 2) {
      newDiscountPercent = 0.62;
      msg = "Awesome! 2 Series complete. 62% OFF applied!";
    } else if (completedSeries === 1) {
      newDiscountPercent = 0.6;
      msg = "Great job! 1 Series complete. 60% OFF applied!";
    } else if (eligibleItems.length >= 5) {
      newDiscountPercent = 0.5;
      msg = "5+ Events added! 50% OFF applied!";
    }

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
    discountMsgEl.textContent =
      newDiscountPercent > 0
        ? msg
        : eligibleItems.length > 0
          ? `Add ${5 - eligibleItems.length} more eligible events for 50% off.`
          : msg;

    if (newDiscountPercent > previousDiscountPercent) {
      const discountContainer = document.getElementById("discountContainer");
      discountContainer.classList.remove("celebrate-animation");
      void discountContainer.offsetWidth;
      discountContainer.classList.add("celebrate-animation");
      discountMsgEl.style.color = "var(--success-green)";
      setTimeout(
        () => (discountMsgEl.style.color = "var(--primary-cyan)"),
        1200,
      );
    }

    previousDiscountPercent = newDiscountPercent;
  };

  // Run immediately to display saved items
  updateCartUI();

  // --- SVG PIE Hover & Click Interactions ---
  const pieSlices = document.querySelectorAll(".pie-slice");
  const tip = document.getElementById("nodeTip");

  pieSlices.forEach((slice) => {
    slice.addEventListener("mouseenter", (e) => {
      tip.querySelector("strong").textContent =
        slice.getAttribute("data-title");
      tip.querySelector("span").textContent = slice.getAttribute("data-text");
      tip.classList.add("show");
    });

    slice.addEventListener("mousemove", (e) => {
      tip.style.left = e.clientX + "px";
      tip.style.top = e.clientY - 46 + "px";
    });

    slice.addEventListener("mouseleave", () => {
      tip.classList.remove("show");
    });

    slice.addEventListener("click", () => {
      tip.classList.remove("show");
      const target = slice.getAttribute("data-target");

      const tab = document.querySelector(`.nav-tab[data-target="${target}"]`);
      if (tab) {
        tab.click();
      } else {
        window.location.href = target;
      }
    });
  });

  // --- Mobile Hamburger Menu ---
  const menuBtn = document.getElementById("menuToggleBtn");
  const navLinksEl = document.querySelector(".nav-links");

  const closeMenu = () => {
    menuBtn.classList.remove("open");
    navLinksEl.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  };

  menuBtn.addEventListener("click", () => {
    const isOpen = navLinksEl.classList.toggle("open");
    menuBtn.classList.toggle("open", isOpen);
    menuBtn.setAttribute("aria-expanded", isOpen);
    if (isOpen) cartSidebar.classList.remove("active");
  });

  cartToggleBtn.addEventListener("click", closeMenu);

  navLinksEl.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });
  
  document.querySelector(".nav-logo").addEventListener("click", closeMenu);

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".navbar")) closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 800) closeMenu();
  });

  // --- Hide navbar on scroll down, show on scroll up ---
  const navbarEl = document.querySelector(".navbar");
  let lastScrollY = window.scrollY;
  let scrollTicking = false;

  const handleNavbarScroll = () => {
    const currentY = Math.max(window.scrollY, 0); 
    const delta = currentY - lastScrollY;

    if (Math.abs(delta) > 8) {
      const menuOpen = navLinksEl.classList.contains("open");

      if (delta > 0 && currentY > navbarEl.offsetHeight && !menuOpen) {
        navbarEl.classList.add("nav-hidden");
        document.body.classList.add("nav-is-hidden");
      } else if (delta < 0) {
        navbarEl.classList.remove("nav-hidden");
        document.body.classList.remove("nav-is-hidden");
      }
      lastScrollY = currentY;
    }

    if (currentY <= 0) {
      navbarEl.classList.remove("nav-hidden");
      document.body.classList.remove("nav-is-hidden");
    }
    scrollTicking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        requestAnimationFrame(handleNavbarScroll);
        scrollTicking = true;
      }
    },
    { passive: true },
  );
});