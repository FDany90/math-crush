import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Metrics from './Metrics.jsx'
import './styles.css'

// Ruteo simple por path: /metricas → panel de estadísticas; resto → el juego.
const path = window.location.pathname.replace(/\/+$/, '')
const isMetrics = path === '/metricas'

if (isMetrics) document.body.classList.add('metrics-page')   // permite scroll normal del documento

createRoot(document.getElementById('root')).render(isMetrics ? <Metrics /> : <App />)
