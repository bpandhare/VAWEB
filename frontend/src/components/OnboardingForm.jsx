import { useMemo, useState } from 'react'
import './OnboardingForm.css'
import { useAuth } from './AuthContext'

const defaultPayload = () => {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toISOString().slice(11, 16)

  return {
    logDate: date,
    logTime: time,
    projectName: '',
    dailyTarget: '',
    hourlyActivity: '',
    problemsFaced: '',
    resolutionStatus: '',
    problemStart: '',
    problemEnd: '',
    supportProblem: '',
    supportStart: '',
    supportEnd: '',
    supportEngineer: '',
    engineerRemark: '',
    inchargeRemark: '',
  }
}

const textAreas = [
  { name: 'dailyTarget', label: 'Daily target planned by site engineer' },
  { name: 'hourlyActivity', label: 'Hourly activity' },
  { name: 'problemsFaced', label: 'Problems faced by engineer' },
  { name: 'resolutionStatus', label: 'Problem resolved or not & how' },
  { name: 'supportProblem', label: 'Online support required for which problem' },
  { name: 'engineerRemark', label: 'Engineer remarks' },
  { name: 'inchargeRemark', label: 'Project in-charge remarks' },
]

function OnboardingForm() {
  const { token } = useAuth()
  const [formData, setFormData] = useState(defaultPayload)
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)

  const endpoint = useMemo(
    () => import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/activity',
    []
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setAlert(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Unable to save entry. Please retry.')
      }

      setAlert({ type: 'success', message: 'Entry saved. Stay safe on site!' })
      setFormData(defaultPayload())
    } catch (error) {
      setAlert({ type: 'error', message: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="vh-form-shell">
      <header className="vh-form-header">
        <div>
          <p className="vh-form-label">Employee onboarding log</p>
          <h2>Capture today’s ground reality</h2>
          <p>
            Every submission creates a signed record in MySQL with timestamps,
            so project leadership can respond faster.
          </p>
        </div>
        <div className="vh-stats">
          <div>
            <span>Next sync</span>
            <strong>Top of the hour</strong>
          </div>
          <div>
            <span>Database</span>
            <strong>Vickhardth Ops</strong>
          </div>
        </div>
      </header>

      {alert && (
        <div className={`vh-alert ${alert.type}`}>
          <p>{alert.message}</p>
        </div>
      )}

      <form className="vh-form" onSubmit={handleSubmit}>
        <div className="vh-grid">
          <label>
            <span>Date</span>
            <input
              type="date"
              name="logDate"
              value={formData.logDate}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            <span>Time</span>
            <input
              type="time"
              name="logTime"
              value={formData.logTime}
              onChange={handleChange}
              required
            />
          </label>

          <label className="vh-span-2">
            <span>Project name / project no.</span>
            <input
              type="text"
              name="projectName"
              placeholder="Eg. VH-Metro Phase 2 / VH-OPS-0215"
              value={formData.projectName}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            <span>Problem occur start time</span>
            <input
              type="time"
              name="problemStart"
              value={formData.problemStart}
              onChange={handleChange}
            />
          </label>

          <label>
            <span>Problem resolved end time</span>
            <input
              type="time"
              name="problemEnd"
              value={formData.problemEnd}
              onChange={handleChange}
            />
          </label>

          <label>
            <span>Online support start time</span>
            <input
              type="time"
              name="supportStart"
              value={formData.supportStart}
              onChange={handleChange}
            />
          </label>

          <label>
            <span>Online support end time</span>
            <input
              type="time"
              name="supportEnd"
              value={formData.supportEnd}
              onChange={handleChange}
            />
          </label>

          <label>
            <span>Engineer name providing online support</span>
            <input
              type="text"
              name="supportEngineer"
              placeholder="Name & designation"
              value={formData.supportEngineer}
              onChange={handleChange}
            />
          </label>
        </div>

        {textAreas.map((field) => (
          <label key={field.name} className="vh-span-2">
            <span>{field.label}</span>
            <textarea
              name={field.name}
              rows={field.name === 'hourlyActivity' ? 4 : 3}
              value={formData[field.name]}
              onChange={handleChange}
              placeholder="Describe briefly..."
            />
          </label>
        ))}

        <div className="vh-form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Submit log'}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => setFormData(defaultPayload())}
            disabled={submitting}
          >
            Reset form
          </button>
        </div>
      </form>
    </section>
  )
}

export default OnboardingForm

