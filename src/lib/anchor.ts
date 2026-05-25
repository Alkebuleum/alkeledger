/**
 * Blockchain anchoring service.
 *
 * STAGE 5 (current): mock implementation.
 *   - Generates a SHA-256 hash of the canonical record using Web Crypto API.
 *   - The "submission to chain" is simulated with a delay and a fake tx hash.
 *
 * STAGE 5 (production):
 *   - hashRecord() stays mostly as-is — Web Crypto SHA-256 is the right primitive.
 *   - submitAnchor() should POST to VITE_ANCHOR_ENDPOINT, which is an Alkebuleum
 *     anchoring service that takes (orgId, entryId, hash) and writes a transaction
 *     to the chain, returning the txHash on success.
 *   - On success, the caller updates the Firestore document with txHash + verified.
 */

import type { LedgerEntry } from '@/types';

/**
 * Build the canonical JSON representation of a ledger entry.
 * Canonicalization matters: any verifier must produce the same string
 * to re-compute and match the hash. We sort keys and exclude derived
 * fields (hash, txHash, anchorStatus) that are populated after hashing.
 */
export function canonicalize(entry: LedgerEntry): string {
  const fields = {
    id: entry.id,
    orgId: entry.orgId,
    type: entry.type,
    amount: entry.amount,
    currency: entry.currency,
    category: entry.category,
    description: entry.description,
    projectId: entry.projectId ?? null,
    memberId: entry.memberId ?? null,
    receiptUrl: entry.receiptUrl ?? null,
    createdBy: entry.createdBy,
    createdAt: entry.createdAt,
    approvedBy: entry.approvedBy ?? null,
    approvedAt: entry.approvedAt ?? null,
  };
  return JSON.stringify(fields, Object.keys(fields).sort());
}

/**
 * Compute SHA-256 of the canonical record. Returns a short 0x-prefixed
 * display hash (first 4 + last 4 bytes) for UI; full hash is logged.
 */
export async function hashRecord(entry: LedgerEntry): Promise<string> {
  const canonical = canonicalize(entry);
  const buf = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = Array.from(new Uint8Array(digest));
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `0x${hex.slice(0, 4)}…${hex.slice(-4)}`;
}

/**
 * Submit an anchor proof to the Alkebuleum chain (or its anchoring service).
 *
 * 🔌 CHAIN — replace this implementation with a real fetch() to your
 * Alkebuleum anchoring endpoint. The mock version simulates a 600ms
 * network round-trip and returns a fake txHash.
 */
export async function submitAnchor(
  orgId: string,
  entryId: string,
  hash: string
): Promise<{ txHash: string; verified: boolean }> {
  const endpoint = import.meta.env.VITE_ANCHOR_ENDPOINT;

  if (!endpoint) {
    // Mock path
    await new Promise((r) => setTimeout(r, 600));
    const random = Math.random().toString(16);
    return {
      txHash: `0x${random.slice(2, 6)}…${random.slice(6, 10)}`,
      verified: true,
    };
  }

  // Production path (sketch)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId, entryId, hash }),
  });
  if (!res.ok) throw new Error(`Anchor submission failed: ${res.status}`);
  return res.json();
}
