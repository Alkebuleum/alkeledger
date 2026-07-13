import { USE_MOCK_DATA } from '@/lib/firebase';
import { isDemoOrgId } from '@/lib/demo';
import { MOCK_AUDIT } from '@/data/mock';
import type { AuditLogEntry } from '@/types';

export async function listAuditLog(orgId: string): Promise<AuditLogEntry[]> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    return MOCK_AUDIT;
  }
  // 🔌 FIREBASE
  // const q = query(
  //   collection(db!, `organizations/${orgId}/auditLogs`),
  //   orderBy('at', 'desc'), limit(20)
  // );
  // const snap = await getDocs(q);
  // return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry));
  void orgId;
  return [];
}

export async function appendAuditEntry(orgId: string, who: string, action: string): Promise<void> {
  // 🔌 FIREBASE
  // await addDoc(collection(db!, `organizations/${orgId}/auditLogs`), {
  //   at: new Date().toISOString(), who, action,
  // });
  void orgId; void who; void action;
}
