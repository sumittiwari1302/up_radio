import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { installErrorMonitoring } from './lib/errorReporter.js'
import './index.css'

installErrorMonitoring()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
