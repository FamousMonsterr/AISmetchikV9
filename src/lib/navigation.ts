type LocationLike = Pick<Location, 'origin' | 'hostname' | 'protocol'>;

export type DashboardSurface = 'admin' | 'lk' | 'crm' | 'partner' | 'mobile';

export type PostAuthUser = {
  systemRole?: string | null;
  plan?: string | null;
  isPartner?: boolean | null;
};

const SURFACE_HOST_PREFIXES: Record<DashboardSurface, string> = {
  admin: 'admin.',
  lk: 'lk.',
  crm: 'crm.',
  partner: 'partner.',
  mobile: 'm.',
};

const SURFACE_ROOT_PATHS: Record<DashboardSurface, string> = {
  admin: '/dashboard/admin',
  lk: '/dashboard',
  crm: '/crm',
  partner: '/partner',
  mobile: '/dashboard/mobile-panel',
};

const KNOWN_HOST_PREFIXES = Object.values(SURFACE_HOST_PREFIXES);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

function getBrowserLocation(): LocationLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location;
}

function getConfiguredSiteUrl(): LocationLike | null {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    return parsed;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

function stripKnownPrefix(hostname: string) {
  const lowerHost = hostname.toLowerCase();
  for (const prefix of KNOWN_HOST_PREFIXES) {
    if (lowerHost.startsWith(prefix)) {
      return lowerHost.slice(prefix.length);
    }
  }
  if (lowerHost.startsWith('www.')) {
    return lowerHost.slice(4);
  }
  return lowerHost;
}

function isAdminRole(role?: string | null) {
  const normalized = role?.trim().toLowerCase();
  return normalized === 'super admin' || normalized === 'admin';
}

function resolveSurfaceFromHostname(hostname: string): DashboardSurface | null {
  const lowerHost = hostname.toLowerCase();
  for (const [surface, prefix] of Object.entries(SURFACE_HOST_PREFIXES) as Array<[DashboardSurface, string]>) {
    if (lowerHost.startsWith(prefix)) {
      return surface;
    }
  }
  return null;
}

function getRootOrigin(reference?: LocationLike | null) {
  const source = getConfiguredSiteUrl() || reference || getBrowserLocation();
  if (!source) {
    return null;
  }

  if (isLocalHostname(source.hostname)) {
    return source.origin;
  }

  const rootUrl = new URL(source.origin);
  rootUrl.hostname = stripKnownPrefix(source.hostname);
  return rootUrl.origin;
}

function buildSurfaceOrigin(surface: DashboardSurface, reference?: LocationLike | null) {
  const rootOrigin = getRootOrigin(reference);
  if (!rootOrigin) {
    return null;
  }

  const rootUrl = new URL(rootOrigin);
  if (isLocalHostname(rootUrl.hostname)) {
    return rootOrigin;
  }

  rootUrl.hostname = `${SURFACE_HOST_PREFIXES[surface]}${rootUrl.hostname}`;
  return rootUrl.origin;
}

function buildAbsoluteUrl(origin: string, pathname: string) {
  const url = new URL(origin);
  url.pathname = pathname;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function resolvePreferredSurface(
  user?: PostAuthUser,
  currentSurface?: DashboardSurface | null,
  preferredSurface?: DashboardSurface | null,
): DashboardSurface {
  if (isAdminRole(user?.systemRole)) {
    return 'admin';
  }

  if (preferredSurface) {
    return preferredSurface;
  }

  if (user?.isPartner) {
    return 'partner';
  }

  if (currentSurface) {
    return currentSurface;
  }

  return 'lk';
}

export function resolveLandingUrl() {
  const browserLocation = getBrowserLocation();
  const rootOrigin = getRootOrigin(browserLocation);

  if (!rootOrigin) {
    return '/';
  }

  const rootUrl = new URL(rootOrigin);
  if (isLocalHostname(rootUrl.hostname)) {
    return '/';
  }

  rootUrl.pathname = '/';
  rootUrl.search = '';
  rootUrl.hash = '';
  return rootUrl.toString();
}

export function resolvePostAuthRedirectUrl(user?: PostAuthUser, preferredSurface?: DashboardSurface | null) {
  const browserLocation = getBrowserLocation();
  const currentSurface = browserLocation ? resolveSurfaceFromHostname(browserLocation.hostname) : null;
  const targetSurface = resolvePreferredSurface(user, currentSurface, preferredSurface);
  const targetPath = SURFACE_ROOT_PATHS[targetSurface];

  if (currentSurface && browserLocation) {
    return buildAbsoluteUrl(browserLocation.origin, targetPath);
  }

  const targetOrigin = buildSurfaceOrigin(targetSurface, browserLocation);
  if (!targetOrigin) {
    return targetPath;
  }

  return buildAbsoluteUrl(targetOrigin, targetPath);
}
