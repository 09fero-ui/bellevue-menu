# Bellevue Legacy Menu System

Restaurant digital menu system compatible with **iOS 9+ Safari** (works on old iPads).

## Features

- ✅ Works on ancient iPads (iOS 9-10)
- ✅ No Puffin or third-party browsers needed
- ✅ 4 menu types: Daily, Main, Wine, Beverages
- ✅ 4 languages: German, English, French, Italian
- ✅ Manager dashboard with authentication
- ✅ PDF upload with auto-delete of old files
- ✅ Enable/disable menus
- ✅ Responsive design
- ✅ ES5 JavaScript (old Safari compatible)

## Quick Start

1. **Read** `SETUP_GUIDE.md` for detailed instructions
2. **Get server** (DigitalOcean $6/month recommended)
3. **Upload code** to server
4. **Install dependencies**: `npm install`
5. **Configure** `.env` file
6. **Start app**: `pm2 start server/index.js`
7. **Setup Nginx** reverse proxy
8. **Change default password**

## File Structure

```
bellevue-legacy/
├── server/
│   ├── index.js          # Main server
│   ├── data/             # JSON database
│   └── uploads/          # PDF storage
├── public/
│   ├── index.html        # Guest menu
│   ├── manager.html      # Manager dashboard
│   └── bellevue-logo.png # Restaurant logo
├── package.json
├── .env                  # Configuration (create this)
├── SETUP_GUIDE.md        # Detailed setup instructions
└── README.md             # This file
```

## Default Credentials

**⚠️ CHANGE IMMEDIATELY AFTER FIRST LOGIN**

- Email: `admin@bellevue.com`
- Password: `admin123`

## Tech Stack

- **Backend**: Node.js + Express
- **Auth**: JWT + bcrypt
- **Storage**: File system + JSON
- **Frontend**: ES5 JavaScript (no ES6 features)
- **PDF Rendering**: PDF.js 2.6 (legacy version)

## Browser Support

- ✅ Safari iOS 9+
- ✅ Safari iOS 10+
- ✅ Modern browsers (Chrome, Firefox, Safari desktop)
- ❌ Internet Explorer (not tested)

## Hosting Requirements

- **Node.js**: 14+
- **RAM**: 2GB minimum
- **Storage**: 5GB minimum
- **OS**: Linux/Ubuntu recommended

## Cost

- **Server**: $5-7/month
- **Domain**: ~$12/year (optional)
- **SSL**: FREE (Let's Encrypt)

**Total: $6-7/month**

## Update Strategy

- **No auto-refresh** (saves resources)
- **Manual refresh** by staff after uploads (2 min for 15 iPads)
- Can add daily auto-refresh at 6 AM if needed

## Security

- JWT authentication
- bcrypt password hashing
- File upload validation
- CORS enabled
- HTTPS recommended

## Support

See `SETUP_GUIDE.md` for:
- Detailed installation steps
- Troubleshooting
- Daily usage guide
- Maintenance tasks

## License

Created for Hotel Bellevue by Paperella Automations  
January 2026

## Version

**1.0.0** - Initial release for legacy iOS devices
