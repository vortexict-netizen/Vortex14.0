// server.js
const express = require('express');
const multer = require('multer'); // Required for parsing FormData and files
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configure multer to hold files in memory (or configure it to save to disk)
const upload = multer({ storage: multer.memoryStorage() });

// Your Cloudflare Turnstile Secret Key
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

// Endpoint must handle multipart/form-data because of the file uploads
app.post('/api/register', upload.fields([{ name: 'idCard' }, { name: 'payment' }]), async (req, res) => {
    // Extract text fields from req.body
    const { fullName, phone, instituteId, size, captchaToken } = req.body;
    
    // Extract files from req.files
    const files = req.files; 

    if (!captchaToken) {
        return res.status(400).json({ error: 'Security token is missing' });
    }

    try {
        // 1. Verify the token with Cloudflare Turnstile (NOT Google)
        const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        
        const response = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${TURNSTILE_SECRET_KEY}&response=${captchaToken}`
        });
        
        const turnstileData = await response.json();

        // 2. Evaluate the Cloudflare response
        if (!turnstileData.success) {
            console.warn('Bot detected by Turnstile:', turnstileData['error-codes']);
            return res.status(403).json({ error: 'Security check failed.' });
        }

        // 3. Security passed! Process the user data and files here
        // console.log("User:", fullName, "ID File:", files.idCard[0].originalname);

        res.status(200).json({ message: 'Registration Successful!' });

    } catch (error) {
        console.error("Turnstile validation error:", error);
        res.status(500).json({ error: 'Internal server error validating security token' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});