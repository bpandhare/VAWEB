import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// GET route to fetch daily target reports for auto-filling hourly reports
router.get('/daily-targets/:date', async (req, res) => {
  try {
    const { date } = req.params

    
    const [rows] = await pool.execute(
      `SELECT id, project_no, daily_target_planned, report_date, site_start_date
       FROM daily_target_reports
       WHERE DATE(report_date) = ?
       ORDER BY created_at DESC`,
      [date]
    )

    res.json(rows)
  } catch (error) {
    console.error('Failed to fetch daily target reports', error)
    res.status(500).json({ message: 'Unable to fetch daily target reports' })
  }
})

// GET route to fetch existing hourly reports for a date
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params

    const [rows] = await pool.execute(
      `SELECT * FROM hourly_reports
       WHERE report_date = ?
       ORDER BY time_period`,
      [date]
    )

    res.json(rows)
  } catch (error) {
    console.error('Failed to fetch hourly reports', error)
    res.status(500).json({ message: 'Unable to fetch hourly reports' })
  }
})

router.post('/', async (req, res) => {
  try {
    const {
      reportDate,
      timePeriod,
      projectName,
      dailyTarget,
      hourlyActivity,
      problemFacedByEngineerHourly,
      problemResolvedOrNot,
      problemOccurStartTime,
      problemResolvedEndTime,
      onlineSupportRequiredForWhichProblem,
      onlineSupportTime,
      onlineSupportEndTime,
      engineerNameWhoGivesOnlineSupport,
      engineerRemark,
      projectInchargeRemark
    } = req.body

    // Validate required fields
    if (!reportDate || !timePeriod || !projectName || !dailyTarget || !hourlyActivity) {
      return res.status(400).json({
        message: 'Date, time period, project name, daily target, and hourly activity are required'
      })
    }

    const [result] = await pool.execute(
      `INSERT INTO hourly_reports 
       (report_date, time_period, project_name, daily_target, hourly_activity,
        problem_faced_by_engineer_hourly, problem_resolved_or_not, problem_occur_start_time,
        problem_resolved_end_time, online_support_required_for_which_problem,
        online_support_time, online_support_end_time, engineer_name_who_gives_online_support,
        engineer_remark, project_incharge_remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportDate,
        timePeriod,
        projectName,
        dailyTarget,
        hourlyActivity,
        problemFacedByEngineerHourly || null,
        problemResolvedOrNot || null,
        problemOccurStartTime || null,
        problemResolvedEndTime || null,
        onlineSupportRequiredForWhichProblem || null,
        onlineSupportTime || null,
        onlineSupportEndTime || null,
        engineerNameWhoGivesOnlineSupport || null,
        engineerRemark || null,
        projectInchargeRemark || null
      ]
    )

    res.status(201).json({ 
      message: 'Hourly report saved successfully',
      id: result.insertId 
    })
  } catch (error) {
    console.error('Failed to save hourly report', error)
    res.status(500).json({ message: 'Unable to save hourly report' })
  }
})

// PUT route to update existing hourly reports
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    console.log('PUT hourly report request body:', req.body)
    const {
      reportDate,
      timePeriod,
      projectName,
      dailyTarget,
      hourlyActivity,
      problemFacedByEngineerHourly,
      problemResolvedOrNot,
      problemOccurStartTime,
      problemResolvedEndTime,
      onlineSupportRequiredForWhichProblem,
      onlineSupportTime,
      onlineSupportEndTime,
      engineerNameWhoGivesOnlineSupport,
      engineerRemark,
      projectInchargeRemark
    } = req.body

    // Validate required fields
    if (!reportDate || !timePeriod || !projectName || !dailyTarget || !hourlyActivity) {
      return res.status(400).json({
        message: 'Date, time period, project name, daily target, and hourly activity are required'
      })
    }

    const [result] = await pool.execute(
      `UPDATE hourly_reports SET
       report_date = ?, time_period = ?, project_name = ?, daily_target = ?,
       hourly_activity = ?, problem_faced_by_engineer_hourly = ?,
       problem_resolved_or_not = ?, problem_occur_start_time = ?,
       problem_resolved_end_time = ?, online_support_required_for_which_problem = ?,
       online_support_time = ?, online_support_end_time = ?,
       engineer_name_who_gives_online_support = ?, engineer_remark = ?,
       project_incharge_remark = ?
       WHERE id = ?`,
      [
        reportDate,
        timePeriod,
        projectName,
        dailyTarget,
        hourlyActivity,
        problemFacedByEngineerHourly || null,
        problemResolvedOrNot || null,
        problemOccurStartTime || null,
        problemResolvedEndTime || null,
        onlineSupportRequiredForWhichProblem || null,
        onlineSupportTime || null,
        onlineSupportEndTime || null,
        engineerNameWhoGivesOnlineSupport || null,
        engineerRemark || null,
        projectInchargeRemark || null,
        id
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Hourly report not found' })
    }

    res.status(200).json({
      message: 'Hourly report updated successfully',
      id: parseInt(id)
    })
  } catch (error) {
    console.error('Failed to update hourly report', error)
    res.status(500).json({ message: 'Unable to update hourly report' })
  }
})

export default router

