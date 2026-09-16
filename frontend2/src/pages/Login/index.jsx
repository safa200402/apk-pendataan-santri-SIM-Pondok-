import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, saveToken } from '../../lib/api.js'
import { useSession } from '../../access/SessionContext.jsx'
import styles from './Login.module.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useSession()

  async function handleSubmit(event) {
    event.preventDefault()
    if (!username.trim() || !password.trim()) {
      setMessage('Username dan password wajib diisi.')
      return
    }
    setBusy(true)
    setMessage('Memeriksa kredensial...')
    try {
      const data = await api('login', { username: username.trim(), password: password.trim() }, 'POST', false)
      if (!data.session || data.session.role !== 'pengurus') {
        throw new Error('Akun ini bukan pengurus aktif.')
      }
      saveToken(data.token)
      await refresh()
      setMessage(`Login berhasil sebagai ${data.session.name}. Mengalihkan...`)
      navigate('/beranda', { replace: true })
    } catch (error) {
      setMessage(error.message || 'Login gagal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Masuk &middot; Pendataan Santri (v2)</h1>
        <label className={styles.field}>
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Memeriksa...' : 'Masuk'}
        </button>
        {message && <p className={styles.message}>{message}</p>}
      </form>
    </div>
  )
}
