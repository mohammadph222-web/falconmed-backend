import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Database Schema Initialization
export async function initializeDatabase() {
  try {
    // Branches Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        manager_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Pharmacists Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pharmacists (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
        email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Patient Logs Table (للـ Queue Management)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patient_logs (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(50),
        patient_name VARCHAR(255) NOT NULL,
        branch_id INTEGER,
        service_type VARCHAR(100),
        arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        called_time TIMESTAMP,
        finish_time TIMESTAMP,
        identified BOOLEAN DEFAULT false,
        waiting_time_minutes DECIMAL(5,2),
        service_time_minutes DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Transactions Table (Live Data)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacist_id VARCHAR(50) NOT NULL REFERENCES pharmacists(id),
        branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
        patient_identified BOOLEAN DEFAULT true,
        waiting_time_minutes DECIMAL(5,2),
        service_time_minutes DECIMAL(5,2),
        waiting_time_alert BOOLEAN DEFAULT false,
        alert_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Daily Metrics Table (Analytics)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
        pharmacist_id VARCHAR(50),
        metric_date DATE,
        total_patients INTEGER DEFAULT 0,
        identified_patients INTEGER DEFAULT 0,
        unidentified_patients INTEGER DEFAULT 0,
        avg_service_time DECIMAL(5,2),
        avg_waiting_time DECIMAL(5,2),
        serve_rate DECIMAL(5,2),
        no_show_rate DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(branch_id, pharmacist_id, metric_date)
      );
    `);

    // Alerts Log Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacist_id VARCHAR(50) NOT NULL REFERENCES pharmacists(id),
        branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
        alert_type VARCHAR(50),
        message TEXT,
        waiting_time DECIMAL(5,2),
        sent_to_emails TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial data
    await seedInitialData();

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

async function seedInitialData() {
  try {
    // ✅ DELETE ALL OLD DATA FIRST
    console.log('🗑️ Clearing old data...');
    await pool.query('DELETE FROM alerts WHERE 1=1');
    await pool.query('DELETE FROM transactions WHERE 1=1');
    await pool.query('DELETE FROM daily_metrics WHERE 1=1');
    await pool.query('DELETE FROM patient_logs WHERE 1=1');
    await pool.query('DELETE FROM pharmacists WHERE 1=1');
    await pool.query('DELETE FROM branches WHERE 1=1');
    console.log('✅ Old data cleared');

    const branches = [
      { id: 'br_001', name: 'Main Branch', manager_email: 'manager1@falconmed.com' },
      { id: 'br_002', name: 'Dusit Branch', manager_email: 'manager2@falconmed.com' },
      { id: 'br_003', name: 'Ruwi Branch', manager_email: 'manager3@falconmed.com' },
      { id: 'br_004', name: 'Qurum Branch', manager_email: 'manager4@falconmed.com' },
      { id: 'br_005', name: 'Seeb Branch', manager_email: 'manager5@falconmed.com' }
    ];

    for (const branch of branches) {
      await pool.query(
        'INSERT INTO branches (id, name, manager_email) VALUES ($1, $2, $3)',
        [branch.id, branch.name, branch.manager_email]
      );
    }

    // Seed pharmacists
    const pharmacists = [
      { id: 'ph_001', name: 'LAMA AL-REMIT', branch_id: 'br_001', email: 'lama@falconmed.com' },
      { id: 'ph_002', name: 'Hana Bin Eldin', branch_id: 'br_001', email: 'hana@falconmed.com' },
      { id: 'ph_003', name: 'Alia Hoot', branch_id: 'br_002', email: 'alia@falconmed.com' },
      { id: 'ph_004', name: 'شيماء عبد الله', branch_id: 'br_002', email: 'shimaaa@falconmed.com' },
      { id: 'ph_005', name: 'Mohammed Al-Kaabi', branch_id: 'br_001', email: 'mohammed@falconmed.com' }
    ];

    for (const pharmacist of pharmacists) {
      await pool.query(
        'INSERT INTO pharmacists (id, name, branch_id, email) VALUES ($1, $2, $3, $4)',
        [pharmacist.id, pharmacist.name, pharmacist.branch_id, pharmacist.email]
      );
    }

    // ✅ Seed Patient Logs (للـ Dashboard) - TODAY'S DATE!
    const now = new Date();
    const arrivalTime = new Date(now.getTime());  // ✅ الآن بالضبط (اليوم الحالي)
    const calledTime = new Date(arrivalTime.getTime() + 2 * 60000);
    const finishTime = new Date(calledTime.getTime() + 18 * 60000);

    await pool.query(`
      INSERT INTO patient_logs (patient_id, patient_name, branch_id, service_type, arrival_time, called_time, finish_time, identified)
      VALUES 
        ('P001', 'أحمد علي محمد', 1, 'pharmacy', $1, $2, $3, true),
        ('P002', 'فاطمة محمد علي', 1, 'pharmacy', $1, $2, $3, true),
        ('P003', 'محمد حسن خليفة', 1, 'pharmacy', $1, $2, $3, false),
        ('P004', 'سارة خالد عمر', 1, 'pharmacy', $1, $2, $3, true),
        ('P005', 'علي محمود أحمد', 1, 'pharmacy', $1, $2, $3, true),
        ('P006', 'نور الدين سالم', 1, 'pharmacy', $1, $2, $3, false),
        ('P007', 'زينب أحمد الشامسية', 1, 'pharmacy', $1, $2, $3, true),
        ('P008', 'خالد عبدالله محمد', 1, 'pharmacy', $1, $2, $3, true),
        ('P009', 'أم هانية حمد', 1, 'pharmacy', $1, $2, $3, false),
        ('P010', 'سيف علي ناصر', 1, 'pharmacy', $1, $2, $3, true),
        ('P011', 'منار حسين الشامسية', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P012', 'ياسر محمد علي', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P013', 'ليلى خالد محمد', 1, 'pharmacy', $1, NULL, NULL, false),
        ('P014', 'سامي عمر سليم', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P015', 'رشا أحمد علي', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P016', 'حمد ناصر محمود', 1, 'pharmacy', $1, NULL, NULL, false),
        ('P017', 'أسيل علي أحمد', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P018', 'فهد محمد سالم', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P019', 'جميلة حمد علي', 1, 'pharmacy', $1, NULL, NULL, false),
        ('P020', 'خليل عبدالله محمد', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P021', 'مريم علي ناصر', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P022', 'محمود حسن أحمد', 1, 'pharmacy', $1, NULL, NULL, false),
        ('P023', 'سالمة محمد علي', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P024', 'نادر خالد محمود', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P025', 'هناء أحمد عمر', 1, 'pharmacy', $1, NULL, NULL, false),
        ('P026', 'جمعة علي سالم', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P027', 'لينة محمد خالد', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P028', 'إبراهيم حسن محمد', 1, 'pharmacy', $1, NULL, NULL, false),
        ('P029', 'رانية علي أحمد', 1, 'pharmacy', $1, NULL, NULL, true),
        ('P030', 'عبدالرحمن محمود علي', 1, 'pharmacy', $1, NULL, NULL, true)
    `, [arrivalTime, calledTime, finishTime]);

    // ✅ Seed Daily Metrics
    await pool.query(`
      INSERT INTO daily_metrics (branch_id, pharmacist_id, metric_date, total_patients, identified_patients, unidentified_patients, avg_service_time, avg_waiting_time, serve_rate, no_show_rate)
      VALUES 
        ('br_001', 'ph_001', CURRENT_DATE, 30, 27, 3, 18.70, 2.30, 90, 0.5),
        ('br_001', 'ph_002', CURRENT_DATE, 28, 25, 3, 17.50, 2.50, 89, 0.7),
        ('br_002', 'ph_003', CURRENT_DATE, 32, 29, 3, 19.20, 2.80, 91, 0.6),
        ('br_002', 'ph_004', CURRENT_DATE, 26, 23, 3, 16.80, 2.10, 88, 0.4),
        ('br_001', 'ph_005', CURRENT_DATE, 24, 22, 2, 17.00, 2.40, 92, 0.3)
    `);

    console.log('✅ Initial data seeded successfully - 30 patients added!');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

export default pool;
