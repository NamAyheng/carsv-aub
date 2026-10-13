import type { CustomerTab } from './components/customer/CustomerPortalApp';

export const publicPaths = {
  home: '/',
  about: '/about',
  services: '/services',
  howItWorks: '/how-it-works',
  liveBay: '/live-bay',
  blog: '/blog',
  contact: '/contact',
} as const;

export const portalPaths: Record<CustomerTab, string> = {
  DASHBOARD: '/dashboard',
  VEHICLES: '/vehicles',
  APPOINTMENTS: '/appointments',
  TRACKING: '/tracking',
  QUOTES: '/quotes',
  PARTS_PRODUCTS: '/parts',
  INVOICES: '/invoices',
  DOCUMENTS: '/documents',
  FEEDBACK: '/reviews',
  PROFILE: '/profile',
};

const pathBySection: Record<string, string> = {
  home: publicPaths.home,
  about: publicPaths.about,
  services: publicPaths.services,
  'how-it-works': publicPaths.howItWorks,
  transparency: publicPaths.liveBay,
  blog: publicPaths.blog,
  contact: publicPaths.contact,
};

export function pathForSection(id: string): string {
  return pathBySection[id] || publicPaths.home;
}

export function sectionForPath(pathname: string): 'home' | 'about' | 'services' | 'how-it-works' | 'live-bay' | 'contact' | 'blog' {
  if (pathname === publicPaths.about) return 'about';
  if (pathname === publicPaths.services) return 'services';
  if (pathname === publicPaths.howItWorks) return 'how-it-works';
  if (pathname === publicPaths.liveBay) return 'live-bay';
  if (pathname === publicPaths.blog) return 'blog';
  if (pathname === publicPaths.contact) return 'contact';
  return 'home';
}

export function tabForPath(pathname: string): CustomerTab {
  const match = (Object.entries(portalPaths) as [CustomerTab, string][]).find(([, path]) => path === pathname);
  return match ? match[0] : 'DASHBOARD';
}
