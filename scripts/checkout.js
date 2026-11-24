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
// 5. FILE INPUT PREVIEW, HOOP ANIMATION & BASE64 HELPER
// =========================================
const paymentProofInput = document.getElementById("paymentProof");
const fileUploadName = document.getElementById("fileUploadName");
const hoopDropzone = document.getElementById("hoopDropzone");
const hoopUploadBadge = document.getElementById("hoopUploadBadge");
const flyingFileDoc = document.getElementById("flyingFileDoc");

["dragenter", "dragover"].forEach((evt) => {
    hoopDropzone?.addEventListener(evt, () => {
        hoopDropzone.classList.add("drag-over");
    });
});

["dragleave", "drop"].forEach((evt) => {
    hoopDropzone?.addEventListener(evt, () => {
        hoopDropzone.classList.remove("drag-over");
    });
});

paymentProofInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
        fileUploadName.textContent = "";
        if (hoopUploadBadge) {
            hoopUploadBadge.textContent = "Uploaded 0";
            hoopUploadBadge.classList.remove("scored");
        }
        return;
    }

    if (file.size > 3 * 1024 * 1024) {
        showVortexModal({
            type: "warning",
            title: "File Too Large",
            message: "Please upload an image or PDF smaller than 3 MB.",
            btnText: "Okay"
        });
        paymentProofInput.value = "";
        fileUploadName.textContent = "";
        if (hoopUploadBadge) {
            hoopUploadBadge.textContent = "Uploaded 0";
            hoopUploadBadge.classList.remove("scored");
        }
        return;
    }

    const ext = file.name.split(".").pop().toUpperCase().slice(0, 4);
    if (flyingFileDoc) flyingFileDoc.setAttribute("data-ext", ext);

    if (hoopDropzone) {
        hoopDropzone.classList.remove("swish");
        void hoopDropzone.offsetWidth;
        hoopDropzone.classList.add("swish");
    }

    if (hoopUploadBadge) {
        hoopUploadBadge.textContent = "Uploaded 1";
        hoopUploadBadge.classList.add("scored");
    }

    fileUploadName.textContent = `Swish! Selected: ${file.name}`;
});

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
        
        const file = paymentProofInput?.files[0];
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