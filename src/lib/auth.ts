// Auth utilities — cookie signing and verification.
// Use HMAC-SHA256 to sign a session token so the cookie can't be forged without knowing AUTH_SECRET.
// Cookie format: <token>.<hmac-hex>
// The token is a random hex string set at login; the HMAC binds it to the secret.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const AUTH_SECRET = process.env['AUTH_SECRET'] ?? ''
const COOKIE_NAME = 'dockyard_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

if (!AUTH_SECRET && process.env['NODE_ENV'] !== 'test') {
  console.warn('[auth] WARNING: AUTH_SECRET is not set — sessions will not be secure')
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------
function sign(token: string): string {
  return createHmac('sha256', AUTH_SECRET).update(token).digest('hex')
}

/** Create a signed cookie value from a fresh random token. */
export function createSession(): string {
  const token = randomBytes(32).toString('hex')
  return `${token}.${sign(token)}`
}

/**
 * Verify a cookie value. Returns true only if the signature is valid.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifySession(cookieValue: string): boolean {
  const dotIdx = cookieValue.lastIndexOf('.')
  if (dotIdx === -1) return false

  const token = cookieValue.slice(0, dotIdx)
  const provided = cookieValue.slice(dotIdx + 1)
  const expected = sign(token)

  if (provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------
export const cookieName = COOKIE_NAME

/** The Set-Cookie header string for a successful login. */
export function sessionCookieHeader(session: string): string {
  return [
    `${COOKIE_NAME}=${session}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    // Add Secure in production, so cookie will be sent only over https, otherwise in http it could be intercepted.
    process.env['NODE_ENV'] === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

/** The Set-Cookie header string to clear the session (logout). */
export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`
}
