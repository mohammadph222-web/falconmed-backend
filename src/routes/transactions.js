import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { sendWaitingTimeAlert } from '../services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// POST: Queue Machine sends transaction data
router.post('/receive', async (req, res) => {
  try {
    const {
      pharmacist_id,
      branch_id,
      patient_identified,
      waiting_time_minutes,
      service_time_minutes
    } = req.body;

    // Validate required fields
    if (!pharmacist_id || !branch_id) {
      return res.status(400).json({ error: 'pharmacist_id and branch_id required' });
    }

    // Insert transaction
    const transactionId = uuidv4();
    let waitingTimeAlert = false;

    // Check if waiting time exceeds threshold (5 minutes)
    if (waiting_time_minutes > 5) {
      waitingTimeAlert = true;
    }

    const result = await pool.query(
      `INSERT INTO transactions (
        id, pharmacist_id, branch_id, patient_identified, 
        waiting_time_minutes, service_time_minutes, waiting_time_alert
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        transactionId,
        pharmacist_id,
        branch_id,
        patient_identified,
        waiting_time_minutes,
        service_time_minutes,
        waitingTimeAlert
      ]
    );

    const transaction = result.rows[0];

    // Send alert if waiting time exceeds threshold
    if (waitingTimeAlert) {
      try {
        // Get pharmacist info
        const pharmacistResult = await pool.query(
          'SELECT * FROM pharmacists WHERE id = $1',
          [pharmacist_id]
        );
        const pharmacist = pharmacistResult.rows[0];

        // Get branch info
        const branchResult = await pool.query(
          'SELECT * FROM branches WHERE id = $1',
          [branch_id]
        );
        const branch = branchResult.rows[0];

        // Prepare recipients: Branch Manager + General Manager
        const recipients = [
          branch.manager_email,
          process.env.GENERAL_MANAGER_EMAIL
        ].filter(Boolean);

        // Send alert email
        await sendWaitingTimeAlert(pharmacist, branch, waiting_time_minutes, recipients);

        // Log alert
        await pool.query(
          `INSERT INTO alerts (pharmacist_id, branch_id, alert_type, message, waiting_time, sent_to_emails)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            pharmacist_id,
            branch_id,
            'WAITING_TIME',
            `Waiting time exceeded threshold: ${waiting_time_minutes} minutes`,
            waiting_time_minutes,
            recipients
          ]
        );

        // Mark alert as sent
        await pool.query(
          'UPDATE transactions SET alert_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
          [transactionId]
        );
      } catch (emailError) {
        console.error('Alert sending error:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Transaction recorded',
      transaction,
      alert_triggered: waitingTimeAlert
    });

  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Recent transactions for live dashboard
router.get('/recent', async (req, res) => {
  try {
    const branch_id = req.query.branch_id || 'br_001';
    const limit = req.query.limit || 50;

    const result = await pool.query(
      `SELECT t.*, p.name as pharmacist_name, b.name as branch_name
       FROM transactions t
       JOIN pharmacists p ON t.pharmacist_id = p.id
       JOIN branches b ON t.branch_id = b.id
       WHERE t.branch_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2`,
      [branch_id, limit]
    );

    res.json({
      success: true,
      count: result.rows.length,
      transactions: result.rows
    });
  } catch (error) {
    console.error('Recent transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Alert history
router.get('/alerts', async (req, res) => {
  try {
    const branch_id = req.query.branch_id;
    const limit = req.query.limit || 20;

    let query = 'SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1';
    let params = [limit];

    if (branch_id) {
      query = 'SELECT * FROM alerts WHERE branch_id = $1 ORDER BY created_at DESC LIMIT $2';
      params = [branch_id, limit];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: End of day - calculate metrics
router.post('/calculate-daily-metrics', async (req, res) => {
  try {
    const { date, branch_id } = req.body;

    if (!date || !branch_id) {
      return res.status(400).json({ error: 'date and branch_id required' });
    }

    // Get all transactions for the day and branch
    const transactionsResult = await pool.query(
      `SELECT * FROM transactions 
       WHERE branch_id = $1 
       AND DATE(created_at) = $2`,
      [branch_id, date]
    );

    const transactions = transactionsResult.rows;

    if (transactions.length === 0) {
      return res.json({ success: false, message: 'No transactions found' });
    }

    // Calculate metrics
    const identified = transactions.filter(t => t.patient_identified).length;
    const unidentified = transactions.length - identified;
    const avgServiceTime = (
      transactions.reduce((sum, t) => sum + (t.service_time_minutes || 0), 0) /
      transactions.length
    ).toFixed(2);
    const avgWaitingTime = (
      transactions.reduce((sum, t) => sum + (t.waiting_time_minutes || 0), 0) /
      transactions.length
    ).toFixed(2);
    const serveRate = ((identified / transactions.length) * 100).toFixed(1);

    // Insert into daily_metrics
    await pool.query(
      `INSERT INTO daily_metrics (
        branch_id, metric_date, total_patients, identified_patients, 
        unidentified_patients, avg_service_time, avg_waiting_time, serve_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (branch_id, metric_date) DO UPDATE SET
        total_patients = $3,
        identified_patients = $4,
        unidentified_patients = $5,
        avg_service_time = $6,
        avg_waiting_time = $7,
        serve_rate = $8`,
      [
        branch_id,
        date,
        transactions.length,
        identified,
        unidentified,
        avgServiceTime,
        avgWaitingTime,
        serveRate
      ]
    );

    res.json({
      success: true,
      message: 'Daily metrics calculated',
      metrics: {
        total_patients: transactions.length,
        identified_patients: identified,
        unidentified_patients: unidentified,
        avg_service_time: avgServiceTime,
        avg_waiting_time: avgWaitingTime,
        serve_rate: serveRate
      }
    });
  } catch (error) {
    console.error('Calculate metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
