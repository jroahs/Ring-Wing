import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Only use StrictMode in development to avoid doubled API calls in production
const isDevelopment = import.meta.env.DEV;

createRoot(document.getElementById('root')).render(
  isDevelopment ? (
    <StrictMode>
      <App />
    </StrictMode>
  ) : (
    <App />
  )
)