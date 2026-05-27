import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function uploadDuesReceipt(
  orgId: string,
  periodId: string,
  userId: string,
  file: File,
): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not initialized');
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `receipts/${orgId}/dues-${periodId}/${userId}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
