// Bellevue Menu System - Legacy Server for iOS 9+
// Node.js + Express backend

var express = require('express');
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

var app = express();
var PORT = process.env.PORT || 3000;
var JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded PDFs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Data storage paths
var DATA_DIR = path.join(__dirname, 'data');
var UPLOADS_DIR = path.join(__dirname, 'uploads');
var MENUS_FILE = path.join(DATA_DIR, 'menus.json');
var USERS_FILE = path.join(DATA_DIR, 'users.json');
var SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure directories exist
[DATA_DIR, UPLOADS_DIR].forEach(function(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Menu types
var MENU_TYPES = ['daily', 'menu', 'wine', 'beverages'];
var LANGUAGES = ['de', 'en', 'fr', 'it'];

// Create upload directories for each menu type
MENU_TYPES.forEach(function(type) {
    var menuDir = path.join(UPLOADS_DIR, type);
    if (!fs.existsSync(menuDir)) {
        fs.mkdirSync(menuDir, { recursive: true });
    }
});

// Initialize data files if they don't exist
function initializeDataFiles() {
    // Initialize menus.json
    if (!fs.existsSync(MENUS_FILE)) {
        var initialMenus = {};
        MENU_TYPES.forEach(function(type) {
            initialMenus[type] = {
                type: type,
                enabled: false,
                pdfs: {}
            };
        });
        fs.writeFileSync(MENUS_FILE, JSON.stringify(initialMenus, null, 2));
    }

    // Initialize users.json with default admin
    if (!fs.existsSync(USERS_FILE)) {
        var hashedPassword = bcrypt.hashSync('admin123', 10);
        var initialUsers = {
            admin: {
                email: 'admin@bellevue.com',
                password: hashedPassword
            }
        };
        fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
        console.log('Created default user: admin@bellevue.com / admin123');
        console.log('CHANGE THIS PASSWORD IMMEDIATELY!');
    }

    // Initialize settings.json
    if (!fs.existsSync(SETTINGS_FILE)) {
        var initialSettings = {
            restaurantName: 'Hotel Bellevue'
        };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(initialSettings, null, 2));
    }
}

initializeDataFiles();

// Helper functions
function readJSON(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Authentication middleware
function authenticate(req, res, next) {
    var authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    var token = authHeader.substring(7);
    
    try {
        var decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Configure multer for file uploads
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        var menuType = req.body.menuType || 'daily'; // Default fallback
        var uploadPath = path.join(UPLOADS_DIR, menuType);
        
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        var lang = req.body.language || 'de'; // Default fallback
        var timestamp = Date.now();
        cb(null, lang + '-' + timestamp + '.pdf');
    }
});

var upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', function(req, res) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login
app.post('/api/login', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    var users = readJSON(USERS_FILE);
    var user = null;
    
    Object.keys(users).forEach(function(username) {
        if (users[username].email === email) {
            user = users[username];
        }
    });

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    var isValid = bcrypt.compareSync(password, user.password);
    
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    var token = jwt.sign({ email: email }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ token: token, email: email });
});

// Get all menus (public)
app.get('/api/menus', function(req, res) {
    try {
        var menus = readJSON(MENUS_FILE);
        res.json(menus);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load menus' });
    }
});

// Get specific menu PDF URL (public)
app.get('/api/menus/:type/:lang', function(req, res) {
    var type = req.params.type;
    var lang = req.params.lang;

    if (MENU_TYPES.indexOf(type) === -1 || LANGUAGES.indexOf(lang) === -1) {
        return res.status(400).json({ error: 'Invalid menu type or language' });
    }

    try {
        var menus = readJSON(MENUS_FILE);
        var menu = menus[type];
        
        if (!menu || !menu.enabled) {
            return res.status(404).json({ error: 'Menu not available' });
        }

        var pdf = menu.pdfs[lang];
        
        if (!pdf) {
            return res.status(404).json({ error: 'PDF not found for this language' });
        }

        res.json(pdf);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load menu' });
    }
});

// Upload menu PDF (authenticated)
app.post('/api/menus/upload', authenticate, function(req, res) {
    // Use upload.fields to parse both file and text fields
    var uploadHandler = upload.fields([{ name: 'pdf', maxCount: 1 }]);
    
    uploadHandler(req, res, function(err) {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }

        var menuType = req.body.menuType;
        var language = req.body.language;

        if (!menuType || !language) {
            return res.status(400).json({ error: 'Menu type and language required' });
        }

        if (MENU_TYPES.indexOf(menuType) === -1 || LANGUAGES.indexOf(language) === -1) {
            return res.status(400).json({ error: 'Invalid menu type or language' });
        }

        if (!req.files || !req.files.pdf || !req.files.pdf[0]) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        var uploadedFile = req.files.pdf[0];
        var menus = readJSON(MENUS_FILE);

        // Delete old PDF from Cloudinary if exists
        if (menus[menuType].pdfs[language] && menus[menuType].pdfs[language].publicId) {
            cloudinary.uploader.destroy(menus[menuType].pdfs[language].publicId, { resource_type: 'raw' }, function(error, result) {
                if (error) {
                    console.log('Error deleting old PDF from Cloudinary:', error);
                } else {
                    console.log('Deleted old PDF from Cloudinary:', result);
                }
            });
        }

        // Upload to Cloudinary - use simple public_id without folders
        var publicId = menuType + '-' + language + '-' + Date.now();
        
        cloudinary.uploader.upload(uploadedFile.path, {
            resource_type: 'raw',
            public_id: publicId,
            format: 'pdf',
            access_mode: 'public',
            type: 'upload'
        }, function(error, result) {
            // Delete temp file
            if (fs.existsSync(uploadedFile.path)) {
                fs.unlinkSync(uploadedFile.path);
            }

            if (error) {
                console.error('Cloudinary upload error:', error);
                return res.status(500).json({ error: 'Failed to upload to cloud storage' });
            }

            // Use Cloudinary's secure_url directly
            var deliveryUrl = result.secure_url;
            
            console.log('===================');
            console.log('UPLOAD SUCCESS DEBUG:');
            console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
            console.log('Public ID:', result.public_id);
            console.log('Secure URL (using this):', deliveryUrl);
            console.log('===================');

            // Save new PDF info with Cloudinary URL
            menus[menuType].pdfs[language] = {
                url: deliveryUrl,
                fileName: uploadedFile.originalname,
                publicId: result.public_id,
                cloudinaryUrl: deliveryUrl,
                uploadedAt: new Date().toISOString()
            };

            writeJSON(MENUS_FILE, menus);

            res.json({
                success: true,
                message: 'PDF uploaded successfully',
                url: deliveryUrl
            });
        });
    });
});

// Toggle menu enabled status (authenticated)
app.post('/api/menus/:type/toggle', authenticate, function(req, res) {
    var type = req.params.type;
    var enabled = req.body.enabled;

    if (MENU_TYPES.indexOf(type) === -1) {
        return res.status(400).json({ error: 'Invalid menu type' });
    }

    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Enabled must be boolean' });
    }

    try {
        var menus = readJSON(MENUS_FILE);
        menus[type].enabled = enabled;
        writeJSON(MENUS_FILE, menus);

        res.json({ success: true, enabled: enabled });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update menu status' });
    }
});

// Reset all menu data (authenticated) - for debugging
app.post('/api/menus/reset-all', authenticate, function(req, res) {
    try {
        var initialMenus = {};
        MENU_TYPES.forEach(function(type) {
            initialMenus[type] = {
                type: type,
                enabled: false,
                pdfs: {}
            };
        });
        writeJSON(MENUS_FILE, initialMenus);
        
        res.json({ success: true, message: 'All menu data reset' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset data' });
    }
});

// Get settings (public)
app.get('/api/settings', function(req, res) {
    try {
        var settings = readJSON(SETTINGS_FILE);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

// Update settings (authenticated)
app.post('/api/settings', authenticate, function(req, res) {
    var restaurantName = req.body.restaurantName;

    if (!restaurantName) {
        return res.status(400).json({ error: 'Restaurant name required' });
    }

    try {
        var settings = readJSON(SETTINGS_FILE);
        settings.restaurantName = restaurantName;
        writeJSON(SETTINGS_FILE, settings);

        res.json({ success: true, settings: settings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Start server
app.listen(PORT, function() {
    console.log('===========================================');
    console.log('Bellevue Menu System - Legacy Server');
    console.log('===========================================');
    console.log('Server running on port:', PORT);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Default credentials: admin@bellevue.com / admin123');
    console.log('CHANGE PASSWORD IMMEDIATELY!');
    console.log('===========================================');
});

module.exports = app;
