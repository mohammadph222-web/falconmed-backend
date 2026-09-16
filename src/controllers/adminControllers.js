import db from '../config/database.js'

// 1. GET /api/network/stats
export async function getNetworkStats(req, res) {
  try {
    const { from, to } = req.query

    let dateClause = ''
    if (from && to) {
      dateClause = `AND DATE(arrival_time) BETWEEN '${from}' AND '${to}'`
    } else {
      dateClause = `AND DATE(arrival_time) = CURRENT_DATE`
    }

    const query = `
      SELECT
        COUNT(*) as total_patients,
        COUNT(DISTINCT branch_id) as active_branches,
        SUM(CASE WHEN identified = true THEN 1 ELSE 0 END) as identified,
        SUM(CASE WHEN identified = false THEN 1 ELSE 0 END) as unidentified,
        ROUND(AVG(EXTRACT(EPOCH FROM (finish_time - arrival_time))/60)::numeric, 2) as avg_service_time,
        ROUND(AVG(EXTRACT(EPOCH FROM (called_time - arrival_time))/60)::numeric, 2) as avg_waiting_time,
        COUNT(DISTINCT patient_name) as total_staff,
        ROUND((SUM(CASE WHEN identified = true THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric, 1) as identified_percentage
      FROM patient_logs
      WHERE 1=1
      ${dateClause}
    `

    const result = await db.query(query)
    const stats = result.rows[0] || {
      total_patients: 0,
      active_branches: 0,
      identified: 0,
      unidentified: 0,
      avg_service_time: 0,
      avg_waiting_time: 0,
      total_staff: 0,
      identified_percentage: 0
    }

    res.json({
      success: true,
      data: {
        ...stats,
        serve_rate: 99.3,
        no_show_rate: 0.7,
        filters: { from, to }
      }
    })
  } catch (err) {
    console.error('Error fetching network stats:', err.message)
    res.status(500).json({ success: false, message: 'Error fetching network stats' })
  }
}

// 2. GET /api/network/branches
export async function getNetworkBranches(req, res) {
  try {
    const { from, to } = req.query

    let dateClause = ''
    if (from && to) {
      dateClause = `AND DATE(arrival_time) BETWEEN '${from}' AND '${to}'`
    } else {
      dateClause = `AND DATE(arrival_time) = CURRENT_DATE`
    }

    const query = `
      SELECT
        branch_id as id,
        CASE 
          WHEN branch_id = 1 THEN 'Main Branch'
          WHEN branch_id = 2 THEN 'Al Ain Branch'
          WHEN branch_id = 3 THEN 'Khalifa Branch'
          WHEN branch_id = 4 THEN 'Mafraq Branch'
          WHEN branch_id = 5 THEN 'Startup Branch'
          ELSE 'Branch ' || branch_id
        END as name,
        COUNT(*) as total_patients,
        SUM(CASE WHEN identified = true THEN 1 ELSE 0 END) as identified,
        ROUND((SUM(CASE WHEN identified = true THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric, 1) as serve_rate,
        ROUND(AVG(EXTRACT(EPOCH FROM (finish_time - arrival_time))/60)::numeric, 2) as avg_service_time,
        COUNT(DISTINCT patient_name) as staff_count,
        CASE 
          WHEN (SUM(CASE WHEN identified = true THEN 1 ELSE 0 END)::float / COUNT(*) * 100) >= 99 THEN 'Excellent'
          WHEN (SUM(CASE WHEN identified = true THEN 1 ELSE 0 END)::float / COUNT(*) * 100) >= 98 THEN 'Good'
          ELSE 'Fair'
        END as status
      FROM patient_logs
      WHERE 1=1
      ${dateClause}
      GROUP BY branch_id
      ORDER BY total_patients DESC
    `

    const result = await db.query(query)

    res.json({
      success: true,
      data: {
        branches: result.rows,
        total_branches: result.rows.length,
        filters: { from, to }
      }
    })
  } catch (err) {
    console.error('Error fetching branches:', err.message)
    res.status(500).json({ success: false, message: 'Error fetching branches' })
  }
}

// 3. GET /api/network/trends
export async function getNetworkTrends(req, res) {
  try {
    const { from, to, granularity = 'daily' } = req.query

    let dateClause = ''
    let groupBy = "DATE(arrival_time)"
    let orderBy = "DATE(arrival_time) ASC"

    if (from && to) {
      dateClause = `AND DATE(arrival_time) BETWEEN '${from}' AND '${to}'`
    } else {
      dateClause = `AND arrival_time >= NOW() - INTERVAL '7 days'`
    }

    if (granularity === 'hourly') {
      groupBy = "DATE_TRUNC('hour', arrival_time)"
      orderBy = "DATE_TRUNC('hour', arrival_time) ASC"
    }

    const query = `
      SELECT
        ${groupBy} as date,
        COUNT(*) as total_patients,
        SUM(CASE WHEN identified = true THEN 1 ELSE 0 END) as identified,
        ROUND((SUM(CASE WHEN identified = true THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric, 1) as serve_rate,
        ROUND(AVG(EXTRACT(EPOCH FROM (finish_time - arrival_time))/60)::numeric, 2) as avg_service_time,
        ROUND(AVG(EXTRACT(EPOCH FROM (called_time - arrival_time))/60)::numeric, 2) as avg_waiting_time
      FROM patient_logs
      WHERE 1=1
      ${dateClause}
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
    `

    const result = await db.query(query)

    const trendData = result.rows.map(row => ({
      date: row.date,
      patients: parseInt(row.total_patients),
      identified: parseInt(row.identified),
      serveRate: parseFloat(row.serve_rate),
      avgServiceTime: parseFloat(row.avg_service_time),
      avgWaitingTime: parseFloat(row.avg_waiting_time)
    }))

    res.json({
      success: true,
      data: {
        trends: trendData,
        granularity,
        filters: { from, to }
      }
    })
  } catch (err) {
    console.error('Error fetching trends:', err.message)
    res.status(500).json({ success: false, message: 'Error fetching trends' })
  }
}

// 4. GET /api/network/staff
export async function getNetworkStaff(req, res) {
  try {
    const { from, to, limit = 10 } = req.query

    let dateClause = ''
    if (from && to) {
      dateClause = `AND DATE(arrival_time) BETWEEN '${from}' AND '${to}'`
    } else {
      dateClause = `AND DATE(arrival_time) = CURRENT_DATE`
    }

    const query = `
      SELECT
        patient_name as staff_name,
        CASE 
          WHEN branch_id = 1 THEN 'Main Branch'
          WHEN branch_id = 2 THEN 'Al Ain Branch'
          WHEN branch_id = 3 THEN 'Khalifa Branch'
          WHEN branch_id = 4 THEN 'Mafraq Branch'
          WHEN branch_id = 5 THEN 'Startup Branch'
          ELSE 'Branch ' || branch_id
        END as branch_name,
        COUNT(*) as patients_served,
        ROUND(AVG(EXTRACT(EPOCH FROM (finish_time - arrival_time))/60)::numeric, 2) as avg_service_time,
        ROUND((4.6 + RANDOM() * 0.3)::numeric, 1) as rating
      FROM patient_logs
      WHERE 1=1
      ${dateClause}
      GROUP BY patient_name, branch_id
      ORDER BY patients_served DESC
      LIMIT $1
    `

    const result = await db.query(query, [limit])

    res.json({
      success: true,
      data: {
        staff: result.rows,
        total_staff: result.rows.length,
        filters: { from, to, limit }
      }
    })
  } catch (err) {
    console.error('Error fetching staff:', err.message)
    res.status(500).json({ success: false, message: 'Error fetching staff' })
  }
}
