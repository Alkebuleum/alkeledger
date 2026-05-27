import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

admin.initializeApp();

const db = admin.firestore();
const adminAuth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── requestOtp ───────────────────────────────────────────────────────────────

export const requestOtp = onCall(async (request) => {
  const email = ((request.data as { email?: string }).email ?? '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Please enter a valid email address.');
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await db.collection('otpCodes').doc(email).set({ code, expiresAt, used: false });

  const brevoKey    = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@alkeledger.app';

  if (!brevoKey) {
    logger.info(`[DEV OTP] ${email} → ${code}`);
    return { success: true };
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'AlkeLedger', email: senderEmail },
      to: [{ email }],
      subject: `${code} — your AlkeLedger sign-in code`,
      htmlContent: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#fafaf9;border-radius:16px">
          <div style="background:#1c1917;border-radius:12px;padding:20px 24px;margin-bottom:28px">
            <span style="color:white;font-size:20px;font-weight:800;letter-spacing:-.03em">AlkeLedger</span>
          </div>
          <h1 style="font-size:22px;font-weight:700;color:#1c1917;margin:0 0 8px">Your sign-in code</h1>
          <p style="color:#78716c;margin:0 0 28px;font-size:15px">Enter this 6-digit code to sign in. It expires in 10 minutes.</p>
          <div style="background:white;border:2px solid #e7e5e4;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px">
            <span style="font-size:44px;font-weight:800;letter-spacing:.3em;color:#1c1917;font-variant-numeric:tabular-nums">${code}</span>
          </div>
          <p style="color:#a8a29e;font-size:13px;margin:0">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const data = await res.json() as { message?: string };
    throw new HttpsError('internal', data.message ?? 'Failed to send email.');
  }

  return { success: true };
});

// ─── verifyOtp ────────────────────────────────────────────────────────────────

export const verifyOtp = onCall(async (request) => {
  const { email: rawEmail, code: rawCode } = request.data as { email?: string; code?: string };
  const email = (rawEmail ?? '').trim().toLowerCase();
  const code  = (rawCode  ?? '').trim();

  if (!email || !code) {
    throw new HttpsError('invalid-argument', 'Email and code are required.');
  }

  const docRef = db.collection('otpCodes').doc(email);
  const snap   = await docRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'No code found for this email. Request a new one.');
  }

  const data = snap.data()!;

  if (data['used'])                    throw new HttpsError('failed-precondition', 'This code has already been used.');
  if (Date.now() > data['expiresAt'])  throw new HttpsError('deadline-exceeded',   'This code has expired. Request a new one.');
  if (data['code'] !== code)           throw new HttpsError('unauthenticated',      'Incorrect code. Please try again.');

  await docRef.update({ used: true });

  let uid: string;
  try {
    const existing = await adminAuth.getUserByEmail(email);
    uid = existing.uid;
  } catch {
    const created = await adminAuth.createUser({ email });
    uid = created.uid;
  }

  const customToken = await adminAuth.createCustomToken(uid);
  return { customToken };
});

// ─── getOrgPreviewByCode ──────────────────────────────────────────────────────
// Public (no auth required) — returns safe preview info for the join page.

export const getOrgPreviewByCode = onCall(async (request) => {
  const { code, token } = request.data as { code?: string; token?: string };
  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Invite code is required.');
  }

  const upperCode = code.toUpperCase().trim();
  const orgSnap = await db
    .collection('organizations')
    .where('inviteCode', '==', upperCode)
    .limit(1)
    .get();

  if (orgSnap.empty) {
    throw new HttpsError('not-found', 'Invalid invite code.');
  }

  const orgDoc = orgSnap.docs[0];
  const orgData = orgDoc.data();

  const memberSnap = await db
    .collection('memberships')
    .where('orgId', '==', orgDoc.id)
    .where('status', '==', 'active')
    .get();

  // If a token was provided, include the invitee's name/email for personalisation.
  let inviteeName: string | null = null;
  let inviteeEmail: string | null = null;
  if (token && typeof token === 'string') {
    const inviteSnap = await db.collection('invites').doc(token).get();
    if (inviteSnap.exists) {
      const d = inviteSnap.data()!;
      inviteeName  = (d['name']  as string | null) ?? null;
      inviteeEmail = (d['email'] as string | null) ?? null;
    }
  }

  return {
    orgId: orgDoc.id,
    orgName: orgData.name as string,
    orgType: orgData.type as string,
    orgTagline: (orgData.tagline as string) || '',
    inviteCode: upperCode,
    memberCount: memberSnap.size,
    inviteeName,
    inviteeEmail,
  };
});

// ─── redeemInvite ─────────────────────────────────────────────────────────────
// Public (no auth required) — token IS the proof of identity.
// Signs in the user (via custom token) and creates their membership.

export const redeemInvite = onCall(async (request) => {
  const { token, name } = request.data as { token?: string; name?: string };

  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Invite token is required.');
  }

  const inviteSnap = await db.collection('invites').doc(token).get();
  if (!inviteSnap.exists) {
    throw new HttpsError('not-found', 'This invite link is invalid or has already been used.');
  }

  const inviteData = inviteSnap.data()!;
  if (Date.now() > (inviteData['expiresAt'] as number)) {
    await inviteSnap.ref.delete();
    throw new HttpsError('deadline-exceeded', 'This invite link has expired. Ask your admin to send a new one.');
  }

  const email     = inviteData['email'] as string;
  const orgId     = inviteData['orgId'] as string;
  const memberType = (inviteData['memberType'] as string) || 'individual';
  const memberOrgName  = (inviteData['orgName']  as string | null) ?? null;
  const memberOrgTitle = (inviteData['orgTitle'] as string | null) ?? null;

  // Resolve displayName: prefer what the user typed, fall back to invite record
  const displayName = (name ?? '').trim() || ((inviteData['name'] as string) ?? '');

  // Look up org for slug
  const orgSnap = await db.collection('organizations').doc(orgId).get();
  if (!orgSnap.exists) {
    throw new HttpsError('not-found', 'Organization not found.');
  }
  const orgData = orgSnap.data()!;
  const orgSlug = (orgData['slug'] as string | undefined) ?? orgId;

  // Get or create Firebase Auth user
  let uid: string;
  try {
    const existing = await adminAuth.getUserByEmail(email);
    uid = existing.uid;
  } catch {
    const created = await adminAuth.createUser({ email });
    uid = created.uid;
  }

  // Upsert user doc (merge so existing data is preserved)
  await db.collection('users').doc(uid).set(
    { name: displayName, email, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  // Create membership only if one doesn't already exist
  const membershipId = `${orgId}_${uid}`;
  const existingMembership = await db.collection('memberships').doc(membershipId).get();
  if (!existingMembership.exists) {
    const memberDoc: Record<string, unknown> = {
      orgId,
      userId: uid,
      name: displayName,
      email,
      role: 'member',
      status: 'active',  // email invite = immediate access
      joined: new Date().toISOString().slice(0, 10),
      duesPaid: false,
      memberType,
    };
    if (memberOrgName)  memberDoc['orgName']  = memberOrgName;
    if (memberOrgTitle) memberDoc['orgTitle'] = memberOrgTitle;
    await db.collection('memberships').doc(membershipId).set(memberDoc);
  }

  // One-time use — delete token
  await inviteSnap.ref.delete();

  const customToken = await adminAuth.createCustomToken(uid);
  return { customToken, orgId, orgSlug, orgName: orgData['name'] as string };
});
