const SECRET = process.env.SESSION_SECRET ?? 'tuk-secret'
const COOKIE_NAME = 'tuk_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7일

const enc = new TextEncoder()

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function createSessionToken(): Promise<string> {
  const payload = `tuk:${Date.now()}`
  const key = await getKey()
  const sig = toHex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)))
  return btoa(`${payload}.${sig}`)
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const decoded = atob(token)
    const lastDot = decoded.lastIndexOf('.')
    const payload = decoded.slice(0, lastDot)
    const sig = decoded.slice(lastDot + 1)
    const key = await getKey()
    const expected = toHex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)))
    return sig === expected
  } catch {
    return false
  }
}

export { COOKIE_NAME, MAX_AGE }
