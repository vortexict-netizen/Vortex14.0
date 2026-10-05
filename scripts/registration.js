document.addEventListener("DOMContentLoaded", () => {
    
    // --- Theme Toggle Logic ---
    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const htmlElement = document.documentElement;

    themeBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            htmlElement.setAttribute('data-theme', 'light');
            themeIcon.className = 'fa-solid fa-moon';
        } else {
            htmlElement.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fa-solid fa-sun';
        }
    });

    // --- Form Submission & Security Logic ---
    document.getElementById('registrationForm').addEventListener('submit', function(e) {
        e.preventDefault();

        // 1. Honeypot Verification
        const honeypot = document.getElementById('bot_field').value;
        if (honeypot !== "") {
            console.log("Bot detected by honeypot. Discarding submission quietly.");
            return;
        }

        // 2. Captcha Verification Check (Frontend)
        const captchaResponse = document.querySelector('[name="cf-turnstile-response"]').value;
        if (!captchaResponse) {
            alert("Please complete the security check.");
            return;
        }

        // 3. Gather Data
        const formData = new FormData();
        formData.append('fullName', document.getElementById('fullName').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('instituteId', document.getElementById('instituteId').value);
        formData.append('size', document.querySelector('input[name="size"]:checked').value);
        formData.append('idCard', document.getElementById('idCardUpload').files[0]);
        formData.append('payment', document.getElementById('paymentUpload').files[0]);
        
        // Append the Cloudflare token
        formData.append('captchaToken', captchaResponse);

        // 4. Send to Backend API
        fetch('/api/register', {
            method: 'POST',
            body: formData // Do not set 'Content-Type'. The browser handles the multipart boundary automatically.
        })
        .then(response => {
            if (!response.ok) throw new Error("Security check failed on server");
            return response.json();
        })
        .then(data => {
            alert("Registration Successful!");
            // Optional: document.getElementById('registrationForm').reset();
            // Optional: turnstile.reset(); // Reset widget for future submissions
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Registration failed. Please try again.");
        });
    });
});

// --- Image Preview Logic ---
window.previewImage = function(event, previewElementId) {
    const input = event.target;
    const previewImage = document.getElementById(previewElementId);
    const placeholder = input.nextElementSibling; 

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            setTimeout(() => {
                previewImage.style.opacity = '1';
                placeholder.style.opacity = '0'; 
            }, 50);
        }
        reader.readAsDataURL(input.files[0]);
    } else {
        previewImage.src = "";
        previewImage.style.opacity = '0';
        setTimeout(() => previewImage.style.display = 'none', 400);
        placeholder.style.opacity = '1';
    }
};