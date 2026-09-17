const express = require('express');
const session = require('express-session');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Multer setup for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// No file size limit for video uploads
const uploadVideo = multer({ storage });
// 10MB max for images
const uploadImage = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'content.json');

// Ensure data directory and file exist on startup
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        admin: { username: 'admin', password: 'mustafa2024' },
        reels: [], montage: [], motionGraphics: [], graphicDesign: [], thumbnails: [], webDesign: []
    }, null, 2));
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));
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
        return { admin: { username: 'admin', password: 'mustafa2024' }, reels: [], montage: [], motionGraphics: [], graphicDesign: [], thumbnails: [], webDesign: [] };
    }
}

function writeData(data) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Auth middleware
function requireAuth(req, res, next) {
    next();
}

// ==================== AUTH ROUTES ====================

// Login page routes
app.get(['/admin', '/admin/login', '/admin/login*'], (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    req.session.isAdmin = true;
    res.json({ success: true });
});

// Logout
app.get('/api/logout', (req, res) => {
    if (req.session) req.session.destroy();
    res.redirect('/admin');
});

// Dashboard page routes (handles /admin/dashboard, /admin/dashboard.html, and trailing characters/commas)
app.get(['/admin/dashboard', '/admin/dashboard*'], (req, res) => {
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

    data[category].push(newItem);
    writeData(data);
    res.json({ success: true, item: newItem });
});

// Upload image and add item (protected)
app.post('/api/upload/:category', requireAuth, uploadImage.single('image'), (req, res) => {
    const data = readData();
    const category = req.params.category;

    if (!data[category]) {
        return res.status(404).json({ error: 'القسم غير موجود' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'لم يتم اختيار صورة' });
    }

    const newItem = {
        id: Date.now(),
        title: req.body.title || '',
        imageUrl: '/uploads/' + req.file.filename
    };

    data[category].push(newItem);
    writeData(data);
    res.json({ success: true, item: newItem });
});

// Upload video and add item (protected) - NO SIZE LIMIT
app.post('/api/upload-video/:category', requireAuth, uploadVideo.single('video'), (req, res) => {
    const data = readData();
    const category = req.params.category;

    if (!data[category]) {
        return res.status(404).json({ error: 'القسم غير موجود' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'لم يتم اختيار فيديو' });
    }

    const newItem = {
        id: Date.now(),
        title: req.body.title || '',
        videoUrl: '/uploads/' + req.file.filename
    };

    data[category].push(newItem);
    writeData(data);
    res.json({ success: true, item: newItem });
});

// Set hero video (protected) - now accepts videoUrl (file URL) instead of youtubeId
app.post('/api/hero-video', requireAuth, (req, res) => {
    const { videoUrl, youtubeId } = req.body;
    const heroValue = videoUrl || youtubeId;

    if (!heroValue) {
        return res.status(400).json({ error: 'لم يتم توفير رابط الفيديو' });
    }

    const data = readData();
    data.heroVideo = heroValue;
    writeData(data);
    res.json({ success: true, heroVideo: data.heroVideo });
});

// Reorder items in category
app.post('/api/reorder/:category', requireAuth, (req, res) => {
    const data = readData();
    const category = req.params.category;
    const { items } = req.body;

    if (data[category] && Array.isArray(items)) {
        data[category] = items;
        writeData(data);
    }
    res.json({ success: true });
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

// Handle Multer errors (file too large, etc.)
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'حجم الملف كبير جداً. الحد الأقصى للصور 10MB' });
    }
    next(err);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📋 Admin panel at http://localhost:${PORT}/admin`);
});
