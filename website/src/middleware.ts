/**
 * Staging Gates Middleware
 * Basic auth when STAGING=true; robots.txt disallow + noindex,nofollow
 */

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const isStaging = process.env.STAGING === 'true';
  
  if (!isStaging) {
    return NextResponse.next();
  }

  // Check for basic auth
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Staging Environment"',
        'X-Robots-Tag': 'noindex,nofollow',
      },
    });
  }

  // Verify credentials
  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');
  
  const validUsername = process.env.STAGING_USERNAME || 'admin';
  const validPassword = process.env.STAGING_PASSWORD || 'staging123';
  
  if (username !== validUsername || password !== validPassword) {
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Staging Environment"',
        'X-Robots-Tag': 'noindex,nofollow',
      },
    });
  }

  // Add staging headers
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex,nofollow');
  response.headers.set('X-Staging-Environment', 'true');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
