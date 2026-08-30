# Deploy FalconMed Backend to Render

Complete step-by-step guide to deploy on Render (free).

## 📋 Prerequisites

1. GitHub account with repository
2. Render account (free at render.com)
3. Neon PostgreSQL account (free at neon.tech)
4. Gmail account with App Password

## 🚀 Step 1: Prepare GitHub Repository

### Push code to GitHub

```bash
# Initialize git (if not already)
git init

# Add files
git add .

# Commit
git commit -m "Initial commit: FalconMed Backend"

# Add remote (replace with your repo)
git remote add origin https://github.com/YOUR_USERNAME/falconmed-backend.git

# Push
git branch -M main
git push -u origin main
```

## 🌐 Step 2: Create Neon Database

1. Go to [neon.tech](https://neon.tech)
2. Sign up (free)
3. Create new project: "falconmed"
4. Copy connection string:
   ```
   postgresql://username:password@pg-xxxxx.neon.tech/falconmed?sslmode=require
   ```

## 🚀 Step 3: Deploy on Render

### 1. Create Web Service

- Go to [render.com](https://render.com)
- Click "New +" → "Web Service"
- Connect GitHub repository
- Select branch: `main`

### 2. Configure Service

**Name:** `falconmed-backend`

**Environment:** `Node`

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

### 3. Set Environment Variables

Click "Add Environment Variable" for each:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string |
| `EMAIL_SERVICE` | `gmail` |
| `EMAIL_USER` | your-email@gmail.com |
| `EMAIL_PASSWORD` | Gmail App Password |
| `GENERAL_MANAGER_EMAIL` | coo@falconmed.com |
| `PORT` | `5000` |
| `NODE_ENV` | `production` |

### 4. Select Plan

- **Free Plan**: Good for testing
- Click "Create Web Service"

### 5. Deploy

- Render will automatically deploy
- Watch logs to ensure success
- Get your URL (e.g., `https://falconmed-backend.onrender.com`)

## ✅ Verify Deployment

### Test Health Check

```bash
curl https://falconmed-backend.onrender.com
```

Should return:
```json
{
  "message": "FalconMed Elite Backend",
  "status": "Running"
}
```

### Test Queue Machine Endpoint

```bash
curl -X POST https://falconmed-backend.onrender.com/api/transactions/receive \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacist_id": "ph_001",
    "branch_id": "br_001",
    "patient_identified": true,
    "waiting_time_minutes": 6.5,
    "service_time_minutes": 3.2
  }'
```

### Test Dashboard Endpoint

```bash
curl https://falconmed-backend.onrender.com/api/dashboard/metrics?branch_id=br_001
```

## 🔗 Update Frontend

In your React dashboard (`falconmed-elite/`), update API calls:

```javascript
// src/pages/Dashboard.jsx or components
const API_URL = 'https://falconmed-backend.onrender.com'

// Example API call
fetch(`${API_URL}/api/dashboard/metrics?branch_id=br_001`)
  .then(res => res.json())
  .then(data => setMetrics(data))
```

## 🔌 Configure Queue Machine

Tell Queue Machine to send data to:

```
POST https://falconmed-backend.onrender.com/api/transactions/receive
```

With JSON payload:
```json
{
  "pharmacist_id": "ph_001",
  "branch_id": "br_001",
  "patient_identified": true,
  "waiting_time_minutes": 3.5,
  "service_time_minutes": 3.2
}
```

## 📊 Monitor Deployment

### Render Dashboard

- Click your service
- View "Logs" tab
- Monitor requests and errors

### Database Monitoring

- Go to Neon console
- View query analytics
- Monitor connection count

## 🐛 Troubleshooting

### Build Failed

**Error:** `Cannot find module`

**Fix:** 
```bash
# Delete node_modules locally
rm -rf node_modules
npm install
git add .
git commit -m "Update dependencies"
git push
```

### Database Connection Failed

**Error:** `Cannot connect to database`

**Fix:**
1. Verify DATABASE_URL in Render env vars
2. Check Neon database is active
3. Ensure IP whitelist allows all (Neon default)

### Email Not Sending

**Error:** `Email authentication failed`

**Fix:**
1. Verify Gmail App Password (not regular password)
2. Enable 2FA on Gmail account
3. Generate new App Password
4. Update EMAIL_PASSWORD in Render

### Alerts Not Triggering

**Error:** `Alert not sent when waiting time > 5`

**Fix:**
1. Check email configuration
2. Test with POST request:
   ```bash
   curl -X POST https://falconmed-backend.onrender.com/api/transactions/receive \
     -H "Content-Type: application/json" \
     -d '{
       "pharmacist_id": "ph_001",
       "branch_id": "br_001",
       "patient_identified": true,
       "waiting_time_minutes": 6.5,
       "service_time_minutes": 3.2
     }'
   ```
3. Check Render logs for errors

## 💰 Cost (Free Tier)

- **Render Web Service**: Free (with 15 min inactivity cooldown)
- **Neon Database**: Free 5GB
- **Gmail**: Free

**Total Cost**: $0

## 🚀 Production Tips

1. **Upgrade Plan** when going live (paid plan removes inactivity limit)
2. **Monitor Logs** regularly
3. **Backup Database** (Neon provides automatic backups)
4. **Set Up Alerts** on Render for errors
5. **Test Email** weekly

## 📝 Next Steps

1. ✅ Push code to GitHub
2. ✅ Create Neon database
3. ✅ Deploy on Render
4. ✅ Update Frontend API URL
5. ✅ Configure Queue Machine
6. ✅ Test end-to-end

---

**Backend successfully deployed!** 🎉

Your Queue Machine can now send data and receive real-time alerts.
