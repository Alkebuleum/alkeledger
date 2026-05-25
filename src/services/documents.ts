import { USE_MOCK_DATA } from '@/lib/firebase';
import { MOCK_DOCUMENTS } from '@/data/mock';
import type { DocumentRecord } from '@/types';

export async function listDocuments(orgId: string): Promise<DocumentRecord[]> {
  if (USE_MOCK_DATA) {
    return MOCK_DOCUMENTS.filter((d) => d.orgId === orgId);
  }
  // 🔌 FIREBASE
  // const snap = await getDocs(collection(db!, `organizations/${orgId}/documents`));
  // return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentRecord));
  return [];
}

/**
 * Upload a document to Firebase Storage and write metadata to Firestore.
 *
 * 🔌 FIREBASE
 *   import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
 *   const path = `documents/${orgId}/${docId}/${file.name}`;
 *   const storageRef = ref(storage!, path);
 *   await uploadBytes(storageRef, file);
 *   const url = await getDownloadURL(storageRef);
 *   await addDoc(collection(db!, `organizations/${orgId}/documents`), {
 *     name: file.name, size, uploaded: new Date().toISOString(), category, url,
 *   });
 */
export async function uploadDocument(
  orgId: string,
  file: File,
  category: string
): Promise<DocumentRecord> {
  void orgId; void file; void category;
  throw new Error('uploadDocument: Firebase Storage not yet configured');
}
