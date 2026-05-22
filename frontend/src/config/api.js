/**
 * config/api.js
 * Development:  http://127.0.0.1:8000/api
 * Production:   https://codemind-ide-backend.onrender.com/api
 */
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://127.0.0.1:8000/api'

export default API_BASE
