import eventsData from "../data/eventsData.js";

// =========================================
// RECAPTCHA SITE KEY & CACHE KEY
// =========================================
const RECAPTCHA_SITE_KEY = "6LcIgeAtAAAAAJuakH7S9z9eNDTFvsW7ilxBkxYf";
const CHECKOUT_DRAFT_KEY = "vortex_checkout_draft";

// =========================================
// 0. IN-PAGE GLASSMORPHIC MODAL & PROGRESS HELPERS
// =========================================
function showVortexModal({ type = "warning", title, message, ticketHTML = "", btnText = "Continue", onConfirm }) {
    let overlay = document.getElementById("vortexModalOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "vortexModalOverlay";
        overlay.className = "vortex-modal-overlay";
        document.body.appendChild(overlay);
    }

    const icons = {
        success: "fa-solid fa-circle-check",
        error: "fa-solid fa-circle-xmark",
        warning: "fa-solid fa-triangle-exclamation"
    };

    overlay.innerHTML = `
        <div class="vortex-modal-card">
            <div class="vortex-modal-icon ${type}">
                <i class="${icons[type] || icons.warning}"></i>
            </div>
            <h3 class="vortex-modal-title">${title}</h3>
            <p class="vortex-modal-msg">${message}</p>
            ${ticketHTML}
            <button type="button" class="vortex-modal-btn" id="vortexModalBtn">${btnText}</button>
        </div>
    `;

    requestAnimationFrame(() => overlay.classList.add("active"));

    document.getElementById("vortexModalBtn").onclick = () => {
        overlay.classList.remove("active");
        if (onConfirm) setTimeout(onConfirm, 250);
    };
}

function updateProgressModal(percent, statusMsg) {
    let overlay = document.getElementById("vortexModalOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "vortexModalOverlay";
        overlay.className = "vortex-modal-overlay";
        document.body.appendChild(overlay);
    }

    if (!document.getElementById("vortexProgressFill")) {
        overlay.innerHTML = `
            <div class="vortex-modal-card">
                <div class="vortex-modal-icon warning">
                    <i class="fa-solid fa-cloud-arrow-up fa-bounce"></i>
                </div>
                <h3 class="vortex-modal-title">Submitting Registration</h3>
                <p class="vortex-modal-msg" id="vortexProgressText">${statusMsg}</p>
                <div class="vortex-progress-track">
                    <div class="vortex-progress-fill" id="vortexProgressFill"></div>
                </div>
                <div class="vortex-progress-percent" id="vortexProgressPercent">${percent}%</div>
            </div>
        `;
        requestAnimationFrame(() => overlay.classList.add("active"));
    }

    requestAnimationFrame(() => {
        const fill = document.getElementById("vortexProgressFill");
        const text = document.getElementById("vortexProgressText");
        const pct = document.getElementById("vortexProgressPercent");
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.textContent = statusMsg;
        if (pct) pct.textContent = `${percent}%`;
    });
}

// =========================================
// 1. THEME INITIALIZATION
// =========================================
const themeBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const htmlElement = document.documentElement;

let savedTheme = localStorage.getItem("vortex_theme") || "dark";
htmlElement.setAttribute("data-theme", savedTheme);
if (themeIcon) themeIcon.className = savedTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";

themeBtn?.addEventListener("click", () => {
    const currentTheme = htmlElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    htmlElement.setAttribute("data-theme", newTheme);
    if (themeIcon) themeIcon.className = newTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    localStorage.setItem("vortex_theme", newTheme);
});

// =========================================
// 2. MATH & CART LOADING
// =========================================
const parsePrice = (price) => {
    if (typeof price === "number") return price;
    if (!price) return 0;
    return Number(String(price).replace(/[^0-9.]/g, '')) || 0;
};

const formatINR = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

let cart = [];
try { cart = JSON.parse(localStorage.getItem("vortex_cart") || "[]"); } catch { cart = []; }

cart = cart.map((item) => {
    const eventRecord = eventsData.find((e) => e.id === item.id);
    return {
        ...item,
        price: eventRecord ? parsePrice(eventRecord.price) : 0,
        originalPrice: eventRecord && eventRecord.originalPrice ? parsePrice(eventRecord.originalPrice) : 0
    };
});

// =========================================
// 3. DISCOUNT MATH 
// =========================================
const SR_IDP_IDS = ["sridp", "sridpmultistatements"];

const getCartBilling = () => {
    const eligibleItems = cart.filter((item) => !SR_IDP_IDS.includes(item.id));
    const ineligibleItems = cart.filter((item) => SR_IDP_IDS.includes(item.id));
  
    const counts = { general: 0, prodigy: 0, pharma: 0 };
    eligibleItems.forEach((item) => { if (Object.hasOwn(counts, item.category)) counts[item.category]++; });
  
    let completedSeries = 0;
    if (counts.general === 5) completedSeries++;
    if (counts.prodigy === 4) completedSeries++;
    if (counts.pharma === 5) completedSeries++;
  
    let discountPercent = 0;
    if (completedSeries === 3) discountPercent = 0.70;
    else if (completedSeries === 2) discountPercent = 0.65;
    else if (completedSeries === 1) discountPercent = 0.60;
    else if (eligibleItems.length >= 5) discountPercent = 0.50;
    else if (eligibleItems.length >= 3) discountPercent = 0.30;
  
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.price, 0);
    const excludedSubtotal = ineligibleItems.reduce((sum, item) => sum + item.price, 0);
    const discount = eligibleSubtotal * discountPercent;
    const total = eligibleSubtotal - discount + excludedSubtotal;
  
    return { subtotal, discount, total, discountPercent };
};

// =========================================
// 4. RENDER ORDER SUMMARY & REMOVE BTNS
// =========================================
const renderOrder = () => {
    const list = document.getElementById("checkoutEventList");
    if (!list) return;
    list.replaceChildren();
    
    cart.forEach((item) => {
        const row = document.createElement("div");
        row.className = "checkout-event-row";

        const details = document.createElement("div");
        details.className = "checkout-event-details";

        const name = document.createElement("strong");
        name.textContent = item.name;

        const category = document.createElement("span");
        category.textContent = `${item.category} Series`;
        details.append(name, category);

        const rightSide = document.createElement("div");
        rightSide.style.display = "flex";
        rightSide.style.alignItems = "center";
        rightSide.style.gap = "1.2rem";
        rightSide.style.flexShrink = "0";

        const price = document.createElement("strong");
        price.style.fontFamily = "'Orbitron', sans-serif";
        if (item.originalPrice && item.originalPrice > item.price) {
            price.innerHTML = `<del class="old-price" style="margin-right:6px;">${formatINR(item.originalPrice)}</del>${formatINR(item.price)}`;
        } else {
            price.textContent = formatINR(item.price);
        }

        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        removeBtn.style.background = "none";
        removeBtn.style.border = "none";
        removeBtn.style.color = "#ff4757";
        removeBtn.style.fontSize = "1.2rem";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.padding = "5px";
        removeBtn.style.transition = "transform 0.2s, color 0.2s";
        removeBtn.setAttribute("aria-label", `Remove ${item.name}`);

        removeBtn.addEventListener("mouseenter", () => {
            removeBtn.style.transform = "scale(1.15)";
            removeBtn.style.color = "#ff6b81";
        });
        removeBtn.addEventListener("mouseleave", () => {
            removeBtn.style.transform = "scale(1)";
            removeBtn.style.color = "#ff4757";
        });

        removeBtn.addEventListener("click", () => {
            cart = cart.filter((cItem) => cItem.id !== item.id);
            localStorage.setItem("vortex_cart", JSON.stringify(cart));

            if (cart.length === 0) {
                renderOrder();
                showVortexModal({
                    type: "warning",
                    title: "Your Cart is Empty",
                    message: "You removed the last event from your cart. Returning to events.",
                    btnText: "Browse Events",
                    onConfirm: () => { window.location.href = "index.html#events"; }
                });
            } else {
                renderOrder();
            }
        });

        rightSide.append(price, removeBtn);
        row.append(details, rightSide);
        list.appendChild(row);
    });

    const billing = getCartBilling();
    document.getElementById("checkoutSubtotal").textContent = formatINR(billing.subtotal);
    document.getElementById("checkoutDiscountLabel").textContent = `Discount (${Math.round(billing.discountPercent * 100)}%)`;
    document.getElementById("checkoutDiscount").textContent = `-${formatINR(billing.discount)}`;
    document.getElementById("checkoutTotal").textContent = formatINR(billing.total);
};

// Initial Check & Render
if (cart.length === 0) {
    showVortexModal({
        type: "warning",
        title: "Your Cart is Empty",
        message: "Add at least one event to your cart before proceeding to checkout.",
        btnText: "Browse Events",
        onConfirm: () => { window.location.href = "index.html#events"; }
    });
} else {
    renderOrder();
}

// =========================================
// 5. PLAYABLE SLINGSHOT UPLOAD & PHYSICS ENGINE
// =========================================
const paymentProofInput = document.getElementById("paymentProof");
const fileUploadName = document.getElementById("fileUploadName");
const hoopStage = document.getElementById("hoopStage");
const hoopCanvas = document.getElementById("hoopCanvas");
const hoopUploadBadge = document.getElementById("hoopUploadBadge");
const hoopChangeBtn = document.getElementById("hoopChangeBtn");
const hoopAimHint = document.getElementById("hoopAimHint");
const slingshotCard = document.getElementById("slingshotCard");

const ctx = hoopCanvas?.getContext("2d");
const GRAVITY = 0.44;
const LAUNCH_POWER = 0.265;
const MAX_PULL = 72;
const RIM_Y = 70; // 18px SVG top offset + 52px rim center inside viewBox
const RIM_HALF_WIDTH = 35;

const MISS_MESSAGES = [
    "Airball! Give it another shot.",
    "Brick! The rim felt that one — try again.",
    "So close! Pull a little higher and shoot again.",
    "Rim said no. Shooters shoot — run it back!",
    "Off the glass! Adjust your arc and try again."
];
let lastMissIndex = -1;

let selectedFile = null;
let shotsScored = 0;
let stageW = 320;
let stageH = 280;
let anchorX = 160;
let anchorY = 212;

let isDragging = false;
let isFlying = false;
let activePointerId = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let ball = { x: 160, y: 212, vx: 0, vy: 0, rot: 0, vrot: 0, scoredThisShot: false };
let particles = [];
let rafId = null;
let lastFrameTime = 0;

const resizeHoopCanvas = () => {
    if (!hoopStage || !hoopCanvas) return;
    const rect = hoopStage.getBoundingClientRect();
    stageW = rect.width || 320;
    stageH = rect.height || 280;
    const dpr = window.devicePixelRatio || 1;
    hoopCanvas.width = Math.round(stageW * dpr);
    hoopCanvas.height = Math.round(stageH * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    anchorX = stageW / 2;
    anchorY = stageH - 68;

    if (!isDragging && !isFlying) {
        resetBallToPad();
    }
};

const renderCardTransform = (scale = 1) => {
    if (!slingshotCard) return;
    slingshotCard.style.transform = `translate3d(${ball.x}px, ${ball.y}px, 0) rotate(${ball.rot}deg) scale(${scale})`;
};

const resetBallToPad = () => {
    isFlying = false;
    isDragging = false;
    ball.x = anchorX;
    ball.y = anchorY;
    ball.vx = 0;
    ball.vy = 0;
    ball.rot = 0;
    ball.vrot = 0;
    ball.scoredThisShot = false;
    if (slingshotCard) {
        slingshotCard.style.opacity = "1";
        slingshotCard.style.zIndex = "5";
        slingshotCard.classList.remove("grabbing");
    }
    hoopStage?.classList.remove("is-dragging", "is-flying");
    renderCardTransform(1);
};

const spawnConfetti = (x, y) => {
    const colors = ["#00f3ff", "#bd00ff", "#00ff88", "#ffd93d"];
    for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.4;
        const speed = 2.2 + Math.random() * 4.5;
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            size: 2.5 + Math.random() * 3,
            color: colors[i % colors.length],
            life: 1
        });
    }
};

const drawCanvasEffects = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, stageW, stageH);

    // 1. Slingshot band & live trajectory preview while aiming
    if (isDragging) {
        const dx = ball.x - anchorX;
        const dy = ball.y - anchorY;
        const pullMag = Math.hypot(dx, dy);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY);
        ctx.lineTo(ball.x, ball.y);
        ctx.strokeStyle = "rgba(189, 0, 255, 0.65)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(anchorX, anchorY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 243, 255, 0.7)";
        ctx.fill();

        if (pullMag > 10) {
            let px = ball.x;
            let py = ball.y;
            let pvx = -dx * LAUNCH_POWER;
            let pvy = -dy * LAUNCH_POWER;

            for (let i = 0; i < 14; i++) {
                const stepDt = 1.65;
                pvy += GRAVITY * stepDt;
                px += pvx * stepDt;
                py += pvy * stepDt;

                const alpha = Math.max(0.12, 1 - i / 14);
                const radius = Math.max(1.8, 4.2 - i * 0.18);
                ctx.beginPath();
                ctx.arc(px, py, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 243, 255, ${alpha})`;
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // 2. Swish confetti particles
    if (particles.length > 0) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.vy += 0.14;
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.025;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
};

const collideWithRimPost = (postX, postY) => {
    const dx = ball.x - postX;
    const dy = ball.y - postY;
    const dist = Math.hypot(dx, dy);
    const minDist = 17;
    if (dist > 0 && dist < minDist) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = postX + nx * minDist;
        ball.y = postY + ny * minDist;

        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
            ball.vx = (ball.vx - 2 * dot * nx) * 0.62;
            ball.vy = (ball.vy - 2 * dot * ny) * 0.62;
            ball.vrot = (Math.random() - 0.5) * 14;
        }
    }
};

const triggerSwish = () => {
    shotsScored++;
    if (hoopStage) {
        hoopStage.classList.remove("swish");
        void hoopStage.offsetWidth;
        hoopStage.classList.add("swish");
    }
    if (hoopUploadBadge) {
        hoopUploadBadge.textContent = shotsScored > 1 ? `Swish! x${shotsScored}` : "Swish! 1";
        hoopUploadBadge.classList.remove("attached");
        hoopUploadBadge.classList.add("scored");
    }
    if (fileUploadName && selectedFile) {
        fileUploadName.textContent = `Swish! Ready to submit: ${selectedFile.name}`;
    }
    if (hoopAimHint) {
        hoopAimHint.textContent = "Nice shot! Pull again for fun or hit Submit below.";
    }
    spawnConfetti(anchorX, RIM_Y + 14);
};

const stepAnimation = (timestamp) => {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min((timestamp - lastFrameTime) / 16.667, 2);
    lastFrameTime = timestamp;

    if (isFlying) {
        const prevY = ball.y;

        ball.vy += GRAVITY * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.rot += ball.vrot * dt;

        // Pass in front of hoop on the way up, behind front rim/net on the way down
        if (slingshotCard) {
            slingshotCard.style.zIndex = ball.vy < 0 ? "5" : "3";
        }

        // Bounce off side walls
        if (ball.x < 22) {
            ball.x = 22;
            ball.vx = Math.abs(ball.vx) * 0.65;
        } else if (ball.x > stageW - 22) {
            ball.x = stageW - 22;
            ball.vx = -Math.abs(ball.vx) * 0.65;
        }

        const rimLeft = anchorX - RIM_HALF_WIDTH;
        const rimRight = anchorX + RIM_HALF_WIDTH;

        // Rim edge collisions when falling or near rim
        if (ball.vy > -2) {
            collideWithRimPost(rimLeft, RIM_Y);
            collideWithRimPost(rimRight, RIM_Y);
        }

        // Score check: passing downward through rim opening
        if (
            !ball.scoredThisShot &&
            ball.vy > 0 &&
            prevY <= RIM_Y + 4 &&
            ball.y > RIM_Y + 4 &&
            ball.x > rimLeft + 5 &&
            ball.x < rimRight - 5
        ) {
            ball.scoredThisShot = true;
            ball.vx *= 0.35;
            ball.vy *= 0.65;
            triggerSwish();
        }

        // Subtle shrink as it drops through the net
        let scale = 1;
        if (ball.scoredThisShot && ball.y > RIM_Y) {
            scale = Math.max(0.55, 1 - (ball.y - RIM_Y) / 150);
            if (slingshotCard) {
                slingshotCard.style.opacity = String(Math.max(0, 1 - (ball.y - (RIM_Y + 28)) / 70));
            }
        }

        renderCardTransform(scale);

        // Reset card back to launch pad once shot finishes
        const finishedSwish = ball.scoredThisShot && ball.y > RIM_Y + 95;
        const missedBottom = !ball.scoredThisShot && ball.y > stageH + 45;
        if (finishedSwish || missedBottom) {
            isFlying = false;
            if (missedBottom && hoopAimHint) {
                let nextIndex;
                do {
                    nextIndex = Math.floor(Math.random() * MISS_MESSAGES.length);
                } while (nextIndex === lastMissIndex && MISS_MESSAGES.length > 1);
                lastMissIndex = nextIndex;
                hoopAimHint.textContent = MISS_MESSAGES[nextIndex];
            }
            setTimeout(() => {
                if (selectedFile && !isDragging && !isFlying) {
                    resetBallToPad();
                }
            }, 320);
        }
    }

    drawCanvasEffects();

    if (isDragging || isFlying || particles.length > 0) {
        rafId = requestAnimationFrame(stepAnimation);
    } else {
        rafId = null;
        lastFrameTime = 0;
    }
};

const ensureLoopRunning = () => {
    if (!rafId) {
        lastFrameTime = 0;
        rafId = requestAnimationFrame(stepAnimation);
    }
};

const handleFileSelected = (file) => {
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (file.type && !validTypes.includes(file.type)) {
        showVortexModal({
            type: "warning",
            title: "Unsupported File Type",
            message: "Please upload a PNG, JPG, WEBP image, or a PDF receipt.",
            btnText: "Okay"
        });
        return;
    }

    if (file.size > 3 * 1024 * 1024) {
        showVortexModal({
            type: "warning",
            title: "File Too Large",
            message: "Please upload an image or PDF smaller than 3 MB.",
            btnText: "Okay"
        });
        if (paymentProofInput) paymentProofInput.value = "";
        return;
    }

    selectedFile = file;
    shotsScored = 0;
    lastMissIndex = -1;

    // Sync input.files in case file came from drag-and-drop
    if (paymentProofInput && (!paymentProofInput.files || paymentProofInput.files[0] !== file)) {
        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            paymentProofInput.files = dt.files;
        } catch (err) {}
    }

    const ext = (file.name.split(".").pop() || "FILE").toUpperCase().slice(0, 4);
    if (slingshotCard) slingshotCard.setAttribute("data-ext", ext);

    hoopStage?.classList.add("has-file");
    if (hoopChangeBtn) hoopChangeBtn.style.display = "inline-block";
    if (hoopUploadBadge) {
        hoopUploadBadge.textContent = "Attached • Shoot!";
        hoopUploadBadge.classList.remove("scored");
        hoopUploadBadge.classList.add("attached");
    }
    if (hoopAimHint) {
        hoopAimHint.textContent = "Pull the receipt card down & release to shoot!";
    }
    if (fileUploadName) {
        fileUploadName.textContent = `Attached: ${file.name} — drag the card to take the shot!`;
    }

    resizeHoopCanvas();
    resetBallToPad();
};

// Click stage when empty to browse files
hoopStage?.addEventListener("click", (e) => {
    if (selectedFile) return;
    if (e.target === hoopChangeBtn) return;
    paymentProofInput?.click();
});

hoopChangeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    paymentProofInput?.click();
});

paymentProofInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
});

// OS File Drag & Drop onto the stage
["dragenter", "dragover"].forEach((evt) => {
    hoopStage?.addEventListener(evt, (e) => {
        e.preventDefault();
        hoopStage.classList.add("drag-over");
    });
});

hoopStage?.addEventListener("dragleave", () => {
    hoopStage.classList.remove("drag-over");
});

hoopStage?.addEventListener("drop", (e) => {
    e.preventDefault();
    hoopStage.classList.remove("drag-over");
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) handleFileSelected(droppedFile);
});

// Slingshot Pointer Controls (Mouse + Touch)
slingshotCard?.addEventListener("pointerdown", (e) => {
    if (!selectedFile || isFlying) return;
    e.preventDefault();
    e.stopPropagation();

    resizeHoopCanvas();
    isDragging = true;
    activePointerId = e.pointerId;
    slingshotCard.setPointerCapture?.(e.pointerId);
    slingshotCard.classList.add("grabbing");
    hoopStage?.classList.add("is-dragging");

    const rect = hoopStage.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    dragOffsetX = ball.x - pointerX;
    dragOffsetY = ball.y - pointerY;

    ensureLoopRunning();
});

const onSlingshotMove = (e) => {
    if (!isDragging || e.pointerId !== activePointerId) return;
    e.preventDefault();

    const rect = hoopStage.getBoundingClientRect();
    let dx = (e.clientX - rect.left + dragOffsetX) - anchorX;
    let dy = (e.clientY - rect.top + dragOffsetY) - anchorY;

    const dist = Math.hypot(dx, dy);
    if (dist > MAX_PULL) {
        dx = (dx / dist) * MAX_PULL;
        dy = (dy / dist) * MAX_PULL;
    }

    dy = Math.max(-24, Math.min(64, dy));

    ball.x = anchorX + dx;
    ball.y = anchorY + dy;
    ball.rot = -dx * 0.35;
    renderCardTransform(1.04);
};

const onSlingshotRelease = (e) => {
    if (!isDragging || e.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
    slingshotCard?.classList.remove("grabbing");
    hoopStage?.classList.remove("is-dragging");

    const dx = ball.x - anchorX;
    const dy = ball.y - anchorY;
    const pullMag = Math.hypot(dx, dy);

    if (pullMag < 12) {
        resetBallToPad();
        drawCanvasEffects();
        return;
    }

    ball.vx = -dx * LAUNCH_POWER;
    ball.vy = -dy * LAUNCH_POWER;
    ball.vrot = -dx * 0.14;
    ball.scoredThisShot = false;
    isFlying = true;
    hoopStage?.classList.add("is-flying");
    ensureLoopRunning();
};

slingshotCard?.addEventListener("pointermove", onSlingshotMove);
slingshotCard?.addEventListener("pointerup", onSlingshotRelease);
slingshotCard?.addEventListener("pointercancel", onSlingshotRelease);
window.addEventListener("resize", resizeHoopCanvas);
resizeHoopCanvas();

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
});

// =========================================
// 6. FORM CACHE SYSTEM (AUTO-SAVE & RESTORE)
// =========================================
const collegeSelect = document.getElementById("collegeSelect");
const otherCollegeGroup = document.getElementById("otherCollegeGroup");
const otherCollegeInput = document.getElementById("otherCollege");
const checkoutForm = document.getElementById("checkoutForm");

const syncOtherCollegeVisibility = () => {
    if (!collegeSelect || !otherCollegeGroup || !otherCollegeInput) return;
    if (collegeSelect.value === "Other") {
        otherCollegeGroup.style.display = "block";
        otherCollegeInput.required = true;
    } else {
        otherCollegeGroup.style.display = "none";
        otherCollegeInput.required = false;
        otherCollegeInput.value = "";
    }
};

const saveFormDraft = () => {
    try {
        const draft = {
            fullName: document.getElementById("fullName")?.value || "",
            phone: document.getElementById("phone")?.value || "",
            email: document.getElementById("email")?.value || "",
            collegeSelect: collegeSelect?.value || "",
            otherCollege: otherCollegeInput?.value || "",
            yearSelect: document.getElementById("yearSelect")?.value || "",
            collegeId: document.getElementById("collegeId")?.value || "",
            transactionId: document.getElementById("transactionId")?.value || "",
            termsConsent: document.getElementById("termsConsent")?.checked || false
        };
        sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {}
};

const restoreFormDraft = () => {
    try {
        const saved = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
        if (!saved) return;
        const draft = JSON.parse(saved);

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && typeof val === "string") el.value = val;
        };

        setVal("fullName", draft.fullName);
        setVal("phone", draft.phone);
        setVal("email", draft.email);
        setVal("collegeSelect", draft.collegeSelect);
        syncOtherCollegeVisibility();
        if (draft.collegeSelect === "Other") {
            setVal("otherCollege", draft.otherCollege);
        }
        setVal("yearSelect", draft.yearSelect);
        setVal("collegeId", draft.collegeId);
        setVal("transactionId", draft.transactionId);

        const termsEl = document.getElementById("termsConsent");
        if (termsEl && typeof draft.termsConsent === "boolean") {
            termsEl.checked = draft.termsConsent;
        }
    } catch (e) {}
};

if (collegeSelect) {
    collegeSelect.addEventListener("change", () => {
        syncOtherCollegeVisibility();
        saveFormDraft();
    });
}

if (checkoutForm) {
    checkoutForm.addEventListener("input", saveFormDraft);
    checkoutForm.addEventListener("change", saveFormDraft);
    restoreFormDraft();
}

// =========================================
// 7. SECURE BACKEND SUBMISSION
// =========================================
if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        
        const file = selectedFile || paymentProofInput?.files?.[0];
        if (!file) {
            showVortexModal({
                type: "warning",
                title: "Payment Proof Required",
                message: "Please upload your payment screenshot or PDF receipt.",
                btnText: "Okay"
            });
            return;
        }

        if (typeof grecaptcha === "undefined") {
            showVortexModal({
                type: "warning",
                title: "Security Check Unavailable",
                message: "Google reCAPTCHA failed to load. Please disable adblockers or refresh the page.",
                btnText: "Okay"
            });
            return;
        }

        let finalCollege = collegeSelect.value;
        if (finalCollege === "Other") {
            finalCollege = otherCollegeInput.value.trim();
        }

        const rawName = document.getElementById("fullName").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const email = document.getElementById("email").value.trim();
        const transactionId = document.getElementById("transactionId").value.trim();
        const billing = getCartBilling();

        // Build clean, unique filename: FullName_Phone_UTR.ext
        const safeName = rawName.replace(/[^a-zA-Z0-9]/g, "_");
        const safeUTR = transactionId.replace(/[^a-zA-Z0-9]/g, "");
        const ext = file.name.split(".").pop().toLowerCase();
        const customFileName = `${safeName}_${phone}_${safeUTR}.${ext}`;

        const proceedBtn = document.getElementById("proceedBtn");
        const originalText = proceedBtn.textContent;
        proceedBtn.textContent = "Submitting...";
        proceedBtn.disabled = true;

        try {
            // 1. Prepare file
            updateProgressModal(25, "Preparing your payment proof...");
            const base64Data = await fileToBase64(file);

            // 2. Generate fresh reCAPTCHA v3 token
            updateProgressModal(55, "Verifying security check...");
            const captchaToken = await new Promise((resolve, reject) => {
                grecaptcha.ready(() => {
                    grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "register" })
                        .then(resolve)
                        .catch(reject);
                });
            });

            // 3. Send everything to Vercel backend (handles Drive upload + DB save)
            updateProgressModal(80, "Uploading proof & saving registration...");

            const participantData = {
                name: rawName,
                phone: phone,
                email: email,
                college: finalCollege,
                year: document.getElementById("yearSelect").value,
                collegeId: document.getElementById("collegeId").value.trim(),
                transactionId: transactionId,
                paymentProofName: customFileName,
                paymentProofMimeType: file.type,
                paymentProofBase64: base64Data,
                cart: cart,
                captchaToken: captchaToken
            };

            const response = await fetch("https://vortex-backend-six.vercel.app/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(participantData)
            });

            const result = await response.json();

            if (result.success) {
                updateProgressModal(100, "Registration complete!");
                localStorage.removeItem("vortex_cart");
                sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);

                setTimeout(() => {
                    showVortexModal({
                        type: "success",
                        title: "Registration Submitted!",
                        message: "Your payment proof has been uploaded. Our team will verify your payment shortly.",
                        ticketHTML: `
                            <div class="vortex-ticket-stub">
                                <div class="vortex-ticket-row"><span>Participant</span><strong>${rawName}</strong></div>
                                <div class="vortex-ticket-row"><span>Events</span><strong>${cart.length} Registered</strong></div>
                                <div class="vortex-ticket-row"><span>Amount Paid</span><strong style="color:var(--success-green)">${formatINR(billing.total)}</strong></div>
                                <div class="vortex-ticket-row"><span>UTR / Txn ID</span><strong>${transactionId}</strong></div>
                                <div class="vortex-ticket-row"><span>Saved File</span><strong>${customFileName}</strong></div>
                            </div>
                        `,
                        btnText: "Return to Home",
                        onConfirm: () => { window.location.href = "index.html"; }
                    });
                }, 400);
            } else {
                showVortexModal({
                    type: "error",
                    title: "Registration Error",
                    message: result.message || "Something went wrong saving your registration. Please try again.",
                    btnText: "Try Again"
                });
                proceedBtn.textContent = originalText;
                proceedBtn.disabled = false;
            }

        } catch (error) {
            console.error("Submission Error:", error);
            showVortexModal({
                type: "error",
                title: "Upload Failed",
                message: "Failed to upload payment proof or connect to server. Please check your internet and try again.",
                btnText: "Okay"
            });
            proceedBtn.textContent = originalText;
            proceedBtn.disabled = false;
        }
    });
}