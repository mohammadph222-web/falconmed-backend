# FalconMed Elite API Documentation

**API Base URL:** `https://falconmed-backend.onrender.com`  
**Version:** 3.0.1  
**Last Updated:** September 13, 2026

---

## 📌 Authentication

Currently uses demo authentication (localStorage-based).

Future versions will implement:
- JWT tokens
- OAuth 2.0
- Role-based access control (RBAC)

---

## 🔄 Queue Management API

### 1. Get Queue Statistics
```
GET /api/queue/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_patients": 30,
    "identified": 21,
    "unidentified": 9,
    "in_service": 20,
    "waiting": 20,
    "avg_waiting_time": 2.00,
    "avg_service_time": 18.00,
    "rating": 4.8
  }
}
```

---

### 2. Get Live Patients
```
GET /api/queue/live-patients
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "patient_id": "P001",
      "patient_name": "أحمد علي",
      "service_type": "pharmacy",
      "arrival_time": "2026-09-13T06:49:55Z",
      "called_time": "2026-09-13T06:51:55Z",
      "finish_time": "2026-09-13T07:09:55Z",
      "identified": true,
      "waiting_time_minutes": 2.0,
      "service_time_minutes": 18.0
    }
  ]
}
```

---

### 3. Register Patient Arrival
```
POST /api/queue/patient-arrival
```

**Request Body:**
```json
{
  "patient_id": "P031",
  "patient_name": "نور محمد",
  "branch_id": 1,
  "service_type": "pharmacy"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient registered",
  "data": { "id": 31, "patient_id": "P031" }
}
```

---

### 4. Mark Patient as Called
```
POST /api/queue/patient-called
```

**Request Body:**
```json
{
  "patient_id": "P001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient marked as called"
}
```

---

### 5. Mark Patient as Finished
```
POST /api/queue/patient-finish
```

**Request Body:**
```json
{
  "patient_id": "P001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient service completed"
}
```

---

## 📊 Dashboard API

### 1. Get Personal Metrics
```
GET /api/dashboard/metrics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today_patients": 30,
    "identified_rate": 70,
    "avg_service_time": 18.0,
    "avg_waiting_time": 2.0,
    "performance_score": 87.7
  }
}
```

---

### 2. Get Branch Data
```
GET /api/dashboard/branch/:branch_id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "branch_id": "br_001",
    "name": "Main Branch",
    "total_patients": 30,
    "staff_count": 5,
    "metrics": { /* ... */ }
  }
}
```

---

### 3. Get All Branches
```
GET /api/dashboard/branches
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "br_001",
      "name": "Main Branch",
      "total_patients": 30,
      "identified": 21
    },
    {
      "id": "br_002",
      "name": "Dusit Branch",
      "total_patients": 28,
      "identified": 25
    }
  ]
}
```

---

### 4. Get Top Performers
```
GET /api/dashboard/top_performers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "pharmacist_id": "ph_001",
      "name": "LAMA AL-REMIT",
      "rank": 1,
      "performance_score": 89.5,
      "patients_served": 30,
      "identified_rate": 90
    }
  ]
}
```

---

### 5. Get Hourly Data
```
GET /api/dashboard/hourly/:branch_id
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "hour": "06:00", "patients": 5, "identified": 4 },
    { "hour": "07:00", "patients": 8, "identified": 6 },
    { "hour": "08:00", "patients": 7, "identified": 5 }
  ]
}
```

---

### 6. Get Live Status
```
GET /api/dashboard/live-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "system_status": "online",
    "database_connection": "active",
    "last_sync": "2026-09-13T06:49:55Z",
    "response_time_ms": 45
  }
}
```

---

## 🔗 Transactions API

### 1. Receive from Queue Machine
```
POST /api/transactions/receive
```

**Request Body:**
```json
{
  "pharmacist_id": "ph_001",
  "branch_id": "br_001",
  "patient_identified": true,
  "waiting_time_minutes": 2.5,
  "service_time_minutes": 18.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction recorded",
  "transaction_id": "uuid-xxx-xxx"
}
```

---

## ❌ Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `NOT_FOUND` - Resource not found (404)
- `INVALID_REQUEST` - Invalid request body (400)
- `DATABASE_ERROR` - Database connection error (500)
- `AUTHENTICATION_FAILED` - Auth error (401)
- `PERMISSION_DENIED` - Insufficient permissions (403)

---

## 🔄 Rate Limiting

Current rate limits (Free tier on Render):
- **Free instance:** May have cold starts (50+ second delays)
- **Recommended:** Upgrade to Render Paid for production use

---

## 📱 Example Usage

### Using JavaScript/Fetch
```javascript
// Get queue stats
async function getQueueStats() {
  try {
    const response = await fetch(
      'https://falconmed-backend.onrender.com/api/queue/stats'
    );
    const data = await response.json();
    console.log(data.data);
  } catch (error) {
    console.error('API Error:', error);
  }
}

// Register patient
async function registerPatient(patientData) {
  const response = await fetch(
    'https://falconmed-backend.onrender.com/api/queue/patient-arrival',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData)
    }
  );
  return await response.json();
}
```

### Using cURL
```bash
# Get stats
curl https://falconmed-backend.onrender.com/api/queue/stats

# Register patient
curl -X POST https://falconmed-backend.onrender.com/api/queue/patient-arrival \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"P031","patient_name":"نور","branch_id":1}'
```

---

## 🐛 Troubleshooting

### API Returns 503 Service Unavailable
- Backend service is on free Render tier
- May have spun down due to inactivity
- Wait 30-60 seconds for cold start
- **Solution:** Upgrade Render to paid tier

### Database Connection Error
- Check DATABASE_URL environment variable
- Verify Neon PostgreSQL credentials
- Check network connectivity
- Restart backend service

### CORS Error in Frontend
- Backend has CORS headers configured
- Check frontend API URL in .env
- Verify domain whitelisting

---

## 📞 Support

- **GitHub Issues:** Report bugs & request features
- **Email:** support@falconmed.com
- **Documentation:** https://github.com/mohammadph222-web/falconmed-backend/wiki

---

**Version:** 3.0.1  
**Last Updated:** September 13, 2026  
**Status:** ✅ Production Ready

