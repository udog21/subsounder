# Subsounder

Track your subscriptions with Subsounder.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
```bash
cp .env.local.example .env.local
```

3. Run the Supabase migration:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the SQL from `supabase/migrations/20240101000000_create_pod_and_profile_rpc.sql`

4. Configure Supabase Auth redirect URLs:
   - Go to Supabase Dashboard > Authentication > URL Configuration
   - Add to **Redirect URLs**:
     - `http://localhost:3000/auth/callback` (local dev)
     - `https://app.subsounder.com/auth/callback` (production)
   - Set **Site URL** to:
     - `http://localhost:3000` (local dev) or
     - `https://app.subsounder.com` (production)

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) in your browser.

## Project Structure

- `app/` - Next.js App Router pages
  - `login/` - Magic link authentication
  - `auth/callback/` - OAuth callback handler
  - `onboarding/` - New user profile creation
  - `app/` - Main application dashboard
- `lib/` - Shared utilities
  - `supabase/` - Supabase client configuration
  - `auth.ts` - Authentication helpers
- `supabase/migrations/` - Database migrations

## Manual Testing Checklist

### Test 1: New User Flow
1. Navigate to `/login`
2. Enter email address and click "Send magic link"
3. Check email and click the magic link
4. Should redirect to `/onboarding`
5. Enter display name and submit
6. Should redirect to `/app` with "You're in" message

### Test 2: Returning User
1. After completing Test 1, log out (if logout is implemented) or clear session
2. Navigate to `/login`
3. Enter same email and click magic link
4. After authentication, should redirect directly to `/app` (skip onboarding)

### Test 3: Idempotency Test
1. Complete onboarding to create pod + profile
2. Without refreshing, submit the onboarding form again (if possible) OR
3. Manually navigate to `/onboarding` and try to submit again
4. Should NOT create duplicate pods/profiles (RPC function should return existing records)

### Test 4: Unauthenticated Access
1. Clear all cookies/session storage
2. Navigate directly to `/onboarding`
3. Should redirect to `/login`
4. Navigate directly to `/app`
5. Should redirect to `/login`

### Test 5: Profile Already Exists
1. With an authenticated user who has a profile
2. Navigate directly to `/onboarding`
3. Should redirect to `/app`
