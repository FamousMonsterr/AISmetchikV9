import { NextRequest, NextResponse } from 'next/server';

const STATIC_PREFIXES = ['/api', '/_next', '/favicon.ico', '/robots.txt', '/sitemap.xml', '/manifest.json', '/icons'];
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

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
const ROOT_DOMAIN_REDIRECTS: Array<{ routePrefix: string; hostPrefix: string }> = [
  { routePrefix: '/dashboard/admin', hostPrefix: 'admin.' },
  { routePrefix: '/dashboard/mobile-panel', hostPrefix: 'm.' },
  { routePrefix: '/dashboard', hostPrefix: 'lk.' },
  { routePrefix: '/crm', hostPrefix: 'crm.' },
  { routePrefix: '/partner', hostPrefix: 'partner.' },
];

const APP_SURFACE = (process.env.APP_SURFACE || '').toLowerCase();

function isStaticPath(pathname: string) {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function normalizeHost(hostHeader: string | null) {
  return (hostHeader || '').toLowerCase().split(':')[0];
}

function isLocalHostname(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

function allowAuthPath(pathname: string) {
  return pathname.startsWith('/auth');
}

function stripKnownPrefix(hostname: string) {
  const lowerHost = hostname.toLowerCase();
  if (lowerHost.startsWith('www.')) {
    return lowerHost.slice(4);
  }

  const knownRule = HOST_RULES.find((entry) => lowerHost.startsWith(entry.hostPrefix));
  if (knownRule) {
    return lowerHost.slice(knownRule.hostPrefix.length);
  }

  return lowerHost;
}

function rewriteTo(request: NextRequest, targetPath: string) {
  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = targetPath;
  return NextResponse.rewrite(nextUrl);
}

function redirectTo(request: NextRequest, targetPath: string) {
  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = targetPath;
  return NextResponse.redirect(nextUrl);
}

function notFound() {
  return new NextResponse('Not Found', { status: 404 });
}

function handleRootDomainCrossSurfaceRedirect(request: NextRequest, pathname: string, host: string) {
  if (isLocalHostname(host)) {
    return null;
  }

  if (HOST_RULES.some((entry) => host.startsWith(entry.hostPrefix))) {
    return null;
  }

  const target = ROOT_DOMAIN_REDIRECTS.find((entry) => pathname === entry.routePrefix || pathname.startsWith(`${entry.routePrefix}/`));
  if (!target) {
    return null;
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.hostname = `${target.hostPrefix}${stripKnownPrefix(host)}`;
  return NextResponse.redirect(nextUrl);
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
    if (pathname === '/') return redirectTo(request, '/dashboard/admin');
    if (pathname.startsWith('/dashboard/admin')) return NextResponse.next();
    return notFound();
  }

  if (APP_SURFACE === 'lk') {
    if (pathname === '/') return redirectTo(request, '/dashboard');
    if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/admin')) return NextResponse.next();
    return notFound();
  }

  if (APP_SURFACE === 'crm') {
    if (pathname === '/') return redirectTo(request, '/crm');
    if (pathname.startsWith('/crm')) return NextResponse.next();
    return notFound();
  }

  if (APP_SURFACE === 'partner') {
    if (pathname === '/') return redirectTo(request, '/partner');
    if (pathname.startsWith('/partner')) return NextResponse.next();
    return notFound();
  }

  if (APP_SURFACE === 'mobile') {
    if (pathname === '/') return redirectTo(request, '/dashboard/mobile-panel');
    if (pathname === '/dashboard/mobile-panel') return NextResponse.next();
    return notFound();
  }

  return notFound();
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  const host = normalizeHost(request.headers.get('host'));
  const crossSurfaceRedirect = handleRootDomainCrossSurfaceRedirect(request, pathname, host);
  if (crossSurfaceRedirect) {
    return crossSurfaceRedirect;
  }

  const surfaceResponse = handleDedicatedSurface(request, pathname);
  if (surfaceResponse) {
    return surfaceResponse;
  }

  const rule = HOST_RULES.find((entry) => host.startsWith(entry.hostPrefix));
  if (!rule) {
    return NextResponse.next();
  }

  if (allowAuthPath(pathname)) {
    return NextResponse.next();
  }

  if (rule.forceRootOnly) {
    if (pathname !== rule.rootPath) {
      return redirectTo(request, rule.rootPath);
    }
    return NextResponse.next();
  }

  if (pathname === '/') {
    return redirectTo(request, rule.rootPath);
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
