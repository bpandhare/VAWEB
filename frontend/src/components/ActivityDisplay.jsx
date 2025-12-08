import { useState, useEffect, useMemo } from 'react'
import { useAuth } from './AuthContext'
import './OnboardingForm.css'

function ActivityDisplay() {
  const { token, user } = useAuth()
  const [activities, setActivities] = useState([])
  const [summary, setSummary] = useState(null)
  const [subordinates, setSubordinates] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  const endpoint = useMemo(
    () => import.meta.env.VITE_API_URL?.replace('/api/activity', '/api/employee-activity') ?? 'http://localhost:5000/api/employee-activity',
    []
  )

  useEffect(() => {
    if (!user || !token) return
    fetchActivities()
    fetchSummary()

    if (user.role === 'Senior Assistant') {
      fetchSubordinates()
    }

    if (user.role === 'Group Leader') {
      fetchEmployees()
    }
  }, [page, user, token])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!token) {
        setError('No authentication token available')
        return
      }

      console.log('Fetching activities from:', `${endpoint}/activities?page=${page}&limit=10`)
      const response = await fetch(`${endpoint}/activities?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('Response status:', response.status)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Fetch error:', response.status, errorData)
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch activities`)
      }

      const data = await response.json()
      console.log('Activities data:', data)
      setActivities(data.activities || [])
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError(err.message || 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      if (!token) return

      const response = await fetch(`${endpoint}/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      }
    } catch (err) {
      console.error('Failed to fetch summary', err)
    }
  }

  const fetchSubordinates = async () => {
    try {
      if (!token) return

      const response = await fetch(`${endpoint}/subordinates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSubordinates(data.subordinates || [])
      }
    } catch (err) {
      console.error('Failed to fetch subordinates', err)
    }
  }

  const fetchEmployees = async () => {
    try {
      if (!token) return

      const response = await fetch(`${endpoint}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (err) {
      console.error('Failed to fetch employees', err)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN')
    } catch {
      return dateStr
    }
  }

  if (!user) {
    return (
      <section className="vh-form-shell">
        <div className="vh-alert error">
          <p>Please log in to view activities</p>
        </div>
      </section>
    )
  }

  return (
    <section className="vh-form-shell">
      <header className="vh-form-header">
        <div>
          <p className="vh-form-label">Activity Display</p>
          <h2>
            {user?.role === 'Manager' || user?.role === 'Team Leader'
              ? 'Monitor All Employee Activities'
              : 'Your Activities'}
          </h2>
          {summary && (
            <p>
              <strong>Total Activities:</strong> {summary.totalActivities}
              {(user?.role === 'Manager' || user?.role === 'Team Leader') && summary.activeEmployees && (
                <span style={{ marginLeft: '1rem' }}>
                  <strong>Active Employees:</strong> {summary.activeEmployees}
                </span>
              )}
            </p>
          )}
        </div>
      </header>

      {error && (
        <div className="vh-alert error" style={{ marginBottom: '1rem' }}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {user?.role === 'Senior Assistant' && subordinates.length > 0 && (
        <div style={{ 
          background: '#f0f9ff', 
          border: '1px solid #2ad1ff', 
          borderRadius: '12px', 
          padding: '1rem', 
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#092544' }}>Your Team (Junior Assistants)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {subordinates.map((emp) => (
              <div
                key={emp.id}
                style={{
                  background: 'white',
                  border: '1px solid #d5e0f2',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#092544' }}>
                  {emp.username}
                </p>
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#666' }}>
                  {emp.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === 'Group Leader' && employees.length > 0 && (
        <div style={{ 
          background: '#f9f0ff', 
          border: '1px solid #d084d0', 
          borderRadius: '12px', 
          padding: '1rem', 
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#6b2d5f' }}>Organization Structure</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {employees.map((emp) => (
              <div
                key={emp.id}
                style={{
                  background: 'white',
                  border: `2px solid ${emp.role === 'Senior Assistant' ? '#ff9800' : emp.role === 'Junior Assistant' ? '#2196f3' : '#4caf50'}`,
                  borderRadius: '8px',
                  padding: '0.75rem',
                }}
              >
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#092544' }}>
                  {emp.username}
                </p>
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#666' }}>
                  {emp.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ color: '#092544', marginBottom: '1rem' }}>Activities</h3>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>⏳ Loading activities...</p>
        ) : activities.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999' }}>No activities found. Activities will appear once daily/hourly reports are submitted.</p>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    background: 'white',
                    border: '1px solid #d5e0f2',
                    borderRadius: '12px',
                    padding: '1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ margin: '0', fontWeight: 'bold', color: '#092544' }}>
                      {activity.username || 'N/A'}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                      {activity.role || 'Team Member'}
                    </p>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    marginBottom: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid #e0e0e0'
                  }}>
                    <div>
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>Date</span>
                      <p style={{ margin: '0.25rem 0 0 0', fontWeight: 'bold' }}>
                        {formatDate(activity.reportDate)}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>Time</span>
                      <p style={{ margin: '0.25rem 0 0 0', fontWeight: 'bold' }}>
                        {activity.inTime || 'N/A'} - {activity.outTime || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <p style={{ margin: '0 0 0.25rem 0', color: '#666', fontSize: '0.85rem' }}>Project</p>
                    <p style={{ margin: '0', fontWeight: '500' }}>
                      {activity.projectNo || 'N/A'}
                    </p>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <p style={{ margin: '0 0 0.25rem 0', color: '#666', fontSize: '0.85rem' }}>Location Type</p>
                    <p style={{
                      margin: '0',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      display: 'inline-block',
                      background: activity.locationType === 'site' ? '#e8f5e9' : activity.locationType === 'office' ? '#e3f2fd' : '#fff3e0',
                      color: activity.locationType === 'site' ? '#2e7d32' : activity.locationType === 'office' ? '#1565c0' : '#e65100',
                      fontWeight: '500',
                      fontSize: '0.85rem'
                    }}>
                      {activity.locationType || 'N/A'}
                    </p>
                  </div>

                  {activity.dailyTargetAchieved && (
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <p style={{ margin: '0 0 0.25rem 0', color: '#666', fontSize: '0.85rem' }}>Target Achieved</p>
                      <p style={{ margin: '0', color: '#06c167', fontWeight: '500' }}>
                        {activity.dailyTargetAchieved.substring(0, 50)}...
                      </p>
                    </div>
                  )}

                  {activity.problemFaced && (
                    <div style={{ fontSize: '0.9rem' }}>
                      <p style={{ margin: '0 0 0.25rem 0', color: '#666', fontSize: '0.85rem' }}>Problem Faced</p>
                      <p style={{ margin: '0', color: '#ff7a7a', fontWeight: '500' }}>
                        {activity.problemFaced.substring(0, 50)}...
                      </p>
                    </div>
                  )}

                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>
                    {formatDate(activity.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  background: page === 1 ? '#ddd' : '#2ad1ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span style={{ padding: '0.5rem 1rem', color: '#666' }}>Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={activities.length < 10}
                style={{
                  padding: '0.5rem 1rem',
                  background: activities.length < 10 ? '#ddd' : '#2ad1ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: activities.length < 10 ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default ActivityDisplay
