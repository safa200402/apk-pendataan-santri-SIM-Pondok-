// Meniru persis pola requestApi() di frontend/pages/login/index.html supaya konsisten dengan
// backend/server.js yang sudah ada -- satu endpoint /api, action lewat query/body, token custom
// header TIDAK dipakai (form-encoded field `token`, bukan header), sesuai kode lama.
const API_BASE = window.location.origin + '/api'
const TOKEN_KEY = 'ps_v2_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function toParams(data) {
  const params = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  })
  return params
}

export async function api(action, payload = {}, method = 'GET', includeToken = true) {
  const data = { action, ...payload }
  if (includeToken) {
    const token = getToken()
    if (!token) {
      const error = new Error('Belum ada token sesi.')
      error.code = 401
      throw error
    }
    data.token = token
  }

  const response = method === 'GET'
    ? await fetch(`${API_BASE}?${toParams(data).toString()}`)
    : await fetch(API_BASE, { method, body: toParams(data) })

  const json = await response.json()
  if (!json.ok) {
    const message = (json.error && json.error.message) || 'Permintaan gagal.'
    const error = new Error(message)
    error.code = (json.error && json.error.code) || response.status || 500
    throw error
  }
  return json.data
}
