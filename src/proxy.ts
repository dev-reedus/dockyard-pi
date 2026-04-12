// Next.js middleware — runs before every matched request.
// Protects all dashboard routes by checking the session cookie.
// Unauthenticated requests are redirected to /login.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookieName, verifySession } from './lib/auth'

export default function proxy(req: NextRequest): NextResponse {
  const session = req.cookies.get(cookieName)?.value

  // Allow through if the session cookie is present and valid
  if (session && verifySession(session)) {
    return NextResponse.next()
  }

  // Redirect to login, preserving the intended destination
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('from', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

// Only run middleware on dashboard routes — not on login, API routes, or static files
export const config = {
  matcher: ['/dashboard/:path*', '/services/:path*', '/deployments/:path*', '/settings/:path*'],
}
