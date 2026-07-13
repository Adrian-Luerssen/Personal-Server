import React from 'react'
import { createRoot } from 'react-dom/client'
import AppRouter from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/shell.css'
import './styles/primitives.css'
import './styles/domains/today.css'
import './styles.css'
import './i18n' // Initialize i18n

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
)
