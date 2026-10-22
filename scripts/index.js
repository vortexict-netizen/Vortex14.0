import eventsData from "../data/eventsData.js";

// =========================================
// 1. SPA TAB NAVIGATION
// =========================================

const navTabs = document.querySelectorAll(".nav-tab, .nav-logo");
const tabContents = document.querySelectorAll(".tab-content");

navTabs.forEach((tab) => {
  tab.addEventListener("click", (event) => {
    if (!tab.getAttribute("href") || tab.getAttribute("href") === "#") {
      event.preventDefault();
    }

    const targetId = tab.getAttribute("data-target");
    const targetContent = document.getElementById(targetId);

    if (!targetId || !targetContent) return;

    document
      .querySelectorAll(".nav-tab")
      .forEach((item) => item.classList.remove("active"));

    const activeTab = document.querySelector(
      `.nav-tab[data-target="${targetId}"]`,
    );

    if (activeTab) activeTab.classList.add("active");

    tabContents.forEach((content) => {
      content.classList.remove("active");
    });

    targetContent.classList.add("active");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
});

// =========================================
// 2. THEME TOGGLE
// =========================================

const themeBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const htmlElement = document.documentElement;

let savedTheme = "dark";
try {
  savedTheme = localStorage.getItem("vortex_theme") || "dark";
} catch (e) {}

htmlElement.setAttribute("data-theme", savedTheme);

if (themeIcon) {
  themeIcon.className =
    savedTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

themeBtn?.addEventListener("click", () => {
  const currentTheme = htmlElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  htmlElement.setAttribute("data-theme", newTheme);

  if (themeIcon) {
    themeIcon.className =
      newTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }

  try {
    localStorage.setItem("vortex_theme", newTheme);
  } catch(e) {}
});

// =========================================
// 3. CART SIDEBAR
// =========================================

const cartToggleBtn = document.getElementById("cartToggleBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartSidebar = document.getElementById("cartSidebar");

cartToggleBtn?.addEventListener("click", () => {
  cartSidebar?.classList.add("active");
});

closeCartBtn?.addEventListener("click", () => {
  cartSidebar?.classList.remove("active");
});

// =========================================
// 4. EVENT RENDERING (Dynamic Prices)
// =========================================

const renderCategory = (categoryId, containerId) => {
  const items = eventsData.filter((event) => event.cat === categoryId || event.category === categoryId);
  const container = document.getElementById(containerId);

  if (!container) return;

  container.replaceChildren();

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "event-card";
    card.id = `card-${item.id}`;

    const info = document.createElement("div");
    info.className = "event-info";

    const title = document.createElement("h3");
    title.textContent = item.name;

    const description = document.createElement("p");
    description.textContent = item.desc;

    const price = document.createElement("div");
    price.className = "event-price";
    // Displays the individual price from eventsData.js
    price.textContent = `₹${item.price || 0}`;

    info.append(title, description, price);

    const infoButton = document.createElement("a");
    infoButton.className = "action-btn btn-info info-link";
    infoButton.textContent = "Info";
    infoButton.href = `./data/details/${item.id}.html`;
    infoButton.setAttribute("aria-label", `More information about ${item.name}`);
    infoButton.style.position = "relative";
    infoButton.style.zIndex = "10";

    card.append(info, infoButton);
    container.appendChild(card);
  });
};

try {
  renderCategory("general", "grid-general");
  renderCategory("prodigy", "grid-prodigy");
  renderCategory("pharma", "grid-pharma");
} catch(e) {
  console.error("Error rendering categories:", e);
}

// =========================================
// 5. CART STATE
// =========================================

let cart = [];

try {
  const storedCart = JSON.parse(localStorage.getItem("vortex_cart") || "[]");

  if (Array.isArray(storedCart)) {
    cart = storedCart.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        ["general", "prodigy", "pharma"].includes(item.category),
    );
  }
} catch {
  cart = [];
}

// Sync cart prices with eventsData just in case prices were changed in the code
cart = cart.map((item) => {
  const eventRecord = eventsData.find((e) => e.id === item.id);
  return {
    ...item,
    price: eventRecord ? eventRecord.price : (item.price || 0),
  };
});

let previousDiscountPercent = 0;

const saveCart = () => {
  try {
    localStorage.setItem("vortex_cart", JSON.stringify(cart));
  } catch(e) {}
};

const formatINR = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

// =========================================
// 6. DISCOUNT CALCULATION (Dynamic Prices)
// =========================================

const getCartBilling = () => {
  const eligibleItems = cart.filter((item) => item.id !== "sridp");
  const ineligibleItems = cart.filter((item) => item.id === "sridp");

  const counts = {
    general: 0,
    prodigy: 0,
    pharma: 0,
  };

  eligibleItems.forEach((item) => {
    if (Object.hasOwn(counts, item.category)) {
      counts[item.category]++;
    }
  });

  let completedSeries = 0;

  if (counts.general === 5) completedSeries++;
  if (counts.prodigy === 4) completedSeries++;
  if (counts.pharma === 5) completedSeries++;

  let discountPercent = 0;
  let message = "Add more events to unlock series discounts!";

  if (completedSeries === 3) {
    discountPercent = 0.7;
    message = "All 3 series complete — 70% discount applied!";
  } else if (completedSeries === 2) {
    discountPercent = 0.62;
    message = "2 series complete — 62% discount applied!";
  } else if (completedSeries === 1) {
    discountPercent = 0.6;
    message = "1 full series complete — 60% discount applied!";
  } else if (eligibleItems.length >= 5) {
    discountPercent = 0.5;
    message = "5+ eligible events — 50% discount applied!";
  } else if (eligibleItems.length > 0) {
    const remaining = Math.max(0, 5 - eligibleItems.length);
    message = `Add ${remaining} more eligible event(s) for 50% off.`;
  }

  // Calculate totals based on actual item prices instead of a fixed flat rate
  const subtotal = cart.reduce((sum, item) => sum + (item.price || 0), 0);
  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const excludedSubtotal = ineligibleItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const discount = eligibleSubtotal * discountPercent;
  const total = eligibleSubtotal - discount + excludedSubtotal;

  return {
    subtotal,
    discount,
    total,
    discountPercent,
    message,
  };
};

// =========================================
// 7. CART SUMMARY & CHECKOUT BILLING
// =========================================

const renderCheckoutBilling = () => {
  const list = document.getElementById("checkoutEventList");
  if (!list) return;

  const eventCount = document.getElementById("checkoutEventCount");
  if (eventCount) {
      eventCount.textContent = `${cart.length} event${cart.length === 1 ? "" : "s"}`;
  }
  
  list.replaceChildren();

  if (cart.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "checkout-empty";
    emptyMessage.textContent = "Your cart is empty. Add events before checkout.";
    list.appendChild(emptyMessage);
  } else {
    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "checkout-event-row";

      const details = document.createElement("div");
      details.className = "checkout-event-details";

      const name = document.createElement("strong");
      name.textContent = item.name;

      const category = document.createElement("span");
      category.textContent = `${item.category} Series`;

      const price = document.createElement("strong");
      price.textContent = formatINR(item.price);

      details.append(name, category);
      row.append(details, price);
      list.appendChild(row);
    });
  }

  const billing = getCartBilling();

  const checkoutSubtotal = document.getElementById("checkoutSubtotal");
  const checkoutDiscountLabel = document.getElementById("checkoutDiscountLabel");
  const checkoutDiscount = document.getElementById("checkoutDiscount");
  const checkoutTotal = document.getElementById("checkoutTotal");
  const checkoutDiscountMsg = document.getElementById("checkoutDiscountMsg");

  if (checkoutSubtotal) checkoutSubtotal.textContent = formatINR(billing.subtotal);
  if (checkoutDiscountLabel) checkoutDiscountLabel.textContent = `Discount (${billing.discountPercent * 100}%)`;
  if (checkoutDiscount) checkoutDiscount.textContent = `-${formatINR(billing.discount)}`;
  if (checkoutTotal) checkoutTotal.textContent = formatINR(billing.total);
  if (checkoutDiscountMsg) checkoutDiscountMsg.textContent = billing.message;

  const checkoutBtn = document.querySelector(".checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
  }
};

const calculateCartTotals = () => {
  const billing = getCartBilling();
  const cartSubtotal = document.getElementById("cartSubtotal");
  const discountLabel = document.getElementById("discountLabel");
  const cartDiscount = document.getElementById("cartDiscount");
  const cartTotal = document.getElementById("cartTotal");
  const message = document.getElementById("discountMsg");

  if (cartSubtotal) cartSubtotal.textContent = formatINR(billing.subtotal);
  if (discountLabel) discountLabel.textContent = `Discount (${billing.discountPercent * 100}%)`;
  if (cartDiscount) cartDiscount.textContent = `-${formatINR(billing.discount)}`;
  if (cartTotal) cartTotal.textContent = formatINR(billing.total);
  if (message) message.textContent = billing.message;

  if (billing.discountPercent > previousDiscountPercent) {
    const discountContainer = document.getElementById("discountContainer");
    discountContainer?.classList.remove("celebrate-animation");

    if (discountContainer) {
      void discountContainer.offsetWidth;
      discountContainer.classList.add("celebrate-animation");
    }

    if (message) {
      message.style.color = "var(--success-green)";
      setTimeout(() => {
        message.style.color = "var(--primary-cyan)";
      }, 1200);
    }
  }

  previousDiscountPercent = billing.discountPercent;
};

// =========================================
// 8. UPDATE CART UI
// =========================================

const updateCartUI = () => {
  const cartCountEl = document.getElementById("cartCount");
  if (cartCountEl) cartCountEl.textContent = cart.length;

  const list = document.getElementById("cartItemsList");
  if (list) {
      list.replaceChildren();

      if (cart.length === 0) {
      const empty = document.createElement("p");
      empty.style.color = "var(--text-muted)";
      empty.style.textAlign = "center";
      empty.style.marginTop = "2rem";
      empty.textContent = "Cart is empty.";
      list.appendChild(empty);
      } else {
      cart.forEach((item) => {
          const row = document.createElement("div");
          row.className = "cart-item";

          const details = document.createElement("div");
          details.className = "item-details";

          const name = document.createElement("h4");
          name.textContent = item.name;

          const category = document.createElement("p");
          category.textContent = `${item.category} Series`;

          details.append(name, category);

          const right = document.createElement("div");
          right.style.display = "flex";
          right.style.alignItems = "center";
          right.style.gap = "1rem";

          const price = document.createElement("span");
          price.style.fontFamily = "'Orbitron'";
          price.style.fontSize = "0.85rem";
          price.textContent = formatINR(item.price);

          const removeButton = document.createElement("button");
          removeButton.className = "remove-item";
          removeButton.setAttribute(
          "aria-label",
          `Remove ${item.name} from cart`,
          );

          const icon = document.createElement("i");
          icon.className = "fa-solid fa-trash";
          removeButton.appendChild(icon);

          removeButton.addEventListener("click", () => {
          window.handleRemoveFromCart(item.id);
          });

          right.append(price, removeButton);
          row.append(details, right);
          list.appendChild(row);
      });
      }
  }

  calculateCartTotals();
  renderCheckoutBilling();
};

window.handleAddToCart = (id, name, category) => {
  if (cart.some((item) => item.id === id)) return;
  // Automatically pull the correct price from eventsData.js so you don't have to edit every HTML details page
  const eventRecord = eventsData.find((e) => e.id === id);
  const itemPrice = eventRecord ? eventRecord.price : 0;
  
  cart.push({ id, name, category, price: itemPrice });
  saveCart();
  updateCartUI();
};

window.handleRemoveFromCart = (id) => {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  updateCartUI();
};

// =========================================
// 9. SVG PIE INTERACTIONS
// =========================================

const pieSlices = document.querySelectorAll(".pie-slice");
const tip = document.getElementById("nodeTip");

pieSlices.forEach((slice) => {
  slice.addEventListener("mouseenter", () => {
    tip.querySelector("strong").textContent =
      slice.getAttribute("data-title");
    tip.querySelector("span").textContent = slice.getAttribute("data-text");
    tip.classList.add("show");
  });

  slice.addEventListener("mousemove", (event) => {
    tip.style.left = `${event.clientX}px`;
    tip.style.top = `${event.clientY - 46}px`;
  });

  slice.addEventListener("mouseleave", () => {
    tip.classList.remove("show");
  });

  slice.addEventListener("click", () => {
    tip.classList.remove("show");
    const target = slice.getAttribute("data-target");
    document.querySelector(`.nav-tab[data-target="${target}"]`)?.click();
  });
});

// =========================================
// 10. MOBILE MENU & NAVBAR SCROLL
// =========================================

const menuBtn = document.getElementById("menuToggleBtn");
const navLinksEl = document.querySelector(".nav-links");

const closeMenu = () => {
  menuBtn?.classList.remove("open");
  navLinksEl?.classList.remove("open");
  menuBtn?.setAttribute("aria-expanded", "false");
};

menuBtn?.addEventListener("click", () => {
  const isOpen = navLinksEl.classList.toggle("open");
  menuBtn.classList.toggle("open", isOpen);
  menuBtn.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) cartSidebar?.classList.remove("active");
});

cartToggleBtn?.addEventListener("click", closeMenu);

navLinksEl?.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

document.querySelector(".nav-logo")?.addEventListener("click", closeMenu);

document.addEventListener("click", (event) => {
  if (!event.target.closest(".navbar")) closeMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 800) closeMenu();
});

const navbarEl = document.querySelector(".navbar");
let lastScrollY = window.scrollY;
let scrollTicking = false;

const handleNavbarScroll = () => {
  const currentY = Math.max(window.scrollY, 0);
  const delta = currentY - lastScrollY;

  if (Math.abs(delta) > 8) {
    const menuOpen = navLinksEl?.classList.contains("open");

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

updateCartUI();