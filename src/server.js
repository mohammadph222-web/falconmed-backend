import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.js';
import transactionRoutes from './routes/transactions.js';
import dashboardRoutes from './routes/dashboard.js';
import queueRoutes from './routes/queue.js';
import branchRoutes from './routes/branches.js';
import networkRoutes from './routes/network.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://falconmed.app', 'https://...'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'FalconMed Elite Backend',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health: 'GET /',
      queue_machine: 'POST /api/transactions/receive',
      queue: {
        patient_arrival: 'POST /api/queue/patient-arrival',
        patient_called: 'POST /api/queue/patient-called',
        patient_finish: 'POST /api/queue/patient-finish',
        stats: 'GET /api/queue/stats',
        live_patients: 'GET /api/queue/live-patients'
      },
      dashboard: {
        metrics: 'GET /api/dashboard/metrics?branch_id=br_001',
        pharmacist: 'GET /api/dashboard/pharmacist/:pharmacist_id',
        branches: 'GET /api/dashboard/branches',
        top_performers: 'GET /api/dashboard/top-performers',
        hourly: 'GET /api/dashboard/hourly/:branch_id',
        live_status: 'GET /api/dashboard/live-status'
      },
      manager_dashboard: {
        branch_stats: 'GET /api/branches/:id/stats',
        branch_performers: 'GET /api/branches/:id/performers',
        branch_hourly: 'GET /api/branches/:id/hourly',
        branch_alerts: 'GET /api/branches/:id/alerts'
      },
      admin_dashboard: {
        network_stats: 'GET /api/network/stats',
        network_branches: 'GET /api/network/branches',
        network_trends: 'GET /api/network/trends',
        network_staff: 'GET /api/network/staff'
      }
    }
  });
});

// API Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/network', networkRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized');

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   FalconMed Elite Backend v1.0.0      ║
║   Server Running on Port ${PORT}          ║
╚════════════════════════════════════════╝

📝 Endpoints:
  ✅ Queue Machine: POST /api/transactions/receive
  ✅ Queue:
    - Patient Arrival: POST /api/queue/patient-arrival
    - Patient Called: POST /api/queue/patient-called
    - Patient Finish: POST /api/queue/patient-finish
    - Queue Stats: GET /api/queue/stats
    - Live Patients: GET /api/queue/live-patients
  ✅ Dashboard:     GET /api/dashboard/*
  ✅ Live Status:   GET /api/dashboard/live-status
  
  ✨ NEW Manager Endpoints:
    - Branch Stats: GET /api/branches/:id/stats
    - Performers: GET /api/branches/:id/performers
    - Hourly: GET /api/branches/:id/hourly
    - Alerts: GET /api/branches/:id/alerts
    
  ✨ NEW Admin Endpoints:
    - Network Stats: GET /api/network/stats
    - All Branches: GET /api/network/branches
    - Trends: GET /api/network/trends
    - Staff: GET /api/network/staff
  
🚀 Ready for connections...
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
