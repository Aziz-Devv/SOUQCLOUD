import { cookies } from 'next/headers';
import { getAuthenticatedSessionContext } from '@/lib/services/auth-service';
import { getMerchantStores } from '@/lib/services/store-service';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { MembershipRole, StoreSummary, UserProfile, Merchant, Membership } from '@/lib/types';

/**
 * Navigation Item Definition
 */
export interface DashboardNavItem {
  title: string;
  href: string;
  iconName: 'Home' | 'Package' | 'ShoppingCart' | 'LayoutTemplate' | 'CreditCard' | 'Bell' | 'Globe';
  allowedRoles: MembershipRole[];
}

export const ALL_DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    title: 'الرئيسية',
    href: '/app/home',
    iconName: 'Home',
    allowedRoles: ['OWNER', 'ADMIN', 'STAFF'],
  },
  {
    title: 'المنتجات',
    href: '/app/products',
    iconName: 'Package',
    allowedRoles: ['OWNER', 'ADMIN', 'STAFF'],
  },
  {
    title: 'الطلبات',
    href: '/app/orders',
    iconName: 'ShoppingCart',
    allowedRoles: ['OWNER', 'ADMIN', 'STAFF'],
  },
  {
    title: 'القوالب والتصميم',
    href: '/app/online-store/themes',
    iconName: 'LayoutTemplate',
    allowedRoles: ['OWNER', 'ADMIN'],
  },
  {
    title: 'النطاق المخصص',
    href: '/app/settings/domain',
    iconName: 'Globe',
    allowedRoles: ['OWNER', 'ADMIN'],
  },
  {
    title: 'الإشعارات وقوالب البريد',
    href: '/app/settings/notifications',
    iconName: 'Bell',
    allowedRoles: ['OWNER', 'ADMIN'],
  },
  {
    title: 'الاشتراك والفوترة',
    href: '/app/billing',
    iconName: 'CreditCard',
    allowedRoles: ['OWNER', 'ADMIN'],
  },
];

export interface DashboardNavContext {
  user: UserProfile;
  merchant: Merchant;
  membership: Membership;
  stores: StoreSummary[];
  activeStore: StoreSummary | null;
  navItems: DashboardNavItem[];
}

export const ACTIVE_STORE_COOKIE_NAME = 'souqcloud_active_store_id';

/**
 * Filters dashboard navigation items dynamically based on the verified role.
 * STAFF users are restricted from billing, theme builder, and notification settings.
 */
export function getPermittedNavItems(role: MembershipRole): DashboardNavItem[] {
  return ALL_DASHBOARD_NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));
}

/**
 * Resolves the active store safely:
 * Reads untrusted candidate cookie, validates it against merchant's authorized stores.
 * Discards invalid or foreign candidates and defaults to stores[0].
 */
export async function getResolvedActiveStore(): Promise<StoreSummary | null> {
  const cookieStore = await cookies();
  const candidateId = cookieStore.get(ACTIVE_STORE_COOKIE_NAME)?.value;
  const stores = await getMerchantStores();

  if (stores.length === 0) {
    return null;
  }

  const activeStore =
    (candidateId ? stores.find((s) => s.id === candidateId) : null) ||
    stores[0] ||
    null;

  return activeStore;
}

/**
 * Unified server helper to resolve full dashboard context.
 */
export async function getDashboardNavContext(): Promise<DashboardNavContext | null> {
  const session = await getAuthenticatedSessionContext();
  if (!session) {
    return null;
  }

  const stores = await getMerchantStores();
  const cookieStore = await cookies();
  const candidateId = cookieStore.get(ACTIVE_STORE_COOKIE_NAME)?.value;

  const activeStore =
    (candidateId ? stores.find((s) => s.id === candidateId) : null) ||
    stores[0] ||
    null;

  const permittedNav = getPermittedNavItems(session.membership.role);

  return {
    user: session.user,
    merchant: session.merchant,
    membership: session.membership,
    stores,
    activeStore,
    navItems: permittedNav,
  };
}

/**
 * Enforces server-side role authorization on routes/actions.
 */
export async function requireRole(allowedRoles: MembershipRole[]): Promise<DashboardNavContext> {
  const context = await getDashboardNavContext();
  if (!context) {
    throw new NotFoundError('جلسة المستخدم غير موجودة.');
  }

  if (!allowedRoles.includes(context.membership.role)) {
    throw new ForbiddenError('ليس لديك الصلاحيات الكافية للوصول إلى هذا القسم.');
  }

  return context;
}
