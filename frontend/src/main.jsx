import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { clearStorage } from './hooks/useStorage'

clearStorage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
