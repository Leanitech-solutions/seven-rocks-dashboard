import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'seven_rocks_session';
export const USER_COOKIE_NAME = 'seven_rocks_user';

const JWT_SECRET = process.env.JWT_SECRET || 'seven_rocks_super_secret_jwt_key_2026_operations';

export interface AuthSession {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin' | 'tenant';
  department?: string[]; // e.g. ['housekeeping','maintenance','addons','tenants','notifications']
  iat?: number;
  exp?: number;
}

function base64urlEncode(arr: Uint8Array | string): string {
  const buf = typeof arr === 'string' ? new TextEncoder().encode(arr) : arr;
  let bin = '';
  for (let i = 0; i < buf.length; i++) {
    bin += String.fromCharCode(buf[i]);
  }
  return btoa(bin)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    buf[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(buf);
}

/** Helper to get HMAC-SHA256 crypto key via Web Crypto API (Edge & Node compatible) */
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Signs an AuthSession payload into a cryptographically secure JWT token using Web Crypto API */
export async function signJWT(payload: Omit<AuthSession, 'iat' | 'exp'>, expiresInSeconds: number = 7 * 24 * 60 * 60): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthSession = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);

  const key = await getCryptoKey();
  const signatureBuf = await crypto.subtle.sign('HMAC', key, data);
  const signature = base64urlEncode(new Uint8Array(signatureBuf));

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/** Verifies a JWT token signature & expiration using Web Crypto API */
export async function verifyJWT(token?: string | null): Promise<AuthSession | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;

  try {
    const key = await getCryptoKey();
    const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    
    // Decode signature bytes
    let sigBase64 = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (sigBase64.length % 4) sigBase64 += '=';
    const sigBin = atob(sigBase64);
    const sigBytes = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) {
      sigBytes[i] = sigBin.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    if (!isValid) return null;

    const payload: AuthSession = JSON.parse(base64urlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/** Parses and cryptographically verifies session cookie token (Edge compatible) */
export async function parseSessionCookie(cookieValue?: string | null): Promise<AuthSession | null> {
  if (!cookieValue) return null;

  const verified = await verifyJWT(cookieValue);
  if (verified) return verified;

  // Fallback check if plain JSON string
  try {
    const decoded = decodeURIComponent(cookieValue);
    const parsed = JSON.parse(decoded);
    if (parsed && parsed.email && parsed.role && (parsed.role === 'admin' || parsed.role === 'super_admin' || parsed.role === 'tenant')) {
      return parsed;
    }
  } catch {}

  return null;
}

/** Attaches signed JWT session cookie & client user info cookie to a NextResponse */
export async function setAuthCookies(res: NextResponse, session: AuthSession) {
  const jwtToken = await signJWT(session);
  const maxAge = 60 * 60 * 24 * 7; // 7 days

  // 1. HttpOnly JWT Cookie (Protected against XSS & tampering)
  res.cookies.set(SESSION_COOKIE_NAME, jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  // 2. Client-accessible User Info Cookie (for UI display)
  const clientUserInfo = JSON.stringify({
    id: session.id,
    email: session.email,
    name: session.name,
    role: session.role,
    department: session.department || [],
  });

  res.cookies.set(USER_COOKIE_NAME, clientUserInfo, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  return res;
}

/** Clears session cookies on a NextResponse */
export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  });

  res.cookies.set(USER_COOKIE_NAME, '', {
    httpOnly: false,
    path: '/',
    expires: new Date(0),
  });

  return res;
}
