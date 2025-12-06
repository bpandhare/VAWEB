import { useMemo, useState, useEffect } from 'react'
import './OnboardingForm.css'
import { useAuth } from './AuthContext'

const getIndianTime = () => {
  // Get current local time (assuming user's PC is set to IST)
  const now = new Date()
  // Format as HH:MM in 24-hour format
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const defaultPayload = () => {
  const now = new Date()
  const inTime = getIndianTime()
  const outTime = ''
  const today = now.toISOString().slice(0, 10)

  return {
    reportDate: today, // Date for this daily target report (for hourly report linking)
    inTime: inTime,
    outTime: outTime,
    customerName: '',
    customerPerson: '',
    customerContact: '',
    endCustomerName: '',
    endCustomerPerson: '',
    endCustomerContact: '',
    projectNo: '',
    locationType: '', // 'site', 'office', 'leave'
    siteLocation: '',
    locationLat: '',
    locationLng: '',
    momReport: null,
    dailyTargetPlanned: '',
    dailyTargetAchieved: '',
    additionalActivity: '',
    whoAddedActivity: '',
    dailyPendingTarget: '',
    reasonPendingTarget: '',
    problemFaced: '',
    problemResolved: '',
    onlineSupportRequired: '',
    supportEngineerName: '',
    siteStartDate: today,
    siteEndDate: '',
    incharge: '',
    remark: '',
  }
}

function DailyTargetForm() {
  const { token } = useAuth()
  const [formData, setFormData] = useState(defaultPayload)
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)
  const [locationAccess, setLocationAccess] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [submittedData, setSubmittedData] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [locationName, setLocationName] = useState('')
  const [fetchingLocation, setFetchingLocation] = useState(false)

  const endpoint = useMemo(
    () => import.meta.env.VITE_API_URL?.replace('/api/activity', '/api/daily-target') ?? 'http://localhost:5000/api/daily-target',
    []
  )


  // Get user's location when site location is selected
  useEffect(() => {
    try {
      if (formData.locationType === 'site') {
        // Don't auto-fetch, let user click the button
        setLocationAccess(false)
        setLocationError('')
      } else if (formData.locationType === 'leave') {
        // Clear work-related fields for leave location
        setLocationAccess(false)
        setLocationError('')
        setFormData((prev) => ({
          ...prev,
          inTime: '',
          outTime: '',
          customerName: '',
          customerPerson: '',
          customerContact: '',
          endCustomerName: '',
          endCustomerPerson: '',
          endCustomerContact: '',
          projectNo: '',
          siteLocation: '',
          locationLat: '',
          locationLng: '',
          momReport: null,
          dailyTargetPlanned: '',
          dailyTargetAchieved: '',
          additionalActivity: '',
          whoAddedActivity: '',
          dailyPendingTarget: '',
          reasonPendingTarget: '',
          problemFaced: '',
          problemResolved: '',
          onlineSupportRequired: '',
          supportEngineerName: '',
          siteStartDate: '',
          siteEndDate: '',
          incharge: '',
          remark: ''
        }))

        // Clear any form validation state when switching to leave
        if (typeof document !== 'undefined') {
          setTimeout(() => {
            const form = document.querySelector('.vh-form')
            if (form) {
              const inputs = form.querySelectorAll('input, textarea, select')
              inputs.forEach(input => {
                input.setCustomValidity('')
                // Force validation reset
                input.checkValidity()
              })
              form.checkValidity()
            }
          }, 50)
        }

        setLocationName('')
      } else {
        // For office location, clear site-specific fields
        setLocationAccess(false)
        setLocationError('')
        setFormData((prev) => ({ ...prev, siteLocation: '', locationLat: '', locationLng: '', momReport: null }))
        setLocationName('')
      }

    } catch (error) {
      console.error('Error handling location type change:', error)
      setLocationError('Failed to update location settings')
    }
  }, [formData.locationType])

  // Reverse geocode coordinates to get readable address with better accuracy
  const reverseGeocode = async (lat, lng) => {
    try {
      setFetchingLocation(true)
      
      // Try multiple geocoding services for better accuracy
      let bestAddress = null
      let addresses = []
      
      // Method 1: Try Google Maps Geocoding API first (most accurate for Indian addresses)
      const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      if (googleApiKey) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}&language=en&region=in&result_type=street_address|premise|subpremise|neighborhood|locality|sublocality`
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data && data.status === 'OK' && data.results && data.results.length > 0) {
              // Try to find the most specific result
              let specificResult = data.results.find(r => 
                r.types.includes('street_address') || 
                r.types.includes('premise') || 
                r.types.includes('subpremise')
              )
              
              // If not found, try neighborhood or sublocality (for places like "M Phulenagar")
              if (!specificResult) {
                specificResult = data.results.find(r => 
                  r.types.includes('neighborhood') || 
                  r.types.includes('sublocality') ||
                  r.types.includes('sublocality_level_1')
                )
              }
              
              // Fallback to locality
              if (!specificResult) {
                specificResult = data.results.find(r => r.types.includes('locality'))
              }
              
              // Final fallback to first result
              if (!specificResult) {
                specificResult = data.results[0]
              }
              
              if (specificResult && specificResult.formatted_address) {
                // Google Maps API result is most accurate, use it immediately
                bestAddress = specificResult.formatted_address
                setLocationName(bestAddress)
                return bestAddress
              }
            }
          }
        } catch (error) {
          console.warn('Google Geocoding API failed:', error)
        }
      }
      
      // Method 2: Try OpenStreetMap Nominatim with multiple zoom levels and different parameters
      const zoomLevels = [18, 16, 14, 12] // Try most detailed first
      for (const zoom of zoomLevels) {
        try {
          // Try with different parameters
          const urls = [
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=${zoom}&addressdetails=1&extratags=1&namedetails=1&accept-language=en`,
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=${zoom}&addressdetails=1&extratags=1&accept-language=en-IN`,
          ]
          
          for (const url of urls) {
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Vickhardth Site Pulse App',
                'Accept-Language': 'en,en-IN',
              },
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data) {
                // Try to extract the most specific address
                if (data.address) {
                  const addr = data.address
                  let addressParts = []
                  
              // Prioritize most specific location identifiers for Indian addresses
              // Order matters - most specific first
              
              // 1. Locality/Neighbourhood (most specific - like "M Phulenagar")
              if (addr.locality) addressParts.push(addr.locality)
              else if (addr.neighbourhood) addressParts.push(addr.neighbourhood)
              else if (addr.suburb) addressParts.push(addr.suburb)
              else if (addr.quarter) addressParts.push(addr.quarter)
              else if (addr.residential) addressParts.push(addr.residential)
              else if (addr.hamlet) addressParts.push(addr.hamlet)
              
              // 2. Park/Place name (like "Jijamata Park")
              if (addr.leisure) addressParts.push(addr.leisure)
              if (addr.amenity) addressParts.push(addr.amenity)
              if (addr.place) addressParts.push(addr.place)
              
              // 3. Road/Street
              if (addr.road) addressParts.push(addr.road)
              else if (addr.street) addressParts.push(addr.street)
              else if (addr.pedestrian) addressParts.push(addr.pedestrian)
              else if (addr.footway) addressParts.push(addr.footway)
              else if (addr.path) addressParts.push(addr.path)
              
              // 4. City/Town (like "Chinchwad")
              if (addr.city) addressParts.push(addr.city)
              else if (addr.town) addressParts.push(addr.town)
              else if (addr.village) addressParts.push(addr.village)
              else if (addr.municipality) addressParts.push(addr.municipality)
              
              // 5. Larger area (like "Pimpri-Chinchwad")
              if (addr.city_district) addressParts.push(addr.city_district)
              
              // 6. District/County
              if (addr.district) addressParts.push(addr.district)
              else if (addr.county) addressParts.push(addr.county)
              
              // 7. Postcode
              if (addr.postcode) addressParts.push(addr.postcode)
              
              // 8. State
              if (addr.state) addressParts.push(addr.state)
                  
                  if (addressParts.length > 0) {
                    const constructedAddress = addressParts.join(', ')
                    addresses.push(constructedAddress)
                  }
                }
                
                // Also collect display_name as alternative
                if (data.display_name) {
                  addresses.push(data.display_name)
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Nominatim API failed for zoom ${zoom}:`, error)
          continue
        }
      }
      
      // Method 3: Try MapBox if available (optional)
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
      if (mapboxToken && !bestAddress) {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,poi,neighborhood,locality`
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data && data.features && data.features.length > 0) {
              const feature = data.features[0]
              if (feature.place_name) {
                addresses.push(feature.place_name)
              }
            }
          }
        } catch (error) {
          console.warn('MapBox API failed:', error)
        }
      }
      
      // Find the best address - prioritize addresses that contain more specific terms
      if (addresses.length > 0) {
        // Score addresses based on specificity (prefer addresses with more components)
        const scoredAddresses = addresses.map(addr => ({
          address: addr,
          score: addr.split(',').length + (addr.match(/park|nagar|chinchwad|pimpri/i) ? 10 : 0)
        }))
        
        // Sort by score (highest first)
        scoredAddresses.sort((a, b) => b.score - a.score)
        bestAddress = scoredAddresses[0].address
      }
      
      // If we got an address, use it
      if (bestAddress) {
        setLocationName(bestAddress)
        return bestAddress
      }
      
      // Final fallback: coordinates
      const formattedCoords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setLocationName(formattedCoords)
      return formattedCoords
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setLocationName(fallback)
      return fallback
    } finally {
      setFetchingLocation(false)
    }
  }

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setLocationError('')
    setFetchingLocation(true)
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          
          // Store coordinates first
          setFormData((prev) => ({
            ...prev,
            locationLat: lat.toString(),
            locationLng: lng.toString(),
            siteLocation: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, // Set coordinates as fallback
          }))
          
          setLocationAccess(true)
          
          // Get readable address (this will update siteLocation if successful)
          const address = await reverseGeocode(lat, lng)
          
          // Update with the address if we got one
          if (address && address !== `${lat.toFixed(6)}, ${lng.toFixed(6)}`) {
            setFormData((prev) => ({
              ...prev,
              siteLocation: address,
            }))
          }
        } catch (error) {
          console.error('Error processing location:', error)
          setLocationError('Location captured but address lookup failed. Coordinates saved.')
        }
      },
      (error) => {
        setLocationAccess(false)
        setFetchingLocation(false)
        let errorMessage = 'Location access denied or unavailable. Please enable location services.'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your device settings.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
        }
        
        setLocationError(errorMessage)
        setFormData((prev) => ({ ...prev, siteLocation: '', locationLat: '', locationLng: '' }))
        setLocationName('')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const handleChange = (event) => {
    const { name, value, type, files } = event.target
    if (type === 'file') {
      setFormData((prev) => ({ ...prev, [name]: files[0] || null }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleInTimeAuto = () => {
    const inTime = getIndianTime()
    setFormData((prev) => ({ ...prev, inTime }))
  }

  const handleOutTimeAuto = () => {
    const outTime = getIndianTime()
    setFormData((prev) => ({ ...prev, outTime }))
  }

  const handleSubmit = async () => {
    console.log('=== FORM SUBMISSION STARTED ===')
    console.log('Location type:', formData.locationType)
    console.log('Form data:', formData)
    console.log('Remark field:', formData.remark)
    console.log('Remark trimmed:', formData.remark?.trim())
    console.log('Remark exists:', !!(formData.remark?.trim()))

    setSubmitting(true)
    setAlert(null)

    // Validate PDF upload for site location (skip for edits with existing location data)
    if (formData.locationType === 'site' && !locationAccess && !(isEditMode && formData.locationLat && formData.locationLng)) {
      setAlert({ type: 'error', message: 'Please allow location access to upload MOM report' })
      setSubmitting(false)
      return
    }

    // For leave location, no fields are required (remark is optional)
    if (formData.locationType === 'leave') {
      console.log('Leave location selected - no validation required')
      // No validation needed for leave location
    } else {
      // For office/site locations, require all work-related fields
      const requiredFields = [
        'reportDate', 'inTime', 'outTime', 'customerName', 'customerPerson', 'customerContact',
        'endCustomerName', 'endCustomerPerson', 'endCustomerContact', 'projectNo', 'locationType',
        'dailyTargetPlanned', 'dailyTargetAchieved', 'incharge'
      ]

      if (formData.locationType === 'site') {
        requiredFields.push('siteStartDate')
      }

      const missingFields = requiredFields.filter(field => !formData[field])

      if (missingFields.length > 0) {
        setAlert({ type: 'error', message: `Please fill in all required fields: ${missingFields.join(', ')}` })
        setSubmitting(false)
        return
      }
    }

    try {
      const formDataToSend = new FormData()

      // Add all form fields
      Object.keys(formData).forEach((key) => {
        if (key === 'momReport' && formData.momReport) {
          formDataToSend.append('momReport', formData.momReport)
        } else if (key !== 'momReport') {
          formDataToSend.append(key, formData[key] || '')
        }
      })

      const updateEndpoint = isEditMode ? `${endpoint}/${submittedData.id}` : endpoint
      const response = await fetch(updateEndpoint, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formDataToSend,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unable to save daily target report. Please retry.' }))
        throw new Error(errorData.message || 'Unable to save daily target report. Please retry.')
      }

      const responseData = await response.json()

      // Store submitted data to show on page
      const submittedFormData = {
        ...formData,
        id: isEditMode ? submittedData.id : responseData.id,
        submittedAt: isEditMode ? submittedData.submittedAt : new Date().toISOString(),
        momReportName: formData.momReport ? formData.momReport.name : (isEditMode ? submittedData.momReportName : null),
        locationName: locationName || formData.siteLocation || '',
      }
      setSubmittedData(submittedFormData)
      setIsEditMode(false)
      
      setAlert({ type: 'success', message: isEditMode ? 'Report updated successfully!' : 'Daily target report saved successfully! You can now view and edit it below.' })
      
      // Reset form for new entry
      const newFormData = defaultPayload()
      setFormData(newFormData)
      setLocationAccess(false)
      setLocationError('')
      
      // Reset file input
      setTimeout(() => {
        const fileInput = document.querySelector('input[name="momReport"]')
        if (fileInput) {
          fileInput.value = ''
        }
      }, 100)
    } catch (error) {
      setAlert({ type: 'error', message: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const canUploadPDF = formData.locationType === 'site' && locationAccess

  return (
    <section className="vh-form-shell">
      <header className="vh-form-header">
        <div>
          <p className="vh-form-label">Daily Target Report</p>
          <h2>Record your daily targets</h2>
          <p>
            Track your in/out times, customer information, site activities, and daily targets.
          </p>
        </div>
      </header>

      {alert && (
        <div className={`vh-alert ${alert.type}`}>
          <p>{alert.message}</p>
        </div>
      )}

      {submittedData && !isEditMode && (
        <div style={{ 
          background: '#f0f9ff', 
          border: '1px solid #2ad1ff', 
          borderRadius: '16px', 
          padding: '1.5rem', 
          marginBottom: '1.5rem',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'sticky', top: 0, background: '#f0f9ff', zIndex: 1, paddingBottom: '0.5rem', borderBottom: '1px solid #2ad1ff' }}>
            <h3 style={{ margin: 0, color: '#092544' }}>Submitted Report #{submittedData.id}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  // Create a copy of submitted data for editing
                  const editData = { ...submittedData }
                  // Remove the momReportName as we'll need to re-upload if changed
                  delete editData.momReportName
                  delete editData.id

                  delete editData.submittedAt
                  delete editData.locationName
                  // Ensure reportDate is set (use existing or current date)
                  if (!editData.reportDate) {
                    editData.reportDate = new Date().toISOString().slice(0, 10)
                  }
                  setFormData(editData)
                  setIsEditMode(true)
                  if (editData.locationType === 'site' && editData.locationLat && editData.locationLng) {
                    setLocationAccess(true)
                    setLocationError('')
                    // Restore location name from submitted data or use siteLocation
                    const restoredLocationName = submittedData.locationName || editData.siteLocation || ''
                    setLocationName(restoredLocationName)
                    // If we have coordinates but no readable address, try to fetch it
                    if (editData.locationLat && editData.locationLng && !restoredLocationName.includes('Location:')) {
                      const lat = parseFloat(editData.locationLat)
                      const lng = parseFloat(editData.locationLng)
                      if (!isNaN(lat) && !isNaN(lng)) {
                        reverseGeocode(lat, lng).then((address) => {
                          if (address && address !== `${lat.toFixed(6)}, ${lng.toFixed(6)}`) {
                            setFormData((prev) => ({
                              ...prev,
                              siteLocation: address,
                            }))
                          }
                        })
                      }
                    }
                  }
                }}
                
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
              <button
                type="button"
                onClick={() => {
                  setSubmittedData(null)
                  setIsEditMode(false)
                }}
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
                Close
              </button>
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
            fontSize: '0.9rem',
            color: '#4a5972'
          }}>
            <div><strong>Location Type:</strong> {submittedData.locationType ? submittedData.locationType.charAt(0).toUpperCase() + submittedData.locationType.slice(1) : 'N/A'}</div>
            <div></div>

            {submittedData.locationType !== 'leave' && (
              <>
                <div><strong>In Time:</strong> {submittedData.inTime || 'N/A'}</div>
                <div><strong>Out Time:</strong> {submittedData.outTime || 'N/A'}</div>

                <div className="vh-span-2" style={{ gridColumn: 'span 2', borderTop: '1px solid #d5e0f2', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong>Customer Information:</strong>
                </div>
                <div><strong>Customer Name:</strong> {submittedData.customerName || 'N/A'}</div>
                <div><strong>Customer Person:</strong> {submittedData.customerPerson || 'N/A'}</div>
                <div><strong>Customer Contact:</strong> {submittedData.customerContact || 'N/A'}</div>
              </>
            )}

            {submittedData.locationType !== 'leave' && (
              <>
                <div className="vh-span-2" style={{ gridColumn: 'span 2', borderTop: '1px solid #d5e0f2', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong>End Customer Information:</strong>
                </div>
                <div><strong>End Customer Name:</strong> {submittedData.endCustomerName || 'N/A'}</div>
                <div><strong>End Customer Person:</strong> {submittedData.endCustomerPerson || 'N/A'}</div>
                <div><strong>End Customer Contact:</strong> {submittedData.endCustomerContact || 'N/A'}</div>

                <div className="vh-span-2" style={{ gridColumn: 'span 2', borderTop: '1px solid #d5e0f2', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong>Project & Location:</strong>
                </div>
                <div><strong>Project No./Name:</strong> {submittedData.projectNo || 'N/A'}</div>
              </>
            )}
            {submittedData.locationType === 'site' && (
              <>
                <div className="vh-span-2" style={{ gridColumn: 'span 2' }}>
                  <strong>Site Location:</strong> {submittedData.locationName || submittedData.siteLocation || 'N/A'}
                </div>
                {submittedData.locationLat && submittedData.locationLng && (
                  <div className="vh-span-2" style={{ gridColumn: 'span 2', fontSize: '0.85rem', color: '#8892aa' }}>
                    Coordinates: {submittedData.locationLat}, {submittedData.locationLng}
                  </div>
                )}
              </>
            )}

            {submittedData.locationType !== 'leave' && (
              <>
                {submittedData.momReportName && (
                  <div className="vh-span-2" style={{ gridColumn: 'span 2' }}>
                    <strong>MOM Report:</strong> {submittedData.momReportName}
                  </div>
                )}

                <div className="vh-span-2" style={{ gridColumn: 'span 2', borderTop: '1px solid #d5e0f2', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong>Daily Targets:</strong>
                </div>
                <div className="vh-span-2" style={{ gridColumn: 'span 2' }}>
                  <strong>Daily Target Planned by Site Engineer:</strong>
                  <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', background: 'white', padding: '0.75rem', borderRadius: '8px' }}>
                    {submittedData.dailyTargetPlanned || 'N/A'}
                  </p>
                </div>
                <div className="vh-span-2" style={{ gridColumn: 'span 2' }}>
                  <strong>Daily Target Achieved by Engineer:</strong>
                  <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', background: 'white', padding: '0.75rem', borderRadius: '8px' }}>
                    {submittedData.dailyTargetAchieved || 'N/A'}
                  </p>
                </div>
                {submittedData.additionalActivity && (
                  <div className="vh-span-2" style={{ gridColumn: 'span 2' }}>
                    <strong>Additional Activity Added by Customer/End Customer:</strong>
                    <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', background: 'white', padding: '0.75rem', borderRadius: '8px' }}>
                      {submittedData.additionalActivity}
                    </p>
                  </div>
                )}
                {submittedData.whoAddedActivity && (
                  <div><strong>Who Added This Extra Activity:</strong> {submittedData.whoAddedActivity}</div>
                )}
                {submittedData.dailyPendingTarget && (
                  <div className="vh-span-2" style={{ gridColumn: 'span 2' }}>
                    <strong>Daily Pending Target:</strong>
                    <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', background: 'white', padding: '0.75rem', borderRadius: '8px' }}>
                      {submittedData.dailyPendingTarget}
                    </p>
                  </div>
                )}
                {submittedData.reasonPendingTarget && (
                  <div className="vh-span-2" style={{ gridColumn: 'span 2' }}>
                    <strong>Reason for Daily Pending Target:</strong>
                    <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', background: 'white', padding: '0.75rem', borderRadius: '8px' }}>
                      {submittedData.reasonPendingTarget}
                    </p>
                  </div>
                )}
              </>
            )}

            {submittedData.locationType !== 'leave' && (
              <>
                <div className="vh-span-2" style={{ gridColumn: 'span 2', borderTop: '1px solid #d5e0f2', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong>Problems & Support:</strong>
                </div>
                {submittedData.problemFaced && (
                  <div className="vh-span-2" style={{ gridColumn: 'span 2' }}>
                    <strong>Problem Faced by Engineer:</strong>
                    <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', background: 'white', padding: '0.75rem', borderRadius: '8px' }}>
                      {submittedData.problemFaced}
                    </p>
                  </div>
                )}
                {submittedData.problemResolved && (
                  <div className="vh-span-2" style={{ gridColumn: 'span 2' }}>
                    <strong>Problem Resolved or Not and How:</strong>
                    <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', background: 'white', padding: '0.75rem', borderRadius: '8px' }}>
                      {submittedData.problemResolved}
                    </p>
                  </div>
                )}
                {submittedData.onlineSupportRequired && (
                  <div>
                    <strong>Online Support Required:</strong> {submittedData.onlineSupportRequired}
                  </div>
                )}
                {submittedData.supportEngineerName && (
                  <div><strong>Engineer Name Who Gives Online Support:</strong> {submittedData.supportEngineerName}</div>
                )}

                <div className="vh-span-2" style={{ gridColumn: 'span 2', borderTop: '1px solid #d5e0f2', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong>Site Dates & Personnel:</strong>
                </div>
                <div><strong>Site Start Date:</strong> {submittedData.siteStartDate || 'N/A'}</div>
                {submittedData.siteEndDate && <div><strong>Site End Date:</strong> {submittedData.siteEndDate}</div>}
                <div><strong>Incharge:</strong> {submittedData.incharge || 'N/A'}</div>
              </>
            )}

            {submittedData.remark && (
              <div className="vh-span-2" style={{ gridColumn: 'span 2', borderTop: '1px solid #d5e0f2', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <strong>Remark{submittedData.locationType === 'leave' ? ' (Leave Reason)' : ''}:</strong>
                <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', background: submittedData.locationType === 'leave' ? '#fff3cd' : 'white', padding: '0.75rem', borderRadius: '8px', border: submittedData.locationType === 'leave' ? '1px solid #ffc107' : 'none' }}>
                  {submittedData.remark}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="vh-form" onSubmit={handleSubmit}>
        <div className="vh-grid">
          <label>
            <span>Report Date *</span>
            <input
              type="date"
              name="reportDate"
              value={formData.reportDate}
              onChange={handleChange}
            />
            <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
              Date for this daily target report (used for hourly report linking)
            </small>
          </label>

          <label className="vh-span-2">
            <span>Site Location / Office / Leave</span>
            <select
              name="locationType"
              value={formData.locationType}
              onChange={handleChange}
            >
              <option value="">Select location type</option>
              <option value="site">Site Location</option>
              <option value="office">Office</option>
              <option value="leave">Leave</option>
            </select>
          </label>

          {formData.locationType !== 'leave' && (
            <>
              <label>
                <span>In Time</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="time"
                    name="inTime"
                    value={formData.inTime}
                    onChange={handleChange}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleInTimeAuto}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#2ad1ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Auto
                  </button>
                </div>
              </label>

              <label>
                <span>Out Time</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="time"
                    name="outTime"
                    value={formData.outTime}
                    onChange={handleChange}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleOutTimeAuto}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#2ad1ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Auto
                  </button>
                </div>
              </label>

              <label className="vh-span-2">
                <span>Customer Name</span>
                <input
                  type="text"
                  name="customerName"
                  placeholder="Enter customer name"
                  value={formData.customerName}
                  onChange={handleChange}
                />
              </label>

              <label className="vh-span-2">
                <span>Customer Person</span>
                <input
                  type="text"
                  name="customerPerson"
                  placeholder="Enter customer contact person name"
                  value={formData.customerPerson}
                  onChange={handleChange}
                />
              </label>

              <label className="vh-span-2">
                <span>Customer Contact No.</span>
                <input
                  type="tel"
                  name="customerContact"
                  placeholder="Enter customer contact number"
                  value={formData.customerContact}
                  onChange={handleChange}
                />
              </label>

              <label className="vh-span-2">
                <span>End Customer Name</span>
                <input
                  type="text"
                  name="endCustomerName"
                  placeholder="Enter end customer name"
                  value={formData.endCustomerName}
                  onChange={handleChange}
                />
              </label>

              <label className="vh-span-2">
                <span>End Customer Person</span>
                <input
                  type="text"
                  name="endCustomerPerson"
                  placeholder="Enter end customer contact person name"
                  value={formData.endCustomerPerson}
                  onChange={handleChange}
                />
              </label>

              <label className="vh-span-2">
                <span>End Customer Contact No.</span>
                <input
                  type="tel"
                  name="endCustomerContact"
                  placeholder="Enter end customer contact number"
                  value={formData.endCustomerContact}
                  onChange={handleChange}
                />
              </label>

              <label className="vh-span-2">
                <span>Project No. / Project Name</span>
                <input
                  type="text"
                  name="projectNo"
                  placeholder="Eg. VH-Metro Phase 2 / VH-OPS-0215"
                  value={formData.projectNo}
                  onChange={handleChange}
                />
              </label>
            </>
          )}

          {formData.locationType === 'site' && (
            <>
              <label className="vh-span-2">
                <span>Site Location (Auto-detected)</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    name="siteLocation"
                    value={formData.siteLocation}
                    onChange={handleChange}
                    placeholder="Location will be automatically detected..."
                    style={{ flex: 1, background: locationAccess ? '#f0f9ff' : '#f5f5f5' }}
                    readOnly={locationAccess && !isEditMode}
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={fetchingLocation || locationAccess}
                    style={{
                      padding: '0.5rem 1rem',
                      background: locationAccess ? '#06c167' : fetchingLocation ? '#8892aa' : '#2ad1ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (fetchingLocation || locationAccess) ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      opacity: (fetchingLocation || locationAccess) ? 0.7 : 1,
                      whiteSpace: 'nowrap',
                    }}
                    title="Get GPS coordinates and automatically fetch address"
                  >
                    {fetchingLocation ? '⏳ Detecting...' : locationAccess ? '✓ Location Set' : 'Get Location'}
                  </button>
                </div>
                {fetchingLocation && (
                  <small style={{ color: '#2ad1ff', marginTop: '0.25rem', display: 'block' }}>
                    🔄 Fetching location name...
                  </small>
                )}
                {locationError && (
                  <small style={{ color: '#ff7a7a', marginTop: '0.25rem', display: 'block' }}>
                    ⚠️ {locationError}
                  </small>
                )}
                {fetchingLocation && (
                  <small style={{ color: '#2ad1ff', marginTop: '0.25rem', display: 'block' }}>
                    🔄 Detecting your location and fetching address...
                  </small>
                )}
                {locationError && (
                  <small style={{ color: '#ff7a7a', marginTop: '0.25rem', display: 'block' }}>
                    ⚠️ {locationError}
                  </small>
                )}
                {locationAccess && !fetchingLocation && formData.siteLocation && (
                  <small style={{ color: '#06c167', marginTop: '0.25rem', display: 'block' }}>
                    ✓ Location automatically detected: {formData.siteLocation}
                    {formData.locationLat && formData.locationLng && (
                      <span style={{ display: 'block', fontSize: '0.85rem', color: '#8892aa', marginTop: '0.25rem' }}>
                        📍 GPS Coordinates: {formData.locationLat}, {formData.locationLng}
                      </span>
                    )}
                  </small>
                )}
              </label>

              {canUploadPDF && (
                <label className="vh-span-2">
                  <span>MOM Report (PDF)</span>
                  <input
                    type="file"
                    name="momReport"
                    accept=".pdf"
                    onChange={handleChange}
                    style={{ padding: '0.5rem' }}
                  />
                  {formData.momReport && (
                    <small style={{ color: '#06c167', marginTop: '0.25rem', display: 'block' }}>
                      Selected: {formData.momReport.name}
                    </small>
                  )}
                </label>
              )}
            </>
          )}

          {formData.locationType !== 'leave' && (
            <>
              <label className="vh-span-2">
                <span>Daily Target Planned by Site Engineer</span>
                <textarea
                  name="dailyTargetPlanned"
                  rows={3}
                  value={formData.dailyTargetPlanned}
                  onChange={handleChange}
                  placeholder="Describe the daily target planned..."
                />
              </label>

              <label className="vh-span-2">
                <span>Daily Target Achieved by Engineer</span>
                <textarea
                  name="dailyTargetAchieved"
                  rows={3}
                  value={formData.dailyTargetAchieved}
                  onChange={handleChange}
                  placeholder="Describe what was achieved..."
                />
              </label>

              <label className="vh-span-2">
                <span>Additional Activity Added by Customer/End Customer</span>
                <textarea
                  name="additionalActivity"
                  rows={3}
                  value={formData.additionalActivity}
                  onChange={handleChange}
                  placeholder="Describe additional activities..."
                />
              </label>

              <label className="vh-span-2">
                <span>Who Added This Extra Activity</span>
                <input
                  type="text"
                  name="whoAddedActivity"
                  placeholder="Enter name of person who added the activity"
                  value={formData.whoAddedActivity}
                  onChange={handleChange}
                />
              </label>

              <label className="vh-span-2">
                <span>Daily Pending Target</span>
                <textarea
                  name="dailyPendingTarget"
                  rows={3}
                  value={formData.dailyPendingTarget}
                  onChange={handleChange}
                  placeholder="Describe pending targets..."
                />
              </label>

              <label className="vh-span-2">
                <span>Reason for Daily Pending Target</span>
                <textarea
                  name="reasonPendingTarget"
                  rows={3}
                  value={formData.reasonPendingTarget}
                  onChange={handleChange}
                  placeholder="Explain the reason for pending targets..."
                />
              </label>
            </>
          )}


          {formData.locationType !== 'leave' && (
            <>
              <label className="vh-span-2">
                <span>Online Support Required</span>
                <select
                  name="onlineSupportRequired"
                  value={formData.onlineSupportRequired}
                  onChange={handleChange}
                >
                  <option value="">Select option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>

              <label className="vh-span-2">
                <span>Engineer Name Who Gives Online Support</span>
                <input
                  type="text"
                  name="supportEngineerName"
                  placeholder="Enter engineer name providing support"
                  value={formData.supportEngineerName}
                  onChange={handleChange}
                />
              </label>
            </>
          )}

          {formData.locationType === 'site' && (
            <>
              <label>
                <span>Site Start Date</span>
                <input
                  type="date"
                  name="siteStartDate"
                  value={formData.siteStartDate}
                  onChange={handleChange}
                />
              </label>

              <label>
                <span>Site End Date</span>
                <input
                  type="date"
                  name="siteEndDate"
                  value={formData.siteEndDate}
                  onChange={handleChange}
                />
              </label>
            </>
          )}

          {formData.locationType !== 'leave' && (
            <label className="vh-span-2">
              <span>Incharge</span>
              <input
                type="text"
                name="incharge"
                placeholder="Enter incharge name"
                value={formData.incharge}
                onChange={handleChange}
              />
            </label>
          )}

          <label className="vh-span-2">
            <span>Remark</span>
            <textarea
              name="remark"
              rows={3}
              value={formData.remark}
              onChange={handleChange}
              placeholder={formData.locationType === 'leave' ? "Optional: Provide a reason for leave..." : "Additional remarks..."}
            />
          </label>
        </div>

        <div className="vh-form-actions">
          <button type="button" onClick={handleSubmit} disabled={submitting || (formData.locationType === 'site' && !locationAccess && !(isEditMode && formData.locationLat && formData.locationLng))}>
            {submitting ? 'Saving…' : isEditMode ? 'Update Report' : 'Submit Report'}
          </button>
          {isEditMode && (
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false)
                setFormData(defaultPayload())
                setLocationAccess(false)
                setLocationError('')
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f5f5f5',
                color: '#092544',
                border: '1px solid #d5e0f2',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Cancel Edit
            </button>
          )}
          <button
            type="button"
            className="ghost"
            onClick={() => {
              const newFormData = defaultPayload()
              setFormData(newFormData)
              setLocationAccess(false)
              setLocationError('')
              setSubmittedData(null)
              setIsEditMode(false)
              // Reset file input
              const fileInput = document.querySelector('input[name="momReport"]')
              if (fileInput) {
                fileInput.value = ''
              }
            }}
            disabled={submitting}
          >
            Reset form
          </button>
        </div>
      </div>
    </section>
  )
}

export default DailyTargetForm
