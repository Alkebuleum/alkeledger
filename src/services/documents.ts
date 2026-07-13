import {
  collection, doc, getDocs, addDoc, deleteDoc,
  orderBy, query, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { USE_MOCK_DATA, db, storage } from '@/lib/firebase';
import { isDemoOrgId } from '@/lib/demo';
import { MOCK_DOCUMENTS } from '@/data/mock';
import type { DocumentRecord } from '@/types';

let mockDocs = [...MOCK_DOCUMENTS];

function docsCol(orgId: string) {
  return collection(db!, 'organizations', orgId, 'documents');
}

function formatSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function listDocuments(orgId: string): Promise<DocumentRecord[]> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) return mockDocs.filter((d) => d.orgId === orgId);
  if (!db) return [];
  const snap = await getDocs(query(docsCol(orgId), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id:          d.id,
      orgId,
      name:        data.name as string,
      size:        data.size as string,
      uploaded:    data.uploaded as string ??
        (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString().slice(0, 10) : ''),
      category:    data.category as string,
      url:         data.url as string | undefined,
      storagePath: data.storagePath as string | undefined,
      uploadedBy:  data.uploadedBy as string | undefined,
    };
  });
}

export async function uploadDocument(
  orgId: string,
  file: File,
  category: string,
  uploadedBy: string,
): Promise<DocumentRecord> {
  const uploaded = new Date().toISOString().slice(0, 10);
  const size     = formatSize(file.size);

  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    const doc: DocumentRecord = {
      id:       'd_' + Math.random().toString(36).slice(2, 9),
      orgId,
      name:     file.name,
      size,
      uploaded,
      category,
      uploadedBy,
    };
    mockDocs = [doc, ...mockDocs];
    return doc;
  }

  if (!db || !storage) throw new Error('Firebase not initialized');

  const docId      = 'd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const storagePath = `documents/${orgId}/${docId}/${file.name}`;
  const storageRef  = ref(storage, storagePath);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const ref2 = await addDoc(docsCol(orgId), {
    name: file.name,
    size,
    uploaded,
    category,
    url,
    storagePath,
    uploadedBy,
    createdAt: serverTimestamp(),
  });

  return { id: ref2.id, orgId, name: file.name, size, uploaded, category, url, storagePath, uploadedBy };
}

/**
 * Uploads a file backing a `recordType: 'document'` ledger entry. Distinct storage
 * namespace from the org's general Files library (`documents/`) since this file is
 * evidence attached to an anchorable record, not general org storage — no separate
 * Firestore doc is created here, the ledger entry itself is the record.
 */
export async function uploadLedgerDocument(orgId: string, file: File): Promise<{ url: string; storagePath: string }> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    return { url: 'mock://ledger-document', storagePath: `ledger-documents/${orgId}/mock/${file.name}` };
  }
  if (!storage) throw new Error('Firebase not initialized');

  const docId       = 'ld_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const storagePath = `ledger-documents/${orgId}/${docId}/${file.name}`;
  const storageRef  = ref(storage, storagePath);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, storagePath };
}

export async function deleteDocument(orgId: string, docId: string, storagePath?: string): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockDocs = mockDocs.filter((d) => d.id !== docId);
    return;
  }
  if (!db) return;
  await deleteDoc(doc(docsCol(orgId), docId));
  if (storagePath && storage) {
    try { await deleteObject(ref(storage, storagePath)); } catch { /* already gone */ }
  }
}
