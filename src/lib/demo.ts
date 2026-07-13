/**
 * Demo-workspace access. Allowlisted accounts see the mock/demo orgs
 * (src/data/mock.ts) alongside their real Firestore-backed workspaces —
 * useful for presentations without touching real client data.
 */

import { MOCK_ORGS } from '@/data/mock';

export const DEMO_ACCESS_EMAILS = ['dwehsidi@gmail.com'];

const DEMO_ORG_IDS = new Set(MOCK_ORGS.map((o) => o.id));

export function isDemoOrgId(orgId: string | null | undefined): boolean {
  return !!orgId && DEMO_ORG_IDS.has(orgId);
}

export function hasDemoAccess(email: string | null | undefined): boolean {
  return !!email && DEMO_ACCESS_EMAILS.includes(email.toLowerCase());
}
