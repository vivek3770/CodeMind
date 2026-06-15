/**
 * config/api.js
 * Development:  http://127.0.0.1:8000/api
 * Production:   https://codemind-ide-backend.onrender.com/api
 */
export const API_ROOT = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
export const API_BASE = `${API_ROOT}/api`

export default API_BASE

