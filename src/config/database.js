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
    // Check if branches already exist
    const result = await pool.query('SELECT COUNT(*) FROM branches');
    if (result.rows[0].count > 0) return;

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

    console.log('✅ Initial data seeded');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

export default pool;
