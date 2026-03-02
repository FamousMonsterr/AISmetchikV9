import { NextRequest, NextResponse } from 'next/server';

const STATIC_PREFIXES = ['/api', '/_next', '/favicon.ico', '/robots.txt', '/sitemap.xml', '/manifest.json', '/icons'];

type HostRule = {
  hostPrefix: string;
  rootPath: string;
  routePrefix?: string;
  forceRootOnly?: boolean;
};

const HOST_RULES: HostRule[] = [
  { hostPrefix: 'admin.', rootPath: '/dashboard/admin', routePrefix: '/dashboard/admin' },
  { hostPrefix: 'lk.', rootPath: '/dashboard', routePrefix: '/dashboard' },
  { hostPrefix: 'crm.', rootPath: '/crm', routePrefix: '/crm' },
  { hostPrefix: 'partner.', rootPath: '/partner', routePrefix: '/partner' },
  { hostPrefix: 'm.', rootPath: '/dashboard/mobile-panel', forceRootOnly: true },
];

const APP_SURFACE = (process.env.APP_SURFACE || '').toLowerCase();

function isStaticPath(pathname: string) {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function normalizeHost(hostHeader: string | null) {
  return (hostHeader || '').toLowerCase().split(':')[0];
}

function allowAuthPath(pathname: string) {
  return pathname.startsWith('/auth');
}

function rewriteTo(request: NextRequest, targetPath: string) {
  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = targetPath;
  return NextResponse.rewrite(nextUrl);
}

function notFound() {
  return new NextResponse('Not Found', { status: 404 });
}

function handleDedicatedSurface(request: NextRequest, pathname: string) {
  if (!APP_SURFACE) return null;
  if (isStaticPath(pathname)) return NextResponse.next();
  if (allowAuthPath(pathname)) return NextResponse.next();

  if (APP_SURFACE === 'landing') {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/crm') || pathname.startsWith('/partner')) {
      return notFound();
    }
    return NextResponse.next();
  }

  if (APP_SURFACE === 'admin') {
    if (pathname === '/') return rewriteTo(request, '/dashboard/admin');
    if (pathname.startsWith('/dashboard/admin')) return NextResponse.next();
    return notFound();
  }

  if (APP_SURFACE === 'lk') {
    if (pathname === '/') return rewriteTo(request, '/dashboard');
    if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/admin')) return NextResponse.next();
    return notFound();
  }

  if (APP_SURFACE === 'crm') {
    if (pathname === '/') return rewriteTo(request, '/crm');
    if (pathname.startsWith('/crm')) return NextResponse.next();
    return notFound();
  }

  if (APP_SURFACE === 'partner') {
    if (pathname === '/') return rewriteTo(request, '/partner');
    if (pathname.startsWith('/partner')) return NextResponse.next();
    return notFound();
  }

  if (APP_SURFACE === 'mobile') {
    if (pathname === '/') return rewriteTo(request, '/dashboard/mobile-panel');
    if (pathname === '/dashboard/mobile-panel') return NextResponse.next();
    return notFound();
  }

  return notFound();
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const surfaceResponse = handleDedicatedSurface(request, pathname);
  if (surfaceResponse) {
    return surfaceResponse;
  }
  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  const host = normalizeHost(request.headers.get('host'));
  const rule = HOST_RULES.find((entry) => host.startsWith(entry.hostPrefix));
  if (!rule) {
    return NextResponse.next();
  }

  if (allowAuthPath(pathname)) {
    return NextResponse.next();
  }

  if (rule.forceRootOnly) {
    if (pathname !== rule.rootPath) {
      return rewriteTo(request, rule.rootPath);
    }
    return NextResponse.next();
  }

  if (pathname === '/') {
    return rewriteTo(request, rule.rootPath);
  }

  if (rule.routePrefix && pathname.startsWith(rule.routePrefix)) {
    return NextResponse.next();
  }

  if (rule.routePrefix) {
    return rewriteTo(request, `${rule.routePrefix}${pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
