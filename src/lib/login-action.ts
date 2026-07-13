'use server'
// Server Actions for login and logout.
// Called directly from forms — no API route needed.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { timingSafeEqual } from 'crypto'
import { cookieName, createSession, shouldUseSecureCookies } from '@/lib/auth'

const AUTH_PASSWORD = process.env['AUTH_PASSWORD'] ?? ''

export async function login(_prevState: unknown, formData: FormData): Promise<{ error: string }> {
  const password = formData.get('password')

  if (typeof password !== 'string' || !password) {
    return { error: 'Password is required' }
  }

  // Timing-safe comparison prevents inferring the password from response time
  const providedBuf = Buffer.from(password)
  const expectedBuf = Buffer.from(AUTH_PASSWORD)

  const valid =
    AUTH_PASSWORD.length > 0 &&
    providedBuf.length === expectedBuf.length &&
    timingSafeEqual(providedBuf, expectedBuf)

  if (!valid) {
    return { error: 'Incorrect password' }
  }

  const cookieStore = await cookies()
  cookieStore.set(cookieName, createSession(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: shouldUseSecureCookies(),
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(cookieName, '', { httpOnly: true, maxAge: 0, path: '/' })
  redirect('/login')
}
