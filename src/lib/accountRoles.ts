/** Public account types and Arabic labels — company is a subscription, not an account type. */

export const PUBLIC_ACCOUNT_TYPES = ['client', 'barber', 'doctor', 'store'] as const;

export type PublicAccountType = (typeof PUBLIC_ACCOUNT_TYPES)[number];

/** Roles a user may register as or convert to (excludes admin/moderator/company). */
export const ACCOUNT_ROLE_LABELS: Record<string, string> = {
  client: 'زبون',
  barber: 'حلاق',
  doctor: 'دكتور',
  store: 'متجر',
  company: 'شركة (اشتراك)',
  specialist: 'متخصص',
  moderator: 'مشرف محتوى',
  admin: 'مدير',
};

export function accountRoleLabel(role: string | null | undefined): string {
  if (!role) return ACCOUNT_ROLE_LABELS.client;
  return ACCOUNT_ROLE_LABELS[role] || role;
}

export function isPublicAccountType(role: string): role is PublicAccountType {
  return (PUBLIC_ACCOUNT_TYPES as readonly string[]).includes(role);
}

export function sellerDashboardTitle(role: string): string {
  if (role === 'doctor') return 'لوحة الدكتور';
  if (role === 'company') return 'لوحة الشركة';
  if (role === 'store') return 'لوحة المتجر';
  return 'لوحة البائع';
}
