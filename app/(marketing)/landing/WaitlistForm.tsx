'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import styles from './page.module.css'

type State = 'idle' | 'waitlisted' | 'error'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function loginUrl(email: string): string {
  const isLocal = LOCAL_HOSTS.has(window.location.hostname)
  const base = isLocal ? '' : 'https://app.subsounder.com'
  return `${base}/login?email=${encodeURIComponent(email)}`
}

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setState('idle')
    setErrorMsg('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setState('error')
        setErrorMsg(data?.error ?? 'Something went wrong. Please try again.')
        return
      }

      if (data?.action === 'login' && typeof data?.email === 'string') {
        window.location.href = loginUrl(data.email)
        return
      }

      setState('waitlisted')
    } catch {
      setState('error')
      setErrorMsg('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (state === 'waitlisted') {
    return (
      <div className={styles.formConfirm}>
        <strong className={styles.formConfirmHead}>You&rsquo;re on the waitlist.</strong>
        <p className={styles.formConfirmBody}>
          We&rsquo;ll be in touch when access opens.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.formRow}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={styles.formInput}
          disabled={loading}
          autoComplete="email"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={loading || !email}
          className={styles.formButton}
        >
          {loading ? 'Joining…' : 'Join the waitlist'}
        </button>
      </div>
      {state === 'error' && <p className={styles.formError}>{errorMsg}</p>}
    </form>
  )
}
