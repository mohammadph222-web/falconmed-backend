# FalconMed Elite Backend v1.0.0

Professional pharmacy management system backend with real-time monitoring and automated alerts.

## 🚀 Features

- **Real-time Data Reception** - Queue Machine sends data instantly
- **Live Monitoring** - Immediate dashboard updates
- **Automated Alerts** - Email notifications when thresholds exceeded
- **Analytics** - Daily metrics and performance tracking
- **Multi-branch Support** - All branches in one system
- **PostgreSQL Database** - Neon for scalability

## 📋 Requirements

- Node.js 16+
- npm or yarn
- Neon PostgreSQL account (free tier available)
- Gmail account (for email alerts)

## 🛠️ Installation

### 1. Clone & Install

```bash
cd falconmed-backend
npm install
```

### 2. Setup Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
# Database (from Neon)
DATABASE_URL=postgresql://user:password@pg-xxxxx.neon.tech/falconmed?sslmode=require

# Email Service
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# General Manager Email
GENERAL_MANAGER_EMAIL=coo@falconmed.com

# Server
PORT=5000
NODE_ENV=development
```

### 3. Get Gmail App Password

1. Enable 2FA on Gmail
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate App Password for Mail
4. Use this password in `.env`

### 4. Create Neon Database

1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string to `.env`

### 5. Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:5000`

## 📡 API Endpoints

### Queue Machine Integration

**POST** `/api/transactions/receive`

Queue Machine sends data in this format:

```json
{
  "pharmacist_id": "ph_001",
  "branch_id": "br_001",
  "patient_identified": true,
  "waiting_time_minutes": 3.5,
  "service_time_minutes": 3.2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction recorded",
  "alert_triggered": false
}
```

### Dashboard Data

**GET** `/api/dashboard/metrics?branch_id=br_001&date=2026-08-30`

Get today's metrics for a branch.

**GET** `/api/dashboard/pharmacist/:pharmacist_id?date=2026-08-30`

Get individual pharmacist performance.

**GET** `/api/dashboard/branches?date=2026-08-30`

Compare all branches.

**GET** `/api/dashboard/top-performers?branch_id=br_001&limit=5`

Get top 5 performers.

**GET** `/api/dashboard/hourly/:branch_id?date=2026-08-30`

Hourly distribution data.

**GET** `/api/dashboard/live-status`

Real-time status of all branches.

### Alert History

**GET** `/api/transactions/alerts?branch_id=br_001&limit=20`

Get recent alerts.

## ⚠️ Alert System

### Trigger Conditions

- **Waiting Time > 5 minutes** → Alert sent
- Recipients: Branch Manager + General Manager
- Email includes: Branch, Pharmacist, Waiting Time, Actions

### Alert Recipients

Each branch has a manager email:
- Main Branch: manager1@falconmed.com
- Dusit Branch: manager2@falconmed.com
- Ruwi Branch: manager3@falconmed.com
- Qurum Branch: manager4@falconmed.com
- Seeb Branch: manager5@falconmed.com

Plus: General Manager at coo@falconmed.com

## 📊 Database Schema

### Branches
- id, name, manager_email, created_at

### Pharmacists
- id, name, branch_id, email, status, created_at

### Transactions (Live)
- id, pharmacist_id, branch_id, patient_identified
- waiting_time_minutes, service_time_minutes
- waiting_time_alert, alert_sent_at, created_at

### Daily Metrics
- id, branch_id, pharmacist_id, metric_date
- total_patients, identified_patients, unidentified_patients
- avg_service_time, avg_waiting_time, serve_rate, no_show_rate

### Alerts Log
- id, pharmacist_id, branch_id, alert_type
- message, waiting_time, sent_to_emails, created_at

## 🚀 Deploy to Render

### 1. Connect GitHub

- Push project to GitHub
- Sign in to Render.com
- Create new Web Service
- Connect GitHub repository

### 2. Set Environment Variables

In Render dashboard:
- Add all `.env` variables
- Especially DATABASE_URL and EMAIL credentials

### 3. Deploy

- Click Deploy
- Render will install dependencies and start server
- Get production URL

### 4. Update Frontend

In React dashboard, change API base URL:
```javascript
const API_URL = 'https://your-render-app.onrender.com'
```

## 🧪 Testing

### Test Email Configuration

```bash
node -e "
import { testEmailConfiguration } from './src/services/emailService.js';
testEmailConfiguration().then(r => console.log('✅ Email configured:', r));
"
```

### Test Queue Machine Integration

```bash
curl -X POST http://localhost:5000/api/transactions/receive \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacist_id": "ph_001",
    "branch_id": "br_001",
    "patient_identified": true,
    "waiting_time_minutes": 6.5,
    "service_time_minutes": 3.2
  }'
```

## 📈 Monitoring

Monitor your backend:
- Check Render dashboard for logs
- Monitor Neon database usage
- Track email sending via Gmail

## 🔒 Security

- Use environment variables for secrets
- Never commit `.env`
- Use HTTPS in production
- Validate all incoming data
- Rate limiting recommended

## 📞 Support

For issues:
1. Check `.env` configuration
2. Verify database connection
3. Test email service
4. Check Render logs

## 🎯 Next Steps

1. ✅ Deploy Backend to Render
2. ✅ Connect Frontend to Backend
3. ✅ Configure Queue Machine to send data
4. ✅ Test end-to-end flow
5. ✅ Monitor live data

---

**FalconMed Elite Backend v1.0.0**
Professional Pharmacy Management System
