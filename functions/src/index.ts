import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

admin.initializeApp();

const db = admin.firestore();
const adminAuth = admin.auth();

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
