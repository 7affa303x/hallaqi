import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_ROLE_LABELS,
  accountRoleLabel,
  isPublicAccountType,
  PUBLIC_ACCOUNT_TYPES,
  sellerDashboardTitle,
} from '@/lib/accountRoles';

describe('accountRoles', () => {
  it('exposes four public account types without company', () => {
    expect(PUBLIC_ACCOUNT_TYPES).toEqual(['client', 'barber', 'doctor', 'store']);
    expect(isPublicAccountType('company')).toBe(false);
    expect(isPublicAccountType('doctor')).toBe(true);
  });

  it('labels roles in Arabic', () => {
    expect(accountRoleLabel('client')).toBe('زبون');
    expect(accountRoleLabel('doctor')).toBe('دكتور');
    expect(ACCOUNT_ROLE_LABELS.company).toContain('اشتراك');
  });

  it('titles seller dashboards', () => {
    expect(sellerDashboardTitle('doctor')).toBe('لوحة الدكتور');
    expect(sellerDashboardTitle('store')).toBe('لوحة المتجر');
  });
});
