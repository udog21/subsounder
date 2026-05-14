import { createClient } from './supabase/server'
import { supabase } from './supabase/client'

export interface Profile {
  id: string
  pod_id: string
  display_name: string | null
  email: string | null
  phone_e164: string | null
  timezone: string
  currency: string
  reminder_days_before: number
  created_at: string
}

/**
 * Get the current session (client-side)
 */
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * Get the current user (client-side)
 */
export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Get the profile for the current authenticated user (server-side)
 */
export async function getProfileForUser(userId: string): Promise<Profile | null> {
  const supabaseClient = await createClient()
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw error
  }

  return data as Profile
}

/**
 * Get the current session (server-side)
 */
export async function getServerSession() {
  const supabaseClient = await createClient()
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession()
  return { session, error }
}
