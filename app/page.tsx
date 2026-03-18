'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// #region agent log
fetch('http://127.0.0.1:7242/ingest/5282c0e2-067e-4fab-b191-bcfaea1a3182',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:4',message:'Before importing supabase client',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
// #endregion
import { supabase } from '@/lib/supabase/client'
// #region agent log
fetch('http://127.0.0.1:7242/ingest/5282c0e2-067e-4fab-b191-bcfaea1a3182',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:9',message:'After importing supabase client',data:{supabaseExists:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
// #endregion

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!profile) {
        router.push('/onboarding')
        return
      }

      setLoading(false)
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

  if (loading) {
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
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '16px' }}>
          You're in
        </h1>
        <p style={{ fontSize: '16px', color: '#aaaaaa' }}>
          Welcome to your Subsounder dashboard.
        </p>
      </div>
    </div>
  )
}
