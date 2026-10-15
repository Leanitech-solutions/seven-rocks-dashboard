import { NextResponse } from 'next/server';
import { clearAuthCookies } from '../../../lib/auth';

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear HTTP-only session cookies
  clearAuthCookies(res);

  return res;
}
