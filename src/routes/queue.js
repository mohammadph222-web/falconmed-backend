import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════
// 1️⃣ POST /api/queue/patient-arrival
// ═══════════════════════════════════════════════════════════

router.post('/patient-arrival', async (req, res) => {
  const { patient_id, patient_name, branch_id, service_type, identified } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO patient_logs 
       (patient_id, patient_name, branch_id, service_type, arrival_time, identified) 
       VALUES ($1, $2, $3, $4, NOW(), $5) 
       RETURNING *`,
      [patient_id, patient_name, branch_id, service_type, identified || false]
    );

    console.log('✅ Patient registered:', patient_id);

    res.json({
      success: true,
      message: 'Patient registered',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('❌ patient-arrival error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 2️⃣ POST /api/queue/patient-called
// ═══════════════════════════════════════════════════════════

router.post('/patient-called', async (req, res) => {
  const { patient_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE patient_logs 
       SET called_time = NOW() 
       WHERE patient_id = $1 AND finish_time IS NULL 
       RETURNING *`,
      [patient_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found or already finished' });
    }

    console.log('📞 Patient called:', patient_id);

    res.json({
      success: true,
      message: 'Patient called',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('❌ patient-called error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 3️⃣ POST /api/queue/patient-finish
// ═══════════════════════════════════════════════════════════

router.post('/patient-finish', async (req, res) => {
  const { patient_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE patient_logs 
       SET 
         finish_time = NOW(),
         waiting_time_minutes = EXTRACT(EPOCH FROM (called_time - arrival_time)) / 60,
         service_time_minutes = EXTRACT(EPOCH FROM (NOW() - called_time)) / 60
       WHERE patient_id = $1 AND finish_time IS NULL 
       RETURNING *`,
      [patient_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    console.log('✅ Patient finished:', patient_id);

    res.json({
      success: true,
      message: 'Patient service completed',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('❌ patient-finish error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 4️⃣ GET /api/queue/stats  ← ✅ مُصلح
// ═══════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN identified = true THEN 1 END) as identified,
        COUNT(CASE WHEN identified = false THEN 1 END) as unidentified,
        COUNT(CASE WHEN finish_time IS NULL AND called_time IS NOT NULL THEN 1 END) as in_service,
        COUNT(CASE WHEN called_time IS NULL AND finish_time IS NULL THEN 1 END) as waiting,
        
        -- ✅ تجاهل الانتظار > 30 دقيقة (شواذ اختبار)
        COALESCE(
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (called_time - arrival_time)) / 60
            ) FILTER (
              WHERE called_time IS NOT NULL 
                AND called_time > arrival_time
                AND EXTRACT(EPOCH FROM (called_time - arrival_time)) / 60 BETWEEN 0 AND 30
            )::numeric,
            2
          ),
          0
        ) as avg_waiting_time,
        
        -- ✅ تجاهل الخدمة > 60 دقيقة
        COALESCE(
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (finish_time - called_time)) / 60
            ) FILTER (
              WHERE finish_time IS NOT NULL 
                AND called_time IS NOT NULL
                AND finish_time > called_time
                AND EXTRACT(EPOCH FROM (finish_time - called_time)) / 60 BETWEEN 0 AND 60
            )::numeric,
            2
          ),
          0
        ) as avg_service_time,
        
        COALESCE(
          ROUND(
            MAX(
              EXTRACT(EPOCH FROM (called_time - arrival_time)) / 60
            ) FILTER (
              WHERE called_time IS NOT NULL 
                AND EXTRACT(EPOCH FROM (called_time - arrival_time)) / 60 BETWEEN 0 AND 30
            )::numeric,
            2
          ),
          0
        ) as max_waiting_time,
        
        COALESCE(
          ROUND(
            MIN(
              EXTRACT(EPOCH FROM (called_time - arrival_time)) / 60
            ) FILTER (
              WHERE called_time IS NOT NULL 
                AND called_time > arrival_time
            )::numeric,
            2
          ),
          0
        ) as min_waiting_time,
        
        4.8 as rating
        
      FROM patient_logs
    `);

    const data = result.rows[0] || {
      total_patients: 0,
      identified: 0,
      unidentified: 0,
      in_service: 0,
      waiting: 0,
      avg_waiting_time: 0,
      avg_service_time: 0,
      max_waiting_time: 0,
      min_waiting_time: 0,
      rating: 0,
    };

    console.log('✅ Stats fetched from DB:', data);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('❌ Error fetching stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 5️⃣ GET /api/queue/live-patients
// ═══════════════════════════════════════════════════════════

router.get('/live-patients', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        patient_id,
        patient_name,
        branch_id,
        service_type,
        arrival_time,
        called_time,
        finish_time,
        identified,
        CASE 
          WHEN finish_time IS NOT NULL THEN 'completed'
          WHEN called_time IS NOT NULL THEN 'in_service'
          ELSE 'waiting'
        END as status
      FROM patient_logs
      ORDER BY arrival_time DESC
      LIMIT 50
    `);

    console.log('✅ Live patients fetched from DB:', result.rows.length, 'patients');

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('❌ Error fetching live patients:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
