import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, parseSessionCookie } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  const rawCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await parseSessionCookie(rawCookie);

  // Protect Admin Dashboard routes (/dashboard/*)
  if (pathname.startsWith('/dashboard')) {
    if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
      const loginUrl = new URL('/', req.url);
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    // Department-based route protection (skip for super_admin)
    if (session.role === 'admin') {
      const departmentRouteMap: Record<string, string> = {
        '/dashboard/tenants': 'tenants',
        '/dashboard/notifications': 'notifications',
        '/dashboard/addons': 'addons',
        '/dashboard/housekeeping': 'housekeeping',
        '/dashboard/billing': 'billing',
      };

      const departments = Array.isArray(session.department) ? session.department : [];

      for (const [route, dept] of Object.entries(departmentRouteMap)) {
        if (pathname.startsWith(route) && !departments.includes(dept)) {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      }
    }
  }

  // Protect Resident Portal routes (/portal/*)
  if (pathname.startsWith('/portal')) {
    if (!session || session.role !== 'tenant') {
      const loginUrl = new URL('/', req.url);
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already authenticated and visiting login page ('/'), redirect to appropriate portal
  if (pathname === '/') {
    if (session?.role === 'admin' || session?.role === 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (session?.role === 'tenant') {
      return NextResponse.redirect(new URL('/portal', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/portal/:path*', '/'],
};
