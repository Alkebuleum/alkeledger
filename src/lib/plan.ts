import type { Organization } from '@/types';

export function isPaidPlan(org: Pick<Organization, 'planCode'>): boolean {
  return org.planCode === 'standard_monthly' || org.planCode === 'standard_annual';
}
