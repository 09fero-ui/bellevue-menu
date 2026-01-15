# Bellevue Legacy Menu System - Setup Guide

## For iOS 9+ Safari Compatibility

---

## What You Have

A complete restaurant menu system that works on **old iPads (iOS 9+)** natively in Safari.

**Features:**
- ✅ Upload PDFs (4 languages × 4 menu types)
- ✅ Manager authentication
- ✅ Enable/disable menus
- ✅ Auto-delete old PDFs
- ✅ Works on iOS 9-10 Safari
- ✅ No Puffin needed
- ❌ No auto-refresh (manual refresh by staff)

---

## Requirements

### Server Requirements:
- **Node.js** 14+ 
- **2GB RAM** minimum
- **5GB storage** minimum
- **Linux/Ubuntu** recommended

### Hosting Options:
1. **DigitalOcean Droplet** ($6/month) ⭐ RECOMMENDED
2. **Render.com** (Free tier or $7/month)
3. **Hostinger VPS** ($5/month)
4. **AWS Lightsail** ($5/month)

---

## Installation Steps

### 1. Get a Server

**Option A: DigitalOcean (Recommended)**

1. Go to https://digitalocean.com
2. Create account
3. Create **Droplet**:
   - Image: **Ubuntu 22.04**
   - Plan: **Basic $6/month**
   - Region: Europe (closest to Switzerland)
   - SSH Key: Add your key or use password
4. Note the **IP address** (e.g., `123.45.67.89`)

**Option B: Render.com (Easier)**

1. Go to https://render.com
2. Create account
3. Click **"New +" → "Web Service"**
4. Connect GitHub (we'll do this after you upload code)

---

### 2. Upload Code to Server

#### If Using DigitalOcean:

**Connect to server:**
```bash
ssh root@YOUR_IP_ADDRESS
```

**Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
node --version  # Should show v18.x
```

**Upload your code:**

Option A - Using SCP from your computer:
```bash
scp -r bellevue-legacy root@YOUR_IP_ADDRESS:/root/
```

Option B - Clone from GitHub (if you uploaded there):
```bash
cd /root
git clone YOUR_GITHUB_REPO bellevue-legacy
```

Option C - Manual upload using FileZilla/Cyberduck

**Install dependencies:**
```bash
cd /root/bellevue-legacy
npm install
```

---

### 3. Configure Environment

**Create `.env` file:**
```bash
nano .env
```

**Add this content:**
```
PORT=3000
NODE_ENV=production
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_AT_LEAST_32_CHARS
```

**Press Ctrl+X, Y, Enter to save**

**Generate random secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy that output and replace `JWT_SECRET` value.

---

### 4. Setup Firewall

**Allow HTTP/HTTPS traffic:**
```bash
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS
ufw allow 3000    # Node.js app
ufw enable
```

---

### 5. Install PM2 (Process Manager)

**PM2 keeps your app running 24/7:**
```bash
npm install -g pm2
```

**Start the app:**
```bash
cd /root/bellevue-legacy
pm2 start server/index.js --name bellevue-menu
pm2 save
pm2 startup
```

**Copy and run the command PM2 shows you.**

---

### 6. Setup Nginx (Reverse Proxy)

**Install Nginx:**
```bash
apt-get install -y nginx
```

**Create config:**
```bash
nano /etc/nginx/sites-available/bellevue-menu
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Replace `YOUR_DOMAIN_OR_IP` with your actual domain or IP**

**Enable site:**
```bash
ln -s /etc/nginx/sites-available/bellevue-menu /etc/nginx/sites-enabled/
nginx -t  # Test config
systemctl restart nginx
```

---

### 7. Setup SSL (Optional but Recommended)

**If you have a domain name:**

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

Follow prompts. It auto-configures HTTPS.

---

### 8. Upload Logo

**Copy your Bellevue logo:**
```bash
scp bellevue-logo.png root@YOUR_IP:/root/bellevue-legacy/public/
```

Or upload via FileZilla to `/root/bellevue-legacy/public/`

---

### 9. Test the System

**Open browser:**
- Guest menu: `http://YOUR_IP` or `http://yourdomain.com`
- Manager: `http://YOUR_IP/manager.html`

**Default login:**
- Email: `admin@bellevue.com`
- Password: `admin123`

**⚠️ CHANGE THIS PASSWORD IMMEDIATELY!**

---

## Changing Password

**On server:**
```bash
cd /root/bellevue-legacy
node
```

**In Node console:**
```javascript
const bcrypt = require('bcrypt');
const fs = require('fs');

// Generate new password hash
const newPassword = 'YOUR_NEW_PASSWORD';
const hash = bcrypt.hashSync(newPassword, 10);

// Update users.json
const users = {
    admin: {
        email: 'admin@bellevue.com',
        password: hash
    }
};

fs.writeFileSync('server/data/users.json', JSON.stringify(users, null, 2));
console.log('Password changed!');
process.exit();
```

**Press Ctrl+D to exit Node**

---

## Daily Usage

### Manager Workflow:

1. **Go to** `http://yourdomain.com/manager.html`
2. **Login** with credentials
3. **Select menu type** (Daily, Main, Wine, Beverages)
4. **Select language tab**
5. **Choose PDF file**
6. **Click Upload**
7. **Toggle menu ON** if needed

### Staff Workflow:

**After manager uploads new menu:**

1. Go to each iPad
2. **Refresh Safari page** (pull down to refresh)
3. New menu appears
4. Takes 2 minutes for 15 iPads

**OR use this trick:**
- Set iPad home screen to reload when reopened
- Close and reopen menu app
- Automatic refresh

---

## Monitoring & Maintenance

### Check if app is running:
```bash
pm2 status
pm2 logs bellevue-menu
```

### Restart app:
```bash
pm2 restart bellevue-menu
```

### View logs:
```bash
pm2 logs bellevue-menu --lines 100
```

### Check disk space:
```bash
df -h
```

### Backup data:
```bash
cd /root/bellevue-legacy/server
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/
```

---

## Troubleshooting

### Problem: Can't access website

**Check if app is running:**
```bash
pm2 status
```

**Check Nginx:**
```bash
systemctl status nginx
```

**Check firewall:**
```bash
ufw status
```

### Problem: Upload fails

**Check file size** (max 10MB)
**Check disk space:**
```bash
df -h
```

**Check permissions:**
```bash
chmod -R 755 /root/bellevue-legacy/server/uploads
```

### Problem: Old iPad shows error

**Check iOS version:**
- Settings → General → About → Version

**Must be iOS 9.0+**

**Try:**
1. Clear Safari cache
2. Hard refresh (hold refresh button)
3. Close and reopen Safari

---

## Cost Breakdown

**Monthly costs:**
- Server: $6 (DigitalOcean) or $7 (Render)
- Domain: $12/year (~$1/month) - OPTIONAL
- SSL: FREE (Let's Encrypt)

**Total: $6-7/month**

---

## Updating the System

**To update code in future:**

```bash
cd /root/bellevue-legacy
git pull  # If using git
# OR upload new files via SCP
npm install  # If dependencies changed
pm2 restart bellevue-menu
```

---

## Security Best Practices

1. **Change default password immediately**
2. **Use strong password** (16+ characters)
3. **Setup SSL/HTTPS** if using domain
4. **Keep server updated:**
   ```bash
   apt-get update
   apt-get upgrade
   ```
5. **Regular backups** (weekly recommended)
6. **Monitor logs** for suspicious activity

---

## Support

**Common commands:**

```bash
# Check app status
pm2 status

# View logs
pm2 logs bellevue-menu

# Restart app
pm2 restart bellevue-menu

# Stop app
pm2 stop bellevue-menu

# Start app
pm2 start bellevue-menu
```

---

## Next Steps After Setup

1. ✅ Change default password
2. ✅ Upload Bellevue logo
3. ✅ Test upload on one menu
4. ✅ Test on one old iPad
5. ✅ Upload all menus (4 types × 4 languages)
6. ✅ Train staff on refresh procedure
7. ✅ Deploy to all 15 iPads

---

**You're done! System is ready for production.**

**Questions? Contact: Paperella Automations**
