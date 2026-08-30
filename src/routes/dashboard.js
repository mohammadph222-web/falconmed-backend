import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET: Dashboard metrics for a branch
router.get('/metrics', async (req, res) => {
  try {
    const branch_id = req.query.branch_id || 'br_001';
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Get today's metrics
    const metricsResult = await pool.query(
      `SELECT * FROM daily_metrics 
       WHERE branch_id = $1 AND metric_date = $2`,
      [branch_id, date]
    );

    const metrics = metricsResult.rows[0] || {
      total_patients: 0,
      identified_patients: 0,
      unidentified_patients: 0,
      avg_service_time: 0,
      avg_waiting_time: 0,
      serve_rate: 0
    };

    res.json({
      success: true,
      metrics,
      date
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Pharmacist performance
router.get('/pharmacist/:pharmacist_id', async (req, res) => {
  try {
    const pharmacist_id = req.params.pharmacist_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Get pharmacist info
    const pharmacistResult = await pool.query(
      'SELECT * FROM pharmacists WHERE id = $1',
      [pharmacist_id]
    );
    const pharmacist = pharmacistResult.rows[0];

    if (!pharmacist) {
      return res.status(404).json({ error: 'Pharmacist not found' });
    }

    // Get today's transactions for this pharmacist
    const transactionsResult = await pool.query(
      `SELECT * FROM transactions 
       WHERE pharmacist_id = $1 AND DATE(created_at) = $2`,
      [pharmacist_id, date]
    );

    const transactions = transactionsResult.rows;

    // Calculate metrics
    const metrics = {
      name: pharmacist.name,
      total_patients: transactions.length,
      identified_patients: transactions.filter(t => t.patient_identified).length,
      unidentified_patients: transactions.filter(t => !t.patient_identified).length,
      avg_service_time: transactions.length > 0
        ? (transactions.reduce((sum, t) => sum + (t.service_time_minutes || 0), 0) / transactions.length).toFixed(2)
        : 0,
      avg_waiting_time: transactions.length > 0
        ? (transactions.reduce((sum, t) => sum + (t.waiting_time_minutes || 0), 0) / transactions.length).toFixed(2)
        : 0,
      alerts_triggered: transactions.filter(t => t.waiting_time_alert).length
    };

    res.json({
      success: true,
      pharmacist: metrics,
      date
    });
  } catch (error) {
    console.error('Pharmacist metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: All branches comparison
router.get('/branches', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT b.*, 
              COUNT(t.id) as total_transactions,
              SUM(CASE WHEN t.patient_identified = true THEN 1 ELSE 0 END) as identified,
              SUM(CASE WHEN t.patient_identified = false THEN 1 ELSE 0 END) as unidentified,
              AVG(t.service_time_minutes)::numeric(5,2) as avg_service_time,
              AVG(t.waiting_time_minutes)::numeric(5,2) as avg_waiting_time,
              COUNT(CASE WHEN t.waiting_time_alert = true THEN 1 END) as alerts_count
       FROM branches b
       LEFT JOIN transactions t ON b.id = t.branch_id AND DATE(t.created_at) = $1
       GROUP BY b.id
       ORDER BY total_transactions DESC`,
      [date]
    );

    res.json({
      success: true,
      branches: result.rows,
      date
    });
  } catch (error) {
    console.error('Branches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Top performers
router.get('/top-performers', async (req, res) => {
  try {
    const branch_id = req.query.branch_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const limit = req.query.limit || 5;

    let query = `
      SELECT p.id, p.name, p.branch_id,
             COUNT(t.id) as total_patients,
             AVG(t.service_time_minutes)::numeric(5,2) as avg_service_time,
             AVG(t.waiting_time_minutes)::numeric(5,2) as avg_waiting_time,
             COUNT(CASE WHEN t.waiting_time_alert = true THEN 1 END) as alerts_count
      FROM pharmacists p
      LEFT JOIN transactions t ON p.id = t.pharmacist_id AND DATE(t.created_at) = $1
    `;

    let params = [date];

    if (branch_id) {
      query += ' WHERE p.branch_id = $2';
      params.push(branch_id);
      query += ` GROUP BY p.id ORDER BY total_patients DESC LIMIT $3`;
      params.push(limit);
    } else {
      query += ` GROUP BY p.id ORDER BY total_patients DESC LIMIT $2`;
      params.push(limit);
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      performers: result.rows,
      date
    });
  } catch (error) {
    console.error('Top performers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Hourly distribution
router.get('/hourly/:branch_id', async (req, res) => {
  try {
    const branch_id = req.params.branch_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        DATE_PART('hour', created_at)::integer as hour,
        COUNT(*) as total_patients,
        SUM(CASE WHEN patient_identified = true THEN 1 ELSE 0 END) as identified,
        AVG(waiting_time_minutes)::numeric(5,2) as avg_waiting_time,
        AVG(service_time_minutes)::numeric(5,2) as avg_service_time
       FROM transactions
       WHERE branch_id = $1 AND DATE(created_at) = $2
       GROUP BY hour
       ORDER BY hour`,
      [branch_id, date]
    );

    res.json({
      success: true,
      hourly_data: result.rows,
      branch_id,
      date
    });
  } catch (error) {
    console.error('Hourly data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Live status
router.get('/live-status', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        b.id, b.name,
        COUNT(t.id) as today_transactions,
        SUM(CASE WHEN t.patient_identified = true THEN 1 ELSE 0 END) as identified,
        AVG(t.waiting_time_minutes)::numeric(5,2) as avg_waiting_time,
        COUNT(CASE WHEN t.waiting_time_alert = true THEN 1 END) as alerts_today
       FROM branches b
       LEFT JOIN transactions t ON b.id = t.branch_id AND DATE(t.created_at) = CURRENT_DATE
       GROUP BY b.id
       ORDER BY b.name`
    );

    res.json({
      success: true,
      live_status: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Live status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
