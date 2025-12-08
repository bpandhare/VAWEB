import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET ?? 'vickhardth-site-pulse-secret'
const TOKEN_TTL_SECONDS = 60 * 60 * 8 // 8 hours

router.post('/register', async (req, res) => {
  try {
    const { username, password, dob, role, managerId } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' })
    }

    if (!dob) {
      return res.status(400).json({ message: 'Date of birth is required' })
    }

    // Validate DOB is a valid date and must be before today (no future DOBs)
    const dobDate = new Date(dob)
    if (Number.isNaN(dobDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date of birth' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dobDate >= today) {
      return res
        .status(400)
        .json({ message: 'Date of birth must be before today (no future dates)' })
    }

    if (!role) {
      return res.status(400).json({ message: 'Role is required' })
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [
      username,
    ])
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username already exists' })
    }

    // Validate manager exists if managerId provided
    if (managerId) {
      const [manager] = await pool.execute('SELECT id FROM users WHERE id = ?', [managerId])
      if (manager.length === 0) {
        return res.status(400).json({ message: 'Manager not found' })
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash, dob, role, manager_id) VALUES (?, ?, ?, ?, ?)',
      [username, passwordHash, dob, role, managerId || null]
    )

    const userId = result.insertId
    const token = jwt.sign({ id: userId, username, role }, JWT_SECRET, {
      expiresIn: TOKEN_TTL_SECONDS,
    })

    res.status(201).json({ token, username, role })
  } catch (error) {
    console.error('Failed to register user', error)
    res.status(500).json({ message: 'Unable to register user' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' })
    }

    const [rows] = await pool.execute('SELECT id, password_hash FROM users WHERE username = ?', [
      username,
    ])

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    const user = rows[0]
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    // Fetch user's role
    const [userWithRole] = await pool.execute('SELECT id, username, role FROM users WHERE id = ?', [
      user.id,
    ])
    const userRole = userWithRole[0]?.role

    const token = jwt.sign({ id: user.id, username, role: userRole }, JWT_SECRET, {
      expiresIn: TOKEN_TTL_SECONDS,
    })

    res.json({ token, username, role: userRole })
  } catch (error) {
    console.error('Failed to login', error)
    res.status(500).json({ message: 'Unable to login' })
  }
})

export default router


