import { Router } from 'express'
import pool from '../db.js'

const router = Router()

const requiredFields = ['logDate', 'logTime', 'projectName']

const insertSql = `
  INSERT INTO site_activity (
    log_date, log_time, project_name, daily_target, hourly_activity,
    problems_faced, resolution_status, problem_start, problem_end,
    support_problem, support_start, support_end, support_engineer,
    engineer_remark, incharge_remark, created_at
  )
  VALUES (
    :logDate, :logTime, :projectName, :dailyTarget, :hourlyActivity,
    :problemsFaced, :resolutionStatus, :problemStart, :problemEnd,
    :supportProblem, :supportStart, :supportEnd, :supportEngineer,
    :engineerRemark, :inchargeRemark, NOW()
  )
`

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, project_name AS projectName, log_date AS logDate,
              log_time AS logTime, daily_target AS dailyTarget,
              hourly_activity AS hourlyActivity, problems_faced AS problemsFaced,
              resolution_status AS resolutionStatus, support_engineer AS supportEngineer,
              created_at AS createdAt
         FROM site_activity
        ORDER BY created_at DESC
        LIMIT 20`
    )
    res.json(rows)
  } catch (error) {
    console.error('Failed to fetch entries', error)
    res.status(500).json({ message: 'Unable to fetch entries' })
  }
})

router.post('/', async (req, res) => {
  try {
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(422).json({ message: `${field} is required` })
      }
    }

    const payload = {
      dailyTarget: '',
      hourlyActivity: '',
      problemsFaced: '',
      resolutionStatus: '',
      problemStart: null,
      problemEnd: null,
      supportProblem: '',
      supportStart: null,
      supportEnd: null,
      supportEngineer: '',
      engineerRemark: '',
      inchargeRemark: '',
      ...req.body,
    }

    await pool.execute(insertSql, payload)

    res.status(201).json({ message: 'Entry recorded' })
  } catch (error) {
    console.error('Failed to insert entry', error)
    res.status(500).json({ message: 'Unable to save entry' })
  }
})

export default router

