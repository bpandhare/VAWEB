import './Sidebar.css'
import { useAuth } from './AuthContext'
// sidebar doesn't manage MoM state; CreateMoM is a separate page

// Import a logo image - make sure to add your logo file to the project
// Option 1: If you have a logo image in your assets folder
import logo from '../assets/logo.jpeg' // Adjust the path based on your project structure
// Option 2: Or use an online logo
// const logoUrl = 'https://example.com/your-logo.png'

function Sidebar({ currentPage, onPageChange }) {
  const { user } = useAuth()
  // CreateMoM is a separate page; Sidebar only navigates to it

  return (
    <aside className="vh-sidebar">
      <div className="vh-brand">
        <div className="vh-brand-header">
          {/* Add your logo here */}
          <img 
            src={logo} 
            alt="Vickhardth Logo" 
            className="vh-logo"
            // If using online URL: src={logoUrl}
          />
          <span className="vh-pill">VICKHARDTH</span>
        </div>
        <p className="vh-tagline">Daily reporting hub for site engineers.</p>
      </div>

      <nav className="vh-nav">
        <h2>Reports</h2>
        <ul className="vh-nav-links">
          <li>
            <button
              className={currentPage === 'hourly' ? 'active' : ''}
              onClick={() => onPageChange('hourly')}
              type="button"
            >
              Hourly Report
            </button>
          </li>
          <li>
            <button
              className={currentPage === 'daily' ? 'active' : ''}
              onClick={() => onPageChange('daily')}
              type="button"
            >
              Daily Target Report
            </button>
          </li>
        </ul>
      </nav>

      {/* Activity Display for all roles */}
      {user && (
        <>
          <nav className="vh-nav">
            <h2>Monitoring</h2>
            <ul className="vh-nav-links">
              <li>
                <button
                  className={currentPage === 'activity' ? 'active' : ''}
                  onClick={() => onPageChange('activity')}
                  type="button"
                >
                  📊 View Activities
                  {(user.role === 'Manager' || user.role === 'Team Leader') && <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}> (All)</span>}
                  {(user.role === 'Senior Engineer' || user.role === 'Junior Engineer') && <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}> (Mine)</span>}
                </button>
              </li>
            </ul>
          </nav>

          {/* Create MoM panel */}
          <section className="vh-nav" style={{ marginTop: '1rem' }}>
            <h2>Create MoM</h2>
            <ul className="vh-nav-links">
              <li>
                <button className={currentPage === 'create-mom' ? 'active' : ''} onClick={() => onPageChange('create-mom')} type="button">Create MoM (Download)</button>
              </li>
            </ul>
          </section>
        </>
      )}
    </aside>
  )
}

export default Sidebar