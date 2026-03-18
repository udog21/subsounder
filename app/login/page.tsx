'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check for error from URL params or hash (e.g., from auth callback)
  useEffect(() => {
    // Check query params
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      // Clean up URL
      router.replace('/login', { scroll: false })
      return
    }

    // Check hash fragment (Supabase sometimes puts errors in hash)
    const hash = window.location.hash
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const hashError = hashParams.get('error')
      const hashErrorDescription = hashParams.get('error_description')
      
      if (hashError) {
        const errorMessage = hashErrorDescription 
          ? decodeURIComponent(hashErrorDescription.replace(/\+/g, ' '))
          : hashError === 'otp_expired'
            ? 'This magic link has expired. Please request a new one.'
            : 'Authentication failed. Please try again.'
        
        setError(errorMessage)
        // Clean up URL
        window.history.replaceState(null, '', '/login')
      }
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        // Check if profile exists
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          router.push('/')
        } else {
          router.push('/onboarding')
        }
      }
    }

    checkAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          router.push('/')
        } else {
          router.push('/onboarding')
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#111111',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '32px',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
          Sign in to Subsounder
        </h1>

        {success ? (
          <div
            style={{
              padding: '12px',
              background: '#1a3a1a',
              border: '1px solid #2d5a2d',
              borderRadius: '4px',
              marginBottom: '16px',
              color: '#90ee90',
            }}
          >
            Check your email for the magic link!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#cccccc',
                }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#000000',
                  border: '1px solid #333333',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '14px',
                }}
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '12px',
                  background: '#3a1a1a',
                  border: '1px solid #5a2d2d',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  color: '#ee9090',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#333333' : '#ffffff',
                color: loading ? '#666666' : '#000000',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading || !email ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
