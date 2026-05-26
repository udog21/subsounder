'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function dismissSubscription(subscriptionId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('profiles')
    .select('pod_id')
    .eq('id', user.id)
    .single()
  if (!profile) throw new Error('no_profile')

  const { error } = await svc
    .from('subscriptions')
    .update({ deleted_by_user: true })
    .eq('id', subscriptionId)
    .eq('pod_id', profile.pod_id)

  if (error) throw new Error(`dismiss_failed: ${error.message}`)

  revalidatePath('/')
}
