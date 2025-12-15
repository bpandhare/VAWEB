import { useMemo, useState } from 'react'
import './OnboardingForm.css'
import { useAuth } from './AuthContext'

/* ---------- DEFAULT PAYLOAD ---------- */
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
    supportRequired: 'no',
    supportProblem: '',
    supportStart: '',
    supportEnd: '',
    supportEngineer: '',
    supportContact: '',
    engineerRemark: '',
    inchargeRemark: '',
  }
}

/* ---------- TEXTAREA FIELDS ---------- */
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
  const [formData, setFormData] = useState(defaultPayload())
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)

  const endpoint = useMemo(
    () => import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/activity',
    []
  )

  /* ---------- NORMAL INPUT HANDLER ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => {
      // If support = NO → clear dependent fields
      if (name === 'supportRequired' && value === 'no') {
        return {
          ...prev,
          supportRequired: 'no',
          supportProblem: '',
          supportStart: '',
          supportEnd: '',
          supportEngineer: '',
          supportContact: '',
        }
      }

      return { ...prev, [name]: value }
    })
  }

  /* ---------- DIGIT-ONLY CONTACT HANDLER ---------- */
  const handleContactChange = (e) => {
    const value = e.target.value

    // Allow only digits (0–9), max 10
    if (/^\d{0,10}$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        supportContact: value,
      }))
    }
  }

  /* ---------- SUBMIT ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setAlert(null)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Unable to save entry')

      setAlert({ type: 'success', message: 'Entry saved successfully' })
      setFormData(defaultPayload())
    } catch (err) {
      setAlert({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="vh-form-shell">
      <header className="vh-form-header">
        <h2>Employee Onboarding Log</h2>
        <p>Capture today’s ground reality</p>
      </header>

      {alert && (
        <div className={`vh-alert ${alert.type}`}>
          {alert.message}
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
              value={formData.projectName}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            <span>Problem start time</span>
            <input
              type="time"
              name="problemStart"
              value={formData.problemStart}
              onChange={handleChange}
            />
          </label>

          <label>
            <span>Problem end time</span>
            <input
              type="time"
              name="problemEnd"
              value={formData.problemEnd}
              onChange={handleChange}
            />
          </label>

          {/* SUPPORT REQUIRED */}
          <label>
            <span>Online support required?</span>
            <select
              name="supportRequired"
              value={formData.supportRequired}
              onChange={handleChange}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>

          <label>
            <span>Support start time</span>
            <input
              type="time"
              name="supportStart"
              value={formData.supportStart}
              onChange={handleChange}
              disabled={formData.supportRequired === 'no'}
            />
          </label>

          <label>
            <span>Support end time</span>
            <input
              type="time"
              name="supportEnd"
              value={formData.supportEnd}
              onChange={handleChange}
              disabled={formData.supportRequired === 'no'}
            />
          </label>

          {/* CONDITIONAL FIELDS */}
          {formData.supportRequired === 'yes' && (
            <>
              <label>
                <span>Support engineer name</span>
                <input
                  type="text"
                  name="supportEngineer"
                  value={formData.supportEngineer}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span>Support engineer contact</span>
                <input
                  type="text"
                  name="supportContact"
                  value={formData.supportContact}
                  onChange={handleContactChange}
                  maxLength={10}
                  placeholder="10-digit number"
                  required
                />
              </label>
            </>
          )}
        </div>

        {textAreas.map((field) => (
          <label key={field.name} className="vh-span-2">
            <span>{field.label}</span>
            <textarea
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              rows={3}
            />
          </label>
        ))}

        <div className="vh-form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Submit'}
          </button>

          <button
            type="button"
            className="ghost"
            onClick={() => setFormData(defaultPayload())}
            disabled={submitting}
          >
            Reset
          </button>
        </div>
      </form>
    </section>
  )
}

export default OnboardingForm
