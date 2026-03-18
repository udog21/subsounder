'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  // Check auth and existing profile
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      // Check if profile already exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        router.push('/')
        return
      }

      setChecking(false)
    }

    checkAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      // Call the RPC function
      const { data, error } = await supabase.rpc('create_pod_and_profile', {
        user_id: session.user.id,
        user_display_name: displayName.trim(),
        user_email: session.user.email || null,
      })

      if (error) throw error

      // Success - redirect to dashboard
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to create profile')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#cccccc' }}>Loading...</div>
      </div>
    )
  }

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
          Welcome to Subsounder
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#aaaaaa',
            marginBottom: '24px',
          }}
        >
          Let's get you set up with your profile.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="displayName"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#cccccc',
              }}
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
              placeholder="Your name"
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
            disabled={loading || !displayName.trim()}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#333333' : '#ffffff',
              color: loading ? '#666666' : '#000000',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading || !displayName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating...' : 'Create profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
