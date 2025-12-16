import { useMemo, useState, useEffect } from 'react'
import './OnboardingForm.css'
import { useAuth } from './AuthContext'

// Format date for backend (ensure YYYY-MM-DD format)
const formatDateForBackend = (dateValue) => {
  if (!dateValue) return new Date().toISOString().slice(0, 10)

  // If it's already a string in YYYY-MM-DD format, return as is
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateValue
  }

  // If it's a Date object or ISO string, extract the date part
  const date = new Date(dateValue)
  return date.toISOString().slice(0, 10)
}

// Generate time periods from 9am to 6pm
const generateTimePeriods = () => {
  const periods = []
  for (let hour = 9; hour < 18; hour++) {
    const startHour = hour > 12 ? hour - 12 : hour
    const endHour = (hour + 1) > 12 ? (hour + 1) - 12 : (hour + 1)
    const startAmpm = hour >= 12 ? 'pm' : 'am'
    const endAmpm = (hour + 1) >= 12 ? 'pm' : 'am'
    periods.push({
      label: `${startHour}${startAmpm}-${endHour}${endAmpm}`,
      startHour: hour,
      endHour: hour + 1
    })
  }
  return periods
}

// Check if current time is within allowed period for a specific hour
const isWithinTimePeriod = (startHour, endHour, currentDate = new Date()) => {
  const now = new Date(currentDate)
  const currentHour = now.getHours()
  const currentMinutes = now.getMinutes()

  // Convert to 24-hour format for comparison
  const periodStart = startHour
  const periodEnd = endHour

  // Check if current time is within the period
  if (currentHour > periodStart && currentHour < periodEnd) return true
  if (currentHour === periodStart && currentMinutes >= 0) return true
  if (currentHour === periodEnd && currentMinutes === 0) return true

  return false
}


const createHourlyEntry = () => ({
  timePeriod: '',
  hourlyActivity: '',
  problemFacedByEngineerHourly: '',
  problemResolvedOrNot: '',
  problemOccurStartTime: '',
  problemResolvedEndTime: '',
  onlineSupportRequiredForWhichProblem: '',
  onlineSupportTime: '',
  onlineSupportEndTime: '',
  engineerNameWhoGivesOnlineSupport: '',
  engineerRemark: '',
  projectInchargeRemark: '',
})

const defaultPayload = () => {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)

  return {
    reportDate: date,
    locationType: '',
    projectName: '',
    dailyTarget: '',
    hourlyEntries: generateTimePeriods().map(period => ({
      ...createHourlyEntry(),
      timePeriod: period.label,
      startHour: period.startHour,
      endHour: period.endHour
    }))
  }
}

function HourlyReportForm() {
  const { token } = useAuth()
  const [formData, setFormData] = useState(defaultPayload)
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)
  const [dailyTargets, setDailyTargets] = useState([])
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [currentActivePeriod, setCurrentActivePeriod] = useState(null)
  const [existingReports, setExistingReports] = useState([])
  const [editingReport, setEditingReport] = useState(null)

  // Function to refresh existing reports
  const refreshExistingReports = async () => {
    try {
      const response = await fetch(`${endpoint}/${formData.reportDate}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (response.ok) {
        const reports = await response.json()
        setExistingReports(reports)
      }
    } catch (error) {
      console.error('Failed to refresh existing reports:', error)
    }
  }

  // Update active period every minute
  useEffect(() => {
    const updateActivePeriod = () => {
      const now = new Date()
      const activePeriod = generateTimePeriods().find(period =>
        isWithinTimePeriod(period.startHour, period.endHour, now)
      )
      setCurrentActivePeriod(activePeriod ? activePeriod.label : null)
    }

    updateActivePeriod()
    const interval = setInterval(updateActivePeriod, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  const endpoint = useMemo(
    () => import.meta.env.VITE_API_URL?.replace('/api/activity', '/api/hourly-report') ?? 'http://localhost:5000/api/hourly-report',
    []
  )

  const dailyTargetsEndpoint = useMemo(
    () => import.meta.env.VITE_API_URL?.replace('/api/activity', '/api/hourly-report/daily-targets') ?? 'http://localhost:5000/api/hourly-report/daily-targets',
    []
  )

  // Auto-fetch daily targets when date changes
  useEffect(() => {
    const fetchDailyTargets = async () => {
      if (!formData.reportDate) return

      setLoadingTargets(true)
      try {
        const response = await fetch(`${dailyTargetsEndpoint}/${formData.reportDate}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (response.ok) {
          const targets = await response.json()
          setDailyTargets(targets)

          // Auto-fill the first available target only if fields are empty
          if (targets.length > 0 && !formData.projectName && !formData.dailyTarget) {
            setFormData(prev => ({
              ...prev,
              projectName: targets[0].project_no,
              dailyTarget: targets[0].daily_target_planned
            }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch daily targets:', error)
      } finally {
        setLoadingTargets(false)
      }
    }

    fetchDailyTargets()

    // Also fetch existing hourly reports for this date
    const fetchExistingReports = async () => {
      try {
        const response = await fetch(`${endpoint}/${formData.reportDate}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (response.ok) {
          const reports = await response.json()
          setExistingReports(reports)
        }
      } catch (error) {
        console.error('Failed to fetch existing reports:', error)
      }
    }

    fetchExistingReports()
  }, [formData.reportDate, dailyTargetsEndpoint, token, formData.projectName, formData.dailyTarget, endpoint])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleHourlyEntryChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      hourlyEntries: prev.hourlyEntries.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    }))
  }

  const handleDailyTargetSelect = (event) => {
    const selectedId = event.target.value
    const selectedTarget = dailyTargets.find(target => target.id.toString() === selectedId)

    if (selectedTarget) {
      setFormData(prev => ({
        ...prev,
        locationType: selectedTarget.location_type || '',
        projectName: selectedTarget.project_no,
        dailyTarget: selectedTarget.daily_target_planned
      }))
    }
  }

  const validateHourlyEntry = (entry) => {
    const errors = []

    // Check if hourly activity is filled
    if (!entry.hourlyActivity.trim()) {
      return errors // Skip validation if no activity entered
    }

    // If problem occurred is Yes, validate related fields
    if (entry.problemResolvedOrNot === 'Yes') {
      if (!entry.problemOccurStartTime) {
        errors.push('Problem occur start time is required when problem occurred')
      }
      if (!entry.problemResolvedEndTime) {
        errors.push('Problem resolved end time is required when problem occurred')
      }
      if (entry.onlineSupportRequiredForWhichProblem && (!entry.onlineSupportTime || !entry.onlineSupportEndTime || !entry.engineerNameWhoGivesOnlineSupport)) {
        errors.push('Online support details are required when support is requested')
      }
    }

    return errors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setAlert(null)

    // No longer require `locationType` per-hour; daily target selection provides location when needed

    try {
      const now = new Date()
      let submittedCount = 0
      const validationErrors = []

      // Validate and submit each hourly entry (only new ones, skip existing)
      const submitPromises = formData.hourlyEntries.map((entry) => {
        // Only submit entries that have hourly activity filled
        if (!entry.hourlyActivity.trim()) return Promise.resolve()

        // Check if this time period already has a report
        const existingReport = existingReports.find(report => report.time_period === entry.timePeriod)
        if (existingReport) {
          validationErrors.push(`${entry.timePeriod}: Report already exists. Use Edit button to update.`)
          return Promise.resolve()
        }

        // Validate time restrictions
        if (!isWithinTimePeriod(entry.startHour, entry.endHour, now)) {
          validationErrors.push(`${entry.timePeriod}: Can only submit reports within the allocated time period`)
          return Promise.resolve()
        }

        // Validate conditional fields
        const entryErrors = validateHourlyEntry(entry)
        if (entryErrors.length > 0) {
          validationErrors.push(`${entry.timePeriod}: ${entryErrors.join(', ')}`)
          return Promise.resolve()
        }

        submittedCount++

        const payload = {
          reportDate: formData.reportDate,
          locationType: formData.locationType,
          timePeriod: entry.timePeriod,
          projectName: formData.projectName,
          dailyTarget: formData.dailyTarget,
          hourlyActivity: entry.hourlyActivity,
          problemFacedByEngineerHourly: entry.problemFacedByEngineerHourly,
          problemResolvedOrNot: entry.problemResolvedOrNot,
          problemOccurStartTime: entry.problemOccurStartTime,
          problemResolvedEndTime: entry.problemResolvedEndTime,
          onlineSupportRequiredForWhichProblem: entry.onlineSupportRequiredForWhichProblem,
          onlineSupportTime: entry.onlineSupportTime,
          onlineSupportEndTime: entry.onlineSupportEndTime,
          engineerNameWhoGivesOnlineSupport: entry.engineerNameWhoGivesOnlineSupport,
          engineerRemark: entry.engineerRemark,
          projectInchargeRemark: entry.projectInchargeRemark
        }

        return fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        })
      })

      // If there are validation errors, don't submit
      if (validationErrors.length > 0) {
        throw new Error(`Validation errors:\n${validationErrors.join('\n')}`)
      }

      const responses = await Promise.all(submitPromises)
      const failedCount = responses.filter(response => response && !response.ok).length

      if (failedCount > 0) {
        throw new Error(`Failed to save ${failedCount} hourly report(s). Please retry.`)
      }

      setAlert({
        type: 'success',
        message: `${submittedCount} hourly report(s) saved successfully!`
      })

      // Refresh existing reports and reset form
      await refreshExistingReports()
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
          <p className="vh-form-label">Hourly Activity Report</p>
          <h2>Log your hourly activities (9am - 6pm)</h2>
          <p>
            Record your activities for each hour of the working day. Project details will be auto-fetched from daily target reports.
          </p>
        </div>
      </header>

      {alert && (
        <div className={`vh-alert ${alert.type}`}>
          <p>{alert.message}</p>
        </div>
      )}

      {/* Display existing hourly reports */}
      {existingReports.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#092544', marginBottom: '1rem' }}>Submitted Hourly Reports</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {existingReports.map((report) => {
              const isEditable = report.time_period === currentActivePeriod || !currentActivePeriod
              return (
                <div
                  key={report.id}
                  style={{
                    border: '1px solid #d5e0f2',
                    borderRadius: '12px',
                    padding: '1rem',
                    background: isEditable ? '#f0f9ff' : '#f9f9f9',
                    opacity: isEditable ? 1 : 0.7
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: '#092544' }}>
                      {report.time_period}
                      {report.time_period === currentActivePeriod && (
                        <span style={{
                          background: '#2ad1ff',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          marginLeft: '0.5rem'
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </h4>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => setEditingReport(report)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#2ad1ff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#4a5972' }}>
                    <p style={{ margin: '0.25rem 0' }}><strong>Location:</strong> {(report.location_type || report.locationType) ? (report.location_type || report.locationType).charAt(0).toUpperCase() + (report.location_type || report.locationType).slice(1) : 'N/A'}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Activity:</strong> {report.hourly_activity}</p>
                    {report.problem_faced_by_engineer_hourly && (
                      <p style={{ margin: '0.25rem 0' }}><strong>Problem:</strong> {report.problem_faced_by_engineer_hourly}</p>
                    )}
                    {report.problem_resolved_or_not && (
                      <p style={{ margin: '0.25rem 0' }}><strong>Resolved:</strong> {report.problem_resolved_or_not}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit form for selected report */}
      {editingReport && (
        <div style={{
          border: '2px solid #2ad1ff',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          background: '#f0f9ff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#092544' }}>
              Edit Report: {editingReport.time_period}
            </h3>
            <button
              type="button"
              onClick={() => setEditingReport(null)}
              style={{
                padding: '0.5rem 1rem',
                background: '#f5f5f5',
                color: '#092544',
                border: '1px solid #d5e0f2',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Cancel Edit
            </button>
          </div>

          <div className="vh-grid">
            

            <label className="vh-span-2">
              <span>Hourly Activity *</span>
              <textarea
                rows={3}
                value={editingReport.hourly_activity || ''}
                onChange={(e) => setEditingReport({...editingReport, hourly_activity: e.target.value})}
                placeholder="Describe your activities during this hour..."
                required
              />
            </label>

            <label className="vh-span-2">
              <span>Problem Faced by Engineer (Hourly)</span>
              <textarea
                rows={2}
                value={editingReport.problem_faced_by_engineer_hourly || ''}
                onChange={(e) => setEditingReport({...editingReport, problem_faced_by_engineer_hourly: e.target.value})}
                placeholder="Describe any problems faced during this hour..."
              />
            </label>

            <label>
              <span>Problem Resolved or Not</span>
              <select
                value={editingReport.problem_resolved_or_not || ''}
                onChange={(e) => setEditingReport({...editingReport, problem_resolved_or_not: e.target.value})}
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>

            {editingReport.problem_resolved_or_not === 'Yes' && (
              <>
                <label>
                  <span>Problem Occur Start Time *</span>
                  <input
                    type="time"
                    value={editingReport.problem_occur_start_time || ''}
                    onChange={(e) => setEditingReport({...editingReport, problem_occur_start_time: e.target.value})}
                    required
                  />
                </label>

                <label>
                  <span>Problem Resolved End Time *</span>
                  <input
                    type="time"
                    value={editingReport.problem_resolved_end_time || ''}
                    onChange={(e) => setEditingReport({...editingReport, problem_resolved_end_time: e.target.value})}
                    required
                  />
                </label>

                <label className="vh-span-2">
                  <span>Online Support Required for Which Problem</span>
                  <textarea
                    rows={2}
                    value={editingReport.online_support_required_for_which_problem || ''}
                    onChange={(e) => setEditingReport({...editingReport, online_support_required_for_which_problem: e.target.value})}
                    placeholder="Describe which problem required online support..."
                  />
                </label>

                {editingReport.online_support_required_for_which_problem && (
                  <>
                    <label>
                      <span>Online Support Time *</span>
                      <input
                        type="time"
                        value={editingReport.online_support_time || ''}
                        onChange={(e) => setEditingReport({...editingReport, online_support_time: e.target.value})}
                        required
                      />
                    </label>

                    <label>
                      <span>Online Support End Time *</span>
                      <input
                        type="time"
                        value={editingReport.online_support_end_time || ''}
                        onChange={(e) => setEditingReport({...editingReport, online_support_end_time: e.target.value})}
                        required
                      />
                    </label>

                    <label className="vh-span-2">
                      <span>Engineer Name Who Gives Online Support *</span>
                      <input
                        type="text"
                        value={editingReport.engineer_name_who_gives_online_support || ''}
                        onChange={(e) => setEditingReport({...editingReport, engineer_name_who_gives_online_support: e.target.value})}
                        placeholder="Enter engineer name providing support"
                        required
                      />
                    </label>
                  </>
                )}
              </>
            )}

            <label className="vh-span-2">
              <span>Engineer Remark</span>
              <textarea
                rows={2}
                value={editingReport.engineer_remark || ''}
                onChange={(e) => setEditingReport({...editingReport, engineer_remark: e.target.value})}
                placeholder="Additional remarks from engineer..."
              />
            </label>

            <label className="vh-span-2">
              <span>Project Incharge Remark</span>
              <textarea
                rows={2}
                value={editingReport.project_incharge_remark || ''}
                onChange={(e) => setEditingReport({...editingReport, project_incharge_remark: e.target.value})}
                placeholder="Remarks from project incharge..."
              />
            </label>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button
              type="button"
              onClick={async () => {
                setSubmitting(true)
                try {
                  // Format the data with correct field names for the backend
                  const updateData = {
                    reportDate: formatDateForBackend(editingReport.report_date || editingReport.reportDate),
                    locationType: editingReport.location_type || editingReport.locationType,
                    timePeriod: editingReport.time_period || editingReport.timePeriod,
                    projectName: editingReport.project_name || editingReport.projectName,
                    dailyTarget: editingReport.daily_target || editingReport.dailyTarget,
                    hourlyActivity: editingReport.hourly_activity || editingReport.hourlyActivity,
                    problemFacedByEngineerHourly: editingReport.problem_faced_by_engineer_hourly || editingReport.problemFacedByEngineerHourly,
                    problemResolvedOrNot: editingReport.problem_resolved_or_not || editingReport.problemResolvedOrNot,
                    problemOccurStartTime: editingReport.problem_occur_start_time || editingReport.problemOccurStartTime,
                    problemResolvedEndTime: editingReport.problem_resolved_end_time || editingReport.problemResolvedEndTime,
                    onlineSupportRequiredForWhichProblem: editingReport.online_support_required_for_which_problem || editingReport.onlineSupportRequiredForWhichProblem,
                    onlineSupportTime: (editingReport.online_support_time || editingReport.onlineSupportTime) || null,
                    onlineSupportEndTime: (editingReport.online_support_end_time || editingReport.onlineSupportEndTime) || null,
                    engineerNameWhoGivesOnlineSupport: editingReport.engineer_name_who_gives_online_support || editingReport.engineerNameWhoGivesOnlineSupport,
                    engineerRemark: editingReport.engineer_remark || editingReport.engineerRemark,
                    projectInchargeRemark: editingReport.project_incharge_remark || editingReport.projectInchargeRemark,
                  }

                  const response = await fetch(`${endpoint}/${editingReport.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify(updateData),
                  })

                  if (!response.ok) {
                    throw new Error('Unable to update hourly report. Please retry.')
                  }

                  setAlert({ type: 'success', message: 'Hourly report updated successfully!' })

                  // Refresh existing reports
                  const refreshResponse = await fetch(`${endpoint}/${formData.reportDate}`, {
                    headers: {
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                  })
                  if (refreshResponse.ok) {
                    const reports = await refreshResponse.json()
                    setExistingReports(reports)
                  }

                  setEditingReport(null)
                } catch (error) {
                  setAlert({ type: 'error', message: error.message })
                } finally {
                  setSubmitting(false)
                }
              }}
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#2ad1ff',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              {submitting ? 'Updating…' : 'Update Report'}
            </button>
          </div>
        </div>
      )}

      <form className="vh-form" onSubmit={handleSubmit}>
        {/* Date and Project Selection */}
        <div className="vh-grid">
          <label>
            <span>Report Date</span>
            <input
              type="date"
              name="reportDate"
              value={formData.reportDate}
              onChange={handleChange}
              required
            />
          </label>

          

          <label className="vh-span-2">
            <span>Select Daily Target Report</span>
            <select
              onChange={handleDailyTargetSelect}
              disabled={loadingTargets}
            >
              <option value="">
                {loadingTargets ? 'Loading daily targets...' : 'Select from available daily reports'}
              </option>
              {dailyTargets.map(target => (
                <option key={target.id} value={target.id}>
                  {target.project_no} - {target.site_start_date}
                </option>
              ))}
            </select>
            {dailyTargets.length === 0 && !loadingTargets && (
              <small style={{ color: '#8892aa', marginTop: '0.25rem', display: 'block' }}>
                No daily target reports found for this date. Please create a daily target report first.
              </small>
            )}
          </label>

          <label className="vh-span-2">
            <span>Project Name / Project No.</span>
            <input
              type="text"
              name="projectName"
              placeholder="Will be auto-filled from daily target report"
              value={formData.projectName}
              onChange={handleChange}
              required
            />
          </label>

          <label className="vh-span-2">
            <span>Daily Target Planned by Site Engineer</span>
            <textarea
              name="dailyTarget"
              rows={3}
              value={formData.dailyTarget}
              onChange={handleChange}
              placeholder="Will be auto-filled from daily target report"
              required
            />
          </label>
        </div>

        {/* Hourly Entries - Only show when not editing */}
        {!editingReport && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ color: '#092544', marginBottom: '1rem' }}>New Hourly Reports (9am - 6pm)</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Current active period: <strong>{currentActivePeriod || 'None'}</strong><br/>
            You can only fill and submit reports within their allocated time periods.
          </p>

          {formData.hourlyEntries.map((entry, index) => {
            const isActivePeriod = entry.timePeriod === currentActivePeriod
            const canEdit = isActivePeriod || !currentActivePeriod // Allow editing if no period is active (for testing/admin)

            return (
              <div
                key={index}
                style={{
                  border: `1px solid ${isActivePeriod ? '#2ad1ff' : '#d5e0f2'}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  background: isActivePeriod ? '#f0f9ff' : '#f9f9f9',
                  opacity: canEdit ? 1 : 0.7
                }}
              >
                <h4 style={{
                  color: '#092544',
                  marginBottom: '1rem',
                  marginTop: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {entry.timePeriod}
                  {isActivePeriod && (
                    <span style={{
                      background: '#2ad1ff',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      ACTIVE
                    </span>
                  )}
                  {!canEdit && (
                    <span style={{
                      background: '#ff7a7a',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      LOCKED
                    </span>
                  )}
                </h4>

              <div className="vh-grid">
                <label className="vh-span-2">
                  <span>Hourly Activity *</span>
                  <textarea
                    rows={3}
                    value={entry.hourlyActivity}
                    onChange={(e) => handleHourlyEntryChange(index, 'hourlyActivity', e.target.value)}
                    placeholder={
                      canEdit
                        ? "Describe your activities during this hour..."
                        : `Can only fill during ${entry.timePeriod}`
                    }
                    required
                    disabled={!canEdit}
                  />
                </label>

                <label className="vh-span-2">
                  <span>Problem Faced by Engineer (Hourly)</span>
                  <textarea
                    rows={2}
                    value={entry.problemFacedByEngineerHourly}
                    onChange={(e) => handleHourlyEntryChange(index, 'problemFacedByEngineerHourly', e.target.value)}
                    placeholder="Describe any problems faced during this hour..."
                  />
                </label>

                <label>
                  <span>Problem Resolved or Not</span>
                  <select
                    value={entry.problemResolvedOrNot}
                    onChange={(e) => handleHourlyEntryChange(index, 'problemResolvedOrNot', e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </label>

                {entry.problemResolvedOrNot === 'Yes' && (
                  <>
                    <label>
                      <span>Problem Occur Start Time *</span>
                      <input
                        type="time"
                        value={entry.problemOccurStartTime}
                        onChange={(e) => handleHourlyEntryChange(index, 'problemOccurStartTime', e.target.value)}
                        disabled={!canEdit}
                        required
                      />
                    </label>

                    <label>
                      <span>Problem Resolved End Time *</span>
                      <input
                        type="time"
                        value={entry.problemResolvedEndTime}
                        onChange={(e) => handleHourlyEntryChange(index, 'problemResolvedEndTime', e.target.value)}
                        disabled={!canEdit}
                        required
                      />
                    </label>

                    <label className="vh-span-2">
                      <span>Online Support Required for Which Problem</span>
                      <textarea
                        rows={2}
                        value={entry.onlineSupportRequiredForWhichProblem}
                        onChange={(e) => handleHourlyEntryChange(index, 'onlineSupportRequiredForWhichProblem', e.target.value)}
                        placeholder="Describe which problem required online support..."
                        disabled={!canEdit}
                      />
                    </label>

                    {entry.onlineSupportRequiredForWhichProblem && (
                      <>
                        <label>
                          <span>Online Support Time *</span>
                          <input
                            type="time"
                            value={entry.onlineSupportTime}
                            onChange={(e) => handleHourlyEntryChange(index, 'onlineSupportTime', e.target.value)}
                            disabled={!canEdit}
                            required
                          />
                        </label>

                        <label>
                          <span>Online Support End Time *</span>
                          <input
                            type="time"
                            value={entry.onlineSupportEndTime}
                            onChange={(e) => handleHourlyEntryChange(index, 'onlineSupportEndTime', e.target.value)}
                            disabled={!canEdit}
                            required
                          />
                        </label>

                        <label className="vh-span-2">
                          <span>Engineer Name Who Gives Online Support *</span>
                          <input
                            type="text"
                            value={entry.engineerNameWhoGivesOnlineSupport}
                            onChange={(e) => handleHourlyEntryChange(index, 'engineerNameWhoGivesOnlineSupport', e.target.value)}
                            placeholder="Enter engineer name providing support"
                            disabled={!canEdit}
                            required
                          />
                        </label>
                      </>
                    )}
                  </>
                )}

                <label className="vh-span-2">
                  <span>Engineer Remark</span>
                  <textarea
                    rows={2}
                    value={entry.engineerRemark}
                    onChange={(e) => handleHourlyEntryChange(index, 'engineerRemark', e.target.value)}
                    placeholder="Additional remarks from engineer..."
                  />
                </label>

                <label className="vh-span-2">
                  <span>Project Incharge Remark</span>
                  <textarea
                    rows={2}
                    value={entry.projectInchargeRemark}
                    onChange={(e) => handleHourlyEntryChange(index, 'projectInchargeRemark', e.target.value)}
                    placeholder="Remarks from project incharge..."
                  />
                </label>
              </div>
            </div>
            )
          })}
          </div>
        )}

        {/* Form Actions - Only show when not editing */}
        {!editingReport && (
          <div className="vh-form-actions">
            <button type="submit" disabled={submitting || !currentActivePeriod}>
              {submitting ? 'Saving…' : `Submit ${currentActivePeriod || 'Hourly'} Report`}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setFormData(defaultPayload())}
              disabled={submitting}
            >
              Reset form
            </button>
            {!currentActivePeriod && (
              <small style={{ color: '#ff7a7a', display: 'block', marginTop: '0.5rem' }}>
                ⚠️ Reports can only be submitted during active time periods (9am-6pm)
              </small>
            )}
          </div>
        )}
      </form>
    </section>
  )
}

export default HourlyReportForm

