import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle errors from Supabase (e.g., expired OTP)
  if (error) {
    const errorMessage = errorDescription 
      ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
      : error === 'otp_expired' 
        ? 'This magic link has expired. Please request a new one.'
        : 'Authentication failed. Please try again.'
    
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      const errorMessage = exchangeError.message || 'Failed to authenticate. Please try again.'
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
      )
    }
  }

  // Redirect to app or onboarding - the client will handle the routing
  return NextResponse.redirect(new URL('/login', request.url))
}
