import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initPwa } from './pwa'
import { captureAttribution } from './utils/attribution'

// Capture gclid / utm from the ad landing URL before anything navigates away.
captureAttribution()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker after render so it never competes with first paint.
initPwa()
