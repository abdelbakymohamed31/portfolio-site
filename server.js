const express = require('express');
const session = require('express-session');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'content.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(session({
    secret: 'portfolio-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Helper functions
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { admin: { username: 'admin', password: 'mustafa2024' }, reels: [], motionGraphics: [], graphicDesign: [], thumbnails: [], webDesign: [] };
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(input) {
    if (!input) return input;
    input = input.trim();

    // If it's already just an ID (no slashes, no dots), return as-is
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
        return input;
    }

    // Try to extract from various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    // If no pattern matched, return the original (user might have entered something custom)
    return input;
}

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'غير مصرح' });
    }
}

// ==================== AUTH ROUTES ====================

// Login page
app.get('/admin', (req, res) => {
    if (req.session && req.session.isAdmin) {
        res.redirect('/admin/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'admin', 'login.html'));
    }
});

// Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const data = readData();

    if (username === data.admin.username && password === data.admin.password) {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
});

// Logout
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin');
});

// Dashboard page
app.get('/admin/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// ==================== API ROUTES ====================

// Get all content (public)
app.get('/api/content', (req, res) => {
    const data = readData();
    const { admin, ...publicData } = data; // Remove admin credentials
    res.json(publicData);
});

// Get specific category
app.get('/api/content/:category', (req, res) => {
    const data = readData();
    const category = req.params.category;
    if (data[category]) {
        res.json(data[category]);
    } else {
        res.status(404).json({ error: 'القسم غير موجود' });
    }
});

// Add item to category (protected)
app.post('/api/content/:category', requireAuth, (req, res) => {
    const data = readData();
    const category = req.params.category;

    if (!data[category]) {
        return res.status(404).json({ error: 'القسم غير موجود' });
    }

    const newItem = {
        id: Date.now(),
        ...req.body
    };

    // Extract YouTube ID from URL if full URL was provided
    if (newItem.youtubeId) {
        newItem.youtubeId = extractYouTubeId(newItem.youtubeId);
    }

    data[category].push(newItem);
    writeData(data);
    res.json({ success: true, item: newItem });
});

// Delete item from category (protected)
app.delete('/api/content/:category/:id', requireAuth, (req, res) => {
    const data = readData();
    const category = req.params.category;
    const id = parseInt(req.params.id);

    if (!data[category]) {
        return res.status(404).json({ error: 'القسم غير موجود' });
    }

    data[category] = data[category].filter(item => item.id !== id);
    writeData(data);
    res.json({ success: true });
});

// Update item in category (protected)
app.put('/api/content/:category/:id', requireAuth, (req, res) => {
    const data = readData();
    const category = req.params.category;
    const id = parseInt(req.params.id);

    if (!data[category]) {
        return res.status(404).json({ error: 'القسم غير موجود' });
    }

    const index = data[category].findIndex(item => item.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'العنصر غير موجود' });
    }

    data[category][index] = { ...data[category][index], ...req.body };
    writeData(data);
    res.json({ success: true, item: data[category][index] });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📋 Admin panel at http://localhost:${PORT}/admin`);
});
