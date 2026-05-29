import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const APP_HOST = 'app.subsounder.com'
const APEX_HOSTS = new Set(['subsounder.com', 'www.subsounder.com'])

const MARKETING_PATHS = new Set(['/', '/privacy', '/terms'])

// Paths that only make sense on the app subdomain. If we see them on the
// apex, redirect to the app subdomain. /api is intentionally NOT here:
// /api/waitlist needs to be reachable from the apex landing form.
const APP_ONLY_PREFIXES = ['/login', '/onboarding', '/auth']

function isAppOnly(pathname: string): boolean {
  return APP_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function middleware(req: NextRequest) {
  const rawHost = req.headers.get('host') ?? ''
  const host = rawHost.split(':')[0].toLowerCase()
  const url = req.nextUrl

  // Localhost / preview hosts: serve everything, no host gating. Local dev
  // hits all routes directly (/landing, /privacy, /terms, /, /login, etc.).
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.workers.dev')
  ) {
    return NextResponse.next()
  }

  // Apex: subsounder.com + www.subsounder.com → marketing only.
  if (APEX_HOSTS.has(host)) {
    // Always normalize www → apex (canonical).
    if (host === 'www.subsounder.com') {
      const redirectUrl = new URL(url.pathname + url.search, 'https://subsounder.com')
      return NextResponse.redirect(redirectUrl, 308)
    }

    // /  →  rewrite internally to /landing (URL stays /).
    if (url.pathname === '/') {
      const rewritten = url.clone()
      rewritten.pathname = '/landing'
      return NextResponse.rewrite(rewritten)
    }

    // Canonicalize: /landing on the apex → /.
    if (url.pathname === '/landing') {
      const target = new URL('/' + url.search, 'https://subsounder.com')
      return NextResponse.redirect(target, 308)
    }

    // /privacy and /terms render as-is.
    if (MARKETING_PATHS.has(url.pathname)) {
      return NextResponse.next()
    }

    // App-only paths on the apex → redirect to the app subdomain.
    if (isAppOnly(url.pathname)) {
      const target = new URL(url.pathname + url.search, `https://${APP_HOST}`)
      return NextResponse.redirect(target, 308)
    }

    return NextResponse.next()
  }

  // App subdomain: keep marketing paths off it. Redirect /privacy and /terms
  // to the apex so there's one canonical home for them.
  if (host === APP_HOST) {
    if (url.pathname === '/privacy' || url.pathname === '/terms') {
      const target = new URL(url.pathname + url.search, 'https://subsounder.com')
      return NextResponse.redirect(target, 308)
    }

    // /landing on the app subdomain → bounce to the apex landing.
    if (url.pathname === '/landing') {
      const target = new URL('/', 'https://subsounder.com')
      return NextResponse.redirect(target, 308)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Skip static assets, _next internals, and the public folder.
  matcher: ['/((?!_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$).*)'],
}
