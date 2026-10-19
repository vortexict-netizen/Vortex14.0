import eventsData from "../data/eventsData.js";

document.addEventListener("DOMContentLoaded", () => {
  // =========================================
  // 1. SPA TAB NAVIGATION
  // =========================================

  const navTabs = document.querySelectorAll(".nav-tab, .nav-logo");
  const tabContents = document.querySelectorAll(".tab-content");

  navTabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();

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

  const savedTheme = localStorage.getItem("vortex_theme") || "dark";

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

    localStorage.setItem("vortex_theme", newTheme);
  });

  // =========================================
  // 3. CART SIDEBAR
  // =========================================

  const cartToggleBtn = document.getElementById("cartToggleBtn");
  const closeCartBtn = document.getElementById("closeCartBtn");
  const cartSidebar = document.getElementById("cartSidebar");
  const cartIcon = document.querySelector(".fa-cart-shopping");

  cartToggleBtn?.addEventListener("click", () => {
    cartSidebar?.classList.add("active");
  });

  closeCartBtn?.addEventListener("click", () => {
    cartSidebar?.classList.remove("active");
  });

  // =========================================
  // 4. EVENT RENDERING
  // =========================================

  const EVENT_PRICE = 500;

  const renderCategory = (categoryId, containerId) => {
    const items = eventsData.filter((event) => event.cat === categoryId);
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
      price.textContent = `₹${EVENT_PRICE}`;

      info.append(title, description, price);

      const wrapper = document.createElement("div");
      wrapper.className = "interactive-btn-wrapper";

      const label = document.createElement("span");
      label.className = "default-label";
      label.textContent = "OPTIONS";

      const actions = document.createElement("div");
      actions.className = "revealed-actions";

      const infoButton = document.createElement("button");
      infoButton.className = "action-btn btn-info";
      infoButton.textContent = "Info";

      const cartButton = document.createElement("button");
      cartButton.className = "action-btn btn-cart";
      cartButton.id = `btn-${item.id}`;
      cartButton.textContent = "Add to Cart";

      cartButton.addEventListener("click", () => {
        window.handleAddToCart(item.id, item.name, item.cat);
      });

      actions.append(infoButton, cartButton);
      wrapper.append(label, actions);
      card.append(info, wrapper);
      container.appendChild(card);
    });
  };

  renderCategory("general", "grid-general");
  renderCategory("prodigy", "grid-prodigy");
  renderCategory("pharma", "grid-pharma");

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

  // Normalize saved prices. The backend must independently verify prices.
  cart = cart.map((item) => ({
    ...item,
    price: EVENT_PRICE,
  }));

  let previousDiscountPercent = 0;

  const saveCart = () => {
    localStorage.setItem("vortex_cart", JSON.stringify(cart));
  };

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  // =========================================
  // 6. FLYING CART ANIMATION
  // =========================================

  const createFlyingParticle = (startRect, endRect, color, callback) => {
    const particle = document.createElement("div");

    particle.className = "flying-particle";
    particle.style.background = color;

    const startX = startRect.left + startRect.width / 2 - 7;
    const startY = startRect.top + startRect.height / 2 - 7;

    particle.style.left = "0px";
    particle.style.top = "0px";
    particle.style.transform = `translate(${startX}px, ${startY}px) scale(1)`;

    document.body.appendChild(particle);
    void particle.offsetWidth;

    const endX = endRect.left + endRect.width / 2 - 7;
    const endY = endRect.top + endRect.height / 2 - 7;

    particle.style.transform = `translate(${endX}px, ${endY}px) scale(0.3)`;

    particle.style.opacity = "0.3";

    setTimeout(() => {
      particle.remove();
      callback?.();
    }, 600);
  };

  // =========================================
  // 7. DISCOUNT CALCULATION
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

    const subtotal = cart.reduce((sum, item) => sum + EVENT_PRICE, 0);

    const eligibleSubtotal = eligibleItems.length * EVENT_PRICE;
    const excludedSubtotal = ineligibleItems.length * EVENT_PRICE;

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
  // 8. CART SUMMARY
  // =========================================

  const calculateCartTotals = () => {
    const billing = getCartBilling();

    document.getElementById("cartSubtotal").textContent = formatINR(
      billing.subtotal,
    );

    document.getElementById("discountLabel").textContent =
      `Discount (${billing.discountPercent * 100}%)`;

    document.getElementById("cartDiscount").textContent =
      `-${formatINR(billing.discount)}`;

    document.getElementById("cartTotal").textContent = formatINR(billing.total);

    const message = document.getElementById("discountMsg");

    message.textContent = billing.message;

    if (billing.discountPercent > previousDiscountPercent) {
      const discountContainer = document.getElementById("discountContainer");

      discountContainer?.classList.remove("celebrate-animation");

      if (discountContainer) {
        void discountContainer.offsetWidth;
        discountContainer.classList.add("celebrate-animation");
      }

      message.style.color = "var(--success-green)";

      setTimeout(() => {
        message.style.color = "var(--primary-cyan)";
      }, 1200);
    }

    previousDiscountPercent = billing.discountPercent;
  };

  // =========================================
  // 9. CHECKOUT BILLING
  // =========================================

  const checkoutBtn = document.querySelector(".checkout-btn");
  const checkoutForm = document.getElementById("checkoutForm");
  const checkoutStatus = document.getElementById("checkoutStatus");
  const checkoutBackBtn = document.getElementById("checkoutBackBtn");

  const renderCheckoutBilling = () => {
    const list = document.getElementById("checkoutEventList");
    if (!list) return;

    const eventCount = document.getElementById("checkoutEventCount");

    eventCount.textContent = `${cart.length} event${cart.length === 1 ? "" : "s"}`;

    list.replaceChildren();

    if (cart.length === 0) {
      const emptyMessage = document.createElement("p");

      emptyMessage.className = "checkout-empty";
      emptyMessage.textContent =
        "Your cart is empty. Add events before checkout.";

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
        price.textContent = formatINR(EVENT_PRICE);

        details.append(name, category);
        row.append(details, price);
        list.appendChild(row);
      });
    }

    const billing = getCartBilling();

    document.getElementById("checkoutSubtotal").textContent = formatINR(
      billing.subtotal,
    );

    document.getElementById("checkoutDiscountLabel").textContent =
      `Discount (${billing.discountPercent * 100}%)`;

    document.getElementById("checkoutDiscount").textContent =
      `-${formatINR(billing.discount)}`;

    document.getElementById("checkoutTotal").textContent = formatINR(
      billing.total,
    );

    document.getElementById("checkoutDiscountMsg").textContent =
      billing.message;

    if (checkoutBtn) {
      checkoutBtn.disabled = cart.length === 0;
    }
  };

  // =========================================
  // 10. UPDATE CART UI
  // =========================================

  const updateCartUI = () => {
    document.getElementById("cartCount").textContent = cart.length;

    const list = document.getElementById("cartItemsList");

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
        price.textContent = formatINR(EVENT_PRICE);

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

    cart.forEach((item) => {
      const button = document.getElementById(`btn-${item.id}`);

      if (button) {
        button.textContent = "Added";
        button.classList.add("added");
      }
    });

    calculateCartTotals();
    renderCheckoutBilling();
  };

  // =========================================
  // 11. ADD TO CART
  // =========================================

  window.handleAddToCart = (id, name, category) => {
    if (cart.some((item) => item.id === id)) return;

    const button = document.getElementById(`btn-${id}`);

    if (!button) return;

    const startRect = button.getBoundingClientRect();
    const endRect = cartIcon?.getBoundingClientRect();

    const addItem = () => {
      cart.push({
        id,
        name,
        category,
        price: EVENT_PRICE,
      });

      saveCart();
      updateCartUI();

      const updatedButton = document.getElementById(`btn-${id}`);

      if (updatedButton) {
        updatedButton.textContent = "Added";
        updatedButton.classList.add("added");
      }
    };

    button.textContent = "Adding...";
    button.classList.add("added");

    if (endRect) {
      createFlyingParticle(startRect, endRect, "var(--primary-cyan)", addItem);
    } else {
      addItem();
    }
  };

  // =========================================
  // 12. REMOVE FROM CART
  // =========================================

  window.handleRemoveFromCart = (id) => {
    const card = document.getElementById(`card-${id}`);

    if (card && cartIcon) {
      createFlyingParticle(
        cartIcon.getBoundingClientRect(),
        card.getBoundingClientRect(),
        "#ff4757",
      );
    }

    cart = cart.filter((item) => item.id !== id);

    saveCart();

    const button = document.getElementById(`btn-${id}`);

    if (button) {
      button.textContent = "Add to Cart";
      button.classList.remove("added");
    }

    updateCartUI();
  };

  // =========================================
  // 13. OPEN CHECKOUT
  // =========================================

  checkoutBtn?.addEventListener("click", () => {
    if (cart.length === 0) {
      cartSidebar?.classList.add("active");

      document.getElementById("discountMsg").textContent =
        "Please add at least one event before checkout.";

      return;
    }

    cartSidebar?.classList.remove("active");
    renderCheckoutBilling();

    document.querySelector('.nav-tab[data-target="checkout"]')?.click();
  });

  checkoutBackBtn?.addEventListener("click", () => {
    document.querySelector('.nav-tab[data-target="events"]')?.click();
  });

  // =========================================
  // 14. CHECKOUT VALIDATION
  // =========================================

  // Configure this regex if your institution uses a specific
  // roll-number or enrollment-number format.
  window.isValidVortexRollNumber = (rollNumber) => {
    return /^[A-Za-z0-9][A-Za-z0-9 /-]{2,39}$/.test(
      String(rollNumber || "").trim(),
    );
  };

  const setFieldError = (fieldId, message) => {
    const field = document.getElementById(fieldId);

    const error = document.querySelector(`[data-error-for="${fieldId}"]`);

    if (error) error.textContent = message;

    if (field) {
      field.setAttribute("aria-invalid", message ? "true" : "false");
    }
  };

  const clearCheckoutErrors = () => {
    ["checkoutName", "checkoutEmail", "checkoutRoll", "checkoutYear"].forEach(
      (id) => setFieldError(id, ""),
    );

    checkoutStatus.textContent = "";
    checkoutStatus.className = "checkout-status";
  };

  const validateCheckout = () => {
    clearCheckoutErrors();

    let valid = true;

    const name = document.getElementById("checkoutName").value.trim();
    const email = document.getElementById("checkoutEmail").value.trim();
    const roll = document.getElementById("checkoutRoll").value.trim();
    const year = document.getElementById("checkoutYear").value;

    const namePattern = /^[\p{L}][\p{L}\p{M} .'-]*$/u;

    if (name.length < 2 || name.length > 100 || !namePattern.test(name)) {
      setFieldError("checkoutName", "Enter a valid full name.");

      valid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (email.length > 254 || !emailPattern.test(email)) {
      setFieldError(
        "checkoutEmail",
        "Enter a valid email address, such as name@example.com.",
      );

      valid = false;
    }

    if (!window.isValidVortexRollNumber(roll)) {
      setFieldError("checkoutRoll", "Enter a valid roll/enrollment number.");

      valid = false;
    }

    const allowedYears = ["FY", "SY", "TY", "Final Year", "Master's", "PhD"];

    if (!allowedYears.includes(year)) {
      setFieldError("checkoutYear", "Select your academic year or programme.");

      valid = false;
    }

    if (cart.length === 0) {
      checkoutStatus.textContent =
        "Your cart is empty. Please add an event before checking out.";

      checkoutStatus.classList.add("error");

      valid = false;
    }

    return valid;
  };

  ["checkoutName", "checkoutEmail", "checkoutRoll", "checkoutYear"].forEach(
    (id) => {
      const field = document.getElementById(id);

      field?.addEventListener("input", () => {
        setFieldError(id, "");
      });

      field?.addEventListener("change", () => {
        setFieldError(id, "");
      });
    },
  );

  // =========================================
  // 15. REGISTRATION SUBMISSION
  // =========================================

  /*
   * This is a placeholder until your backend endpoint is connected.
   * It intentionally does not claim a registration was saved.
   */
  window.submitVortexRegistration = async (registration) => {
    console.log("Validated registration payload:", registration);

    throw new Error(
      "Registration submission is not connected to the backend yet.",
    );
  };

  checkoutForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateCheckout()) return;

    const billing = getCartBilling();

    const registration = {
      name: document.getElementById("checkoutName").value.trim(),

      email: document
        .getElementById("checkoutEmail")
        .value.trim()
        .toLowerCase(),

      rollNumber: document.getElementById("checkoutRoll").value.trim(),

      academicYear: document.getElementById("checkoutYear").value,

      events: cart.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
      })),

      billing: {
        subtotal: billing.subtotal,
        discountPercent: billing.discountPercent * 100,
        discount: billing.discount,
        total: billing.total,
      },
    };

    const submitButton = document.getElementById("checkoutSubmitBtn");

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    checkoutStatus.textContent = "";
    checkoutStatus.className = "checkout-status";

    try {
      await window.submitVortexRegistration(registration);

      checkoutStatus.textContent = "Registration submitted successfully.";

      checkoutStatus.classList.add("success");
    } catch (error) {
      checkoutStatus.textContent =
        error?.message || "Unable to submit registration. Please try again.";

      checkoutStatus.classList.add("error");
    } finally {
      submitButton.disabled = false;

      submitButton.innerHTML =
        'Submit Registration <i class="fa-solid fa-arrow-right"></i>';
    }
  });

  // =========================================
  // 16. SVG PIE INTERACTIONS
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
  // 17. MOBILE MENU
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

  // =========================================
  // 18. NAVBAR SCROLL BEHAVIOUR
  // =========================================

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

  // =========================================
  // 19. INITIALIZE CART AND CHECKOUT
  // =========================================

  updateCartUI();
  renderCheckoutBilling();
});
