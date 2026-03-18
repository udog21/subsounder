import { createClient } from '@supabase/supabase-js'

// #region agent log
fetch('http://127.0.0.1:7242/ingest/5282c0e2-067e-4fab-b191-bcfaea1a3182',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/client.ts:3',message:'Module loading - checking env vars',data:{urlExists:!!process.env.NEXT_PUBLIC_SUPABASE_URL,keyExists:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,urlLength:process.env.NEXT_PUBLIC_SUPABASE_URL?.length||0,keyLength:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length||0,allEnvKeys:Object.keys(process.env).filter(k=>k.includes('SUPABASE'))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
// #endregion

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// #region agent log
fetch('http://127.0.0.1:7242/ingest/5282c0e2-067e-4fab-b191-bcfaea1a3182',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/client.ts:11',message:'After assignment - checking values',data:{urlValue:supabaseUrl||'undefined',keyValue:supabaseAnonKey?`${supabaseAnonKey.substring(0,10)}...`:'undefined',urlTruthy:!!supabaseUrl,keyTruthy:!!supabaseAnonKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
// #endregion

if (!supabaseUrl || !supabaseAnonKey) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5282c0e2-067e-4fab-b191-bcfaea1a3182',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/client.ts:18',message:'ERROR: Missing env vars - throwing error',data:{urlMissing:!supabaseUrl,keyMissing:!supabaseAnonKey,nodeEnv:process.env.NODE_ENV,isClient:typeof window!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
  throw new Error('Missing Supabase environment variables')
}

// #region agent log
fetch('http://127.0.0.1:7242/ingest/5282c0e2-067e-4fab-b191-bcfaea1a3182',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/client.ts:24',message:'Successfully creating Supabase client',data:{urlSet:!!supabaseUrl,keySet:!!supabaseAnonKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
// #endregion

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
