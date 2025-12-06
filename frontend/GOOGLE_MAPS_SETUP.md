# Google Maps API Setup Guide

## Why Use Google Maps API?

Google Maps Geocoding API provides more accurate location detection, especially for Indian addresses. It will help fetch the correct address like "M Phulenagar, Jijamata Park, Chinchwad, Pimpri-Chinchwad, Maharashtra 411019" instead of incorrect addresses.

## Steps to Get Google Maps API Key

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click on the project dropdown at the top
4. Click "New Project"
5. Enter a project name (e.g., "Vickhardth Site Pulse")
6. Click "Create"

### 2. Enable Geocoding API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Geocoding API"
3. Click on "Geocoding API"
4. Click "Enable"

### 3. Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key that appears
4. (Optional but recommended) Click "Restrict Key" to:
   - Restrict to "Geocoding API" only
   - Add HTTP referrer restrictions for your domain

### 4. Add API Key to Project

1. In the `frontend` folder, create a file named `.env` (copy from `.env.example`)
2. Add your API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```
3. Save the file
4. Restart your frontend development server

## Important Notes

- **Free Tier**: Google Maps provides $200 free credit per month, which is enough for thousands of geocoding requests
- **Security**: Never commit your `.env` file to version control (it's already in `.gitignore`)
- **Billing**: Make sure to set up billing alerts in Google Cloud Console to avoid unexpected charges

## Testing

After adding the API key:
1. Restart your frontend server (`npm run dev`)
2. Try the "Get Location" button in the Daily Target Report form
3. The system will now use Google Maps API first for more accurate results

