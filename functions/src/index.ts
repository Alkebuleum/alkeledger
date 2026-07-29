import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';

admin.initializeApp();

const db = admin.firestore();
const adminAuth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://app.scribb.net';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEventDate(startDate: string, endDate?: string, allDay?: boolean): string {
  const [datePart, timePart] = startDate.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const d = new Date(year, month - 1, day);
  const dateStr = `${DAYS[d.getDay()]}, ${MONTHS[month - 1]} ${day}, ${year}`;
  if (!timePart || allDay) return dateStr;
  const [h, m] = timePart.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr   = h % 12 || 12;
  const start = `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
  if (!endDate) return `${dateStr} · ${start}`;
  const [, et] = endDate.split('T');
  if (et) {
    const [eh, em] = et.split(':').map(Number);
    const eampm = eh >= 12 ? 'PM' : 'AM';
    const ehr   = eh % 12 || 12;
    return `${dateStr} · ${start} – ${ehr}:${String(em).padStart(2, '0')} ${eampm}`;
  }
  return `${dateStr} · ${start}`;
}

// ─── requestOtp ───────────────────────────────────────────────────────────────

export const requestOtp = onCall({ cors: true }, async (request) => {
  const email = ((request.data as { email?: string }).email ?? '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Please enter a valid email address.');
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await db.collection('otpCodes').doc(email).set({ code, expiresAt, used: false });

  const brevoKey    = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@scribb.net';

  if (!brevoKey) {
    logger.info(`[DEV OTP] ${email} → ${code}`);
    return { success: true };
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Scribb', email: senderEmail },
      to: [{ email }],
      subject: `${code} — your Scribb sign-in code`,
      htmlContent: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#fafaf9;border-radius:16px">
          <div style="background:#171B21;border-radius:12px;padding:20px 24px;margin-bottom:28px">
            <span style="color:#EFE9DC;font-size:20px;font-weight:700;letter-spacing:-.01em">Scribb</span>
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

export const verifyOtp = onCall({ cors: true }, async (request) => {
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

export const getOrgPreviewByCode = onCall({ cors: true }, async (request) => {
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

  const orgDoc  = orgSnap.docs[0];
  const orgData = orgDoc.data();

  const memberSnap = await db
    .collection('memberships')
    .where('orgId', '==', orgDoc.id)
    .where('status', '==', 'active')
    .get();

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
    orgLogoUrl: (orgData.logoUrl as string) || '',
    inviteCode: upperCode,
    memberCount: memberSnap.size,
    inviteeName,
    inviteeEmail,
  };
});

// ─── redeemInvite ─────────────────────────────────────────────────────────────

export const redeemInvite = onCall({ cors: true }, async (request) => {
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

  const email          = inviteData['email'] as string;
  const orgId          = inviteData['orgId'] as string;
  const memberType     = (inviteData['memberType'] as string) || 'individual';
  const memberOrgName  = (inviteData['orgName']  as string | null) ?? null;
  const memberOrgTitle = (inviteData['orgTitle'] as string | null) ?? null;

  // Redemption works without a prior sign-in (magic-link style) so brand-new
  // invitees can accept directly — but if the caller IS already signed in,
  // their session must match the invited email, so an attacker who obtained a
  // token some other way can't use their own session to hijack the invitee's account.
  if (request.auth?.token.email &&
      request.auth.token.email.toLowerCase() !== email.toLowerCase()) {
    throw new HttpsError('permission-denied', 'This invite is for a different email address. Sign out and try again.');
  }

  const displayName = (name ?? '').trim() || ((inviteData['name'] as string) ?? '');

  const orgSnap = await db.collection('organizations').doc(orgId).get();
  if (!orgSnap.exists) {
    throw new HttpsError('not-found', 'Organization not found.');
  }
  const orgData = orgSnap.data()!;
  const orgSlug = (orgData['slug'] as string | undefined) ?? orgId;

  let uid: string;
  try {
    const existing = await adminAuth.getUserByEmail(email);
    uid = existing.uid;
  } catch {
    const created = await adminAuth.createUser({ email });
    uid = created.uid;
  }

  await db.collection('users').doc(uid).set(
    { name: displayName, email, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  const membershipId = `${orgId}_${uid}`;
  const existingMembership = await db.collection('memberships').doc(membershipId).get();
  if (!existingMembership.exists) {
    const memberDoc: Record<string, unknown> = {
      orgId, userId: uid, name: displayName, email,
      role: 'member', status: 'active',
      joined: new Date().toISOString().slice(0, 10),
      duesPaid: false, memberType,
    };
    if (memberOrgName)  memberDoc['orgName']  = memberOrgName;
    if (memberOrgTitle) memberDoc['orgTitle'] = memberOrgTitle;
    await db.collection('memberships').doc(membershipId).set(memberDoc);
  }

  await inviteSnap.ref.delete();

  const customToken = await adminAuth.createCustomToken(uid);
  return { customToken, orgId, orgSlug, orgName: orgData['name'] as string };
});

// ─── sendInviteEmail ──────────────────────────────────────────────────────────
// Server-side invite email — keeps the Brevo API key off the client bundle.

export const sendInviteEmail = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to send invites.');
  }

  const { email, name, orgName, orgId, inviteCode, token } = request.data as {
    email: string;
    name: string;
    orgName: string;
    orgId: string;
    inviteCode: string;
    token: string | null;
  };

  if (!email || !orgId || !inviteCode) {
    throw new HttpsError('invalid-argument', 'email, orgId, and inviteCode are required.');
  }

  const callerUid = request.auth.uid;
  const callerSnap = await db.collection('memberships').doc(`${orgId}_${callerUid}`).get();
  if (!callerSnap.exists) throw new HttpsError('permission-denied', 'Not a member of this org.');
  const callerRole = (callerSnap.data() as Record<string, unknown>)?.role as string | undefined;
  if (!['owner', 'admin'].includes(callerRole ?? '')) {
    throw new HttpsError('permission-denied', 'Only admins can send invites.');
  }

  const brevoKey    = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@scribb.net';

  const joinLink = token
    ? `${APP_BASE_URL}/join/${inviteCode}?t=${token}`
    : `${APP_BASE_URL}/join/${inviteCode}`;

  if (!brevoKey) {
    logger.info(`[DEV INVITE] ${name} <${email}> → ${joinLink}`);
    return { success: true };
  }

  const htmlContent = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;background:#F6F4ED">
      <div style="background:#171B21;border-radius:4px;padding:20px;text-align:center;margin-bottom:24px">
        <span style="color:#EFE9DC;font-size:22px;font-weight:700;letter-spacing:-.01em">Scribb</span>
      </div>
      <h1 style="font-size:20px;font-weight:700;color:#171B21;margin:0 0 8px">Hi ${esc(name) || 'there'},</h1>
      <p style="color:#57534e;margin:0 0 24px;font-size:15px;line-height:1.6">
        You've been invited to join <strong>${esc(orgName)}</strong> on Scribb — a ledger and accountability platform for organizations.
      </p>
      <a href="${joinLink}" style="display:block;background:#171B21;color:#EFE9DC;text-decoration:none;padding:14px;text-align:center;font-weight:600;font-size:16px;margin-bottom:24px">
        View workspace &amp; join →
      </a>
      <div style="background:white;border:1px solid #e7e5e4;padding:16px;text-align:center;margin-bottom:24px">
        <div style="font-size:11px;color:#78716c;margin-bottom:6px;text-transform:uppercase;letter-spacing:.1em">Or use invite code manually</div>
        <span style="font-size:32px;font-weight:800;letter-spacing:.3em;color:#171B21">${esc(inviteCode)}</span>
      </div>
      <p style="color:#a8a29e;font-size:12px;margin:0;text-align:center">If you didn't expect this, you can safely ignore it.</p>
    </div>
  `;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Scribb', email: senderEmail },
      to: [{ email, name }],
      subject: `You're invited to join ${orgName} on Scribb`,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new HttpsError('internal', err.message ?? 'Email delivery failed');
  }

  return { success: true };
});

// ─── notifyEventCreated ───────────────────────────────────────────────────────
// Sends event invitation emails with one-click RSVP buttons to all active
// members of the org. Called from the client immediately after creating an event.

export const notifyEventCreated = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to send notifications.');
  }

  const { orgId, eventId, event } = request.data as {
    orgId: string;
    eventId: string;
    event: {
      title: string;
      startDate: string;
      endDate?: string;
      allDay?: boolean;
      location?: string;
      description?: string;
    };
  };

  if (!orgId || !eventId || !event?.title) {
    throw new HttpsError('invalid-argument', 'orgId, eventId, and event data are required.');
  }

  const callerUid = request.auth.uid;
  const callerSnap = await db.collection('memberships').doc(`${orgId}_${callerUid}`).get();
  if (!callerSnap.exists) throw new HttpsError('permission-denied', 'Not a member of this org.');
  const callerRole = (callerSnap.data() as Record<string, unknown>)?.role as string | undefined;
  if (!['owner', 'admin'].includes(callerRole ?? '')) {
    throw new HttpsError('permission-denied', 'Only admins can send event notifications.');
  }

  const brevoKey    = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@scribb.net';

  // Fetch org
  const orgSnap = await db.collection('organizations').doc(orgId).get();
  if (!orgSnap.exists) throw new HttpsError('not-found', 'Organization not found.');
  const orgData = orgSnap.data()!;
  const orgName = orgData['name'] as string;
  const orgSlug = (orgData['slug'] as string | undefined) ?? orgId;

  // Fetch all active members
  const membersSnap = await db
    .collection('memberships')
    .where('orgId', '==', orgId)
    .where('status', '==', 'active')
    .get();

  if (membersSnap.empty) return { success: true, sent: 0 };

  const dateStr = formatEventDate(event.startDate, event.endDate, event.allDay);
  const appEventsUrl = `${APP_BASE_URL}/${orgSlug}/calendar`;

  // Build and send emails in parallel
  const emailJobs = membersSnap.docs.map(async (memberDoc) => {
    const member = memberDoc.data();
    const memberId = member['userId'] as string;
    const memberEmail = member['email'] as string;
    const memberName  = member['name']  as string;

    if (!memberEmail) return;

    // Generate per-member RSVP token (30-day expiry)
    const token = generateToken();
    await db.collection('eventRsvpTokens').doc(`${orgId}_${eventId}_${memberId}`).set({
      orgId, eventId, memberId, memberName, token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    const rsvpBase = `${APP_BASE_URL}/rsvp/${orgId}/${eventId}?m=${encodeURIComponent(memberId)}&t=${token}&s=`;
    const attendingUrl = rsvpBase + 'attending';
    const maybeUrl     = rsvpBase + 'maybe';
    const decliningUrl = rsvpBase + 'declining';

    const locationRow = event.location ? `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:13px;color:#78716c;width:90px;vertical-align:top;">Location</td>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:13px;color:#1c1917;">${esc(event.location)}</td>
      </tr>` : '';

    const descRow = event.description ? `
      <tr>
        <td style="padding:10px 0 0;font-size:13px;color:#78716c;width:90px;vertical-align:top;">Details</td>
        <td style="padding:10px 0 0;font-size:13px;color:#1c1917;line-height:1.55;">${esc(event.description).replace(/\n/g, '<br>')}</td>
      </tr>` : '';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fafaf9;border:1px solid #e7e5e4;">

      <!-- Header -->
      <tr>
        <td style="background:#171B21;padding:18px 28px;">
          <span style="color:#EFE9DC;font-size:17px;font-weight:700;letter-spacing:-.01em;">Scribb</span>
          <span style="color:#8A8F99;font-size:13px;margin-left:10px;">${esc(orgName)}</span>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:28px;">
          <p style="color:#a8a29e;font-size:11px;text-transform:uppercase;letter-spacing:.18em;margin:0 0 6px;font-family:monospace;">New Event</p>
          <h1 style="color:#1c1917;font-size:22px;font-weight:700;margin:0 0 20px;line-height:1.25;">${esc(event.title)}</h1>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-top:1px solid #f5f5f4;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:13px;color:#78716c;width:90px;vertical-align:top;">Date</td>
              <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:13px;color:#1c1917;">${esc(dateStr)}</td>
            </tr>
            ${locationRow}
            ${descRow}
          </table>

          <!-- RSVP -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #e7e5e4;margin-bottom:20px;">
            <tr>
              <td style="padding:22px;text-align:center;">
                <p style="color:#1c1917;font-size:15px;font-weight:600;margin:0 0 14px;">Will you attend?</p>
                <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="padding:0 5px;">
                      <a href="${attendingUrl}" style="display:inline-block;padding:10px 18px;background:#16a34a;color:white;text-decoration:none;font-size:13px;font-weight:600;border-radius:5px;">✓ Attending</a>
                    </td>
                    <td style="padding:0 5px;">
                      <a href="${maybeUrl}" style="display:inline-block;padding:10px 18px;background:#d97706;color:white;text-decoration:none;font-size:13px;font-weight:600;border-radius:5px;">~ Maybe</a>
                    </td>
                    <td style="padding:0 5px;">
                      <a href="${decliningUrl}" style="display:inline-block;padding:10px 18px;background:#71717a;color:white;text-decoration:none;font-size:13px;font-weight:600;border-radius:5px;">✕ Declining</a>
                    </td>
                  </tr>
                </table>
                <p style="color:#a8a29e;font-size:11px;margin:14px 0 0;">Click once — no sign-in needed.</p>
              </td>
            </tr>
          </table>

          <p style="text-align:center;margin:0;">
            <a href="${appEventsUrl}" style="color:#78716c;font-size:13px;text-decoration:underline;">View all events in Scribb →</a>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:14px 28px;border-top:1px solid #e7e5e4;">
          <p style="color:#a8a29e;font-size:11px;margin:0;">You're receiving this because you're a member of ${esc(orgName)} on Scribb.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    if (!brevoKey) {
      logger.info(`[DEV EVENT EMAIL] → ${memberEmail} | ${attendingUrl}`);
      return;
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: `${orgName} via Scribb`, email: senderEmail },
        to: [{ email: memberEmail, name: memberName }],
        subject: `📅 ${event.title} — ${orgName}`,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const d = await res.json() as { message?: string };
      logger.warn(`Event email failed for ${memberEmail}: ${d.message}`);
    }
  });

  const results = await Promise.allSettled(emailJobs);
  const failed  = results.filter((r) => r.status === 'rejected').length;
  const sent    = results.length - failed;

  logger.info(`Event notifications: ${sent} sent, ${failed} failed for event ${eventId}`);
  return { success: true, sent, failed };
});

// ─── notifyPollCreated ────────────────────────────────────────────────────────
// Emails all active members a link to vote on a new poll. Pro feature.

export const notifyPollCreated = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to send notifications.');
  }

  const { orgId, pollId, poll } = request.data as {
    orgId: string;
    pollId: string;
    poll: { title: string; description?: string };
  };

  if (!orgId || !pollId || !poll?.title) {
    throw new HttpsError('invalid-argument', 'orgId, pollId, and poll data are required.');
  }

  const callerUid = request.auth.uid;
  const callerSnap = await db.collection('memberships').doc(`${orgId}_${callerUid}`).get();
  if (!callerSnap.exists) throw new HttpsError('permission-denied', 'Not a member of this org.');
  const callerRole = (callerSnap.data() as Record<string, unknown>)?.role as string | undefined;
  if (!['owner', 'admin'].includes(callerRole ?? '')) {
    throw new HttpsError('permission-denied', 'Only admins can send poll notifications.');
  }

  const brevoKey    = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@scribb.net';

  const orgSnap = await db.collection('organizations').doc(orgId).get();
  if (!orgSnap.exists) throw new HttpsError('not-found', 'Organization not found.');
  const orgData = orgSnap.data()!;
  const orgName = orgData['name'] as string;
  const orgSlug = (orgData['slug'] as string | undefined) ?? orgId;

  const membersSnap = await db.collection('memberships')
    .where('orgId', '==', orgId)
    .where('status', '==', 'active')
    .get();

  if (membersSnap.empty) return { success: true, sent: 0 };

  const voteUrl = `${APP_BASE_URL}/${orgSlug}/proposals?openPoll=${pollId}`;

  const emailJobs = membersSnap.docs.map(async (memberDoc) => {
    const member      = memberDoc.data();
    const memberEmail = member['email'] as string;
    const memberName  = member['name']  as string;
    if (!memberEmail) return;

    const descRow = poll.description ? `
      <tr>
        <td colspan="2" style="padding:10px 0 0;font-size:13px;color:#57534e;line-height:1.55">${esc(poll.description).replace(/\n/g, '<br>')}</td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fafaf9;border:1px solid #e7e5e4;">
      <tr>
        <td style="background:#171B21;padding:18px 28px;">
          <span style="color:#EFE9DC;font-size:17px;font-weight:700;letter-spacing:-.01em;">Scribb</span>
          <span style="color:#8A8F99;font-size:13px;margin-left:10px;">${esc(orgName)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="color:#a8a29e;font-size:11px;text-transform:uppercase;letter-spacing:.18em;margin:0 0 6px;font-family:monospace;">New Vote</p>
          <h1 style="color:#1c1917;font-size:22px;font-weight:700;margin:0 0 20px;line-height:1.25;">${esc(poll.title)}</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-top:1px solid #f5f5f4;">
            ${descRow}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #e7e5e4;margin-bottom:20px;">
            <tr>
              <td style="padding:22px;text-align:center;">
                <p style="color:#1c1917;font-size:15px;font-weight:600;margin:0 0 14px;">Your vote matters — cast it now</p>
                <a href="${esc(voteUrl)}" style="display:inline-block;background:#1c1917;color:white;text-decoration:none;padding:12px 28px;font-size:14px;font-weight:600;border-radius:4px;">Vote now →</a>
              </td>
            </tr>
          </table>
          <p style="color:#a8a29e;font-size:12px;text-align:center;margin:0;">
            You're receiving this because you're an active member of ${esc(orgName)}.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    if (!brevoKey) {
      logger.info(`[DEV POLL EMAIL] → ${memberEmail}`);
      return;
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: `${orgName} via Scribb`, email: senderEmail },
        to: [{ email: memberEmail, name: memberName }],
        subject: `🗳️ Vote now: ${poll.title} — ${orgName}`,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const d = await res.json() as { message?: string };
      logger.warn(`Poll email failed for ${memberEmail}: ${d.message}`);
    }
  });

  const results = await Promise.allSettled(emailJobs);
  const failed  = results.filter((r) => r.status === 'rejected').length;
  const sent    = results.length - failed;
  logger.info(`Poll notifications: ${sent} sent, ${failed} failed for poll ${pollId}`);
  return { success: true, sent, failed };
});

// ─── notifyDuesActivity ─────────────────────────────────────────────────────────
// Emails an org's admins (owner/admin/treasurer/finance) about dues activity:
// - 'submitted': a member submitted a payment that needs admin approval.
// - 'marked_paid': an admin recorded a payment directly — informs the *other*
//   admins so nobody double-records the same payment. Either way, the admin
//   who triggered the action isn't emailed about their own activity.

const DUES_ADMIN_ROLES = ['owner', 'admin', 'treasurer', 'finance'];

export const notifyDuesActivity = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to send notifications.');
  }

  const { orgId, kind, memberName, periodName, amount, currency } = request.data as {
    orgId: string;
    kind: 'submitted' | 'marked_paid';
    memberName: string;
    periodName: string;
    amount: number;
    currency: string;
  };

  if (!orgId || !kind || !memberName || !periodName) {
    throw new HttpsError('invalid-argument', 'orgId, kind, memberName, and periodName are required.');
  }
  if (!['submitted', 'marked_paid'].includes(kind)) {
    throw new HttpsError('invalid-argument', 'kind must be "submitted" or "marked_paid".');
  }

  const callerUid = request.auth.uid;
  const callerSnap = await db.collection('memberships').doc(`${orgId}_${callerUid}`).get();
  if (!callerSnap.exists) throw new HttpsError('permission-denied', 'Not a member of this org.');

  // Marking a payment paid directly is an admin-only action — verify server-side too.
  // Submitting your own payment for approval just requires being a member.
  if (kind === 'marked_paid') {
    const callerRole = (callerSnap.data() as Record<string, unknown>)?.role as string | undefined;
    if (!DUES_ADMIN_ROLES.includes(callerRole ?? '')) {
      throw new HttpsError('permission-denied', 'Only admins can record payments directly.');
    }
  }

  const brevoKey    = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@scribb.net';

  const orgSnap = await db.collection('organizations').doc(orgId).get();
  if (!orgSnap.exists) throw new HttpsError('not-found', 'Organization not found.');
  const orgData = orgSnap.data()!;
  const orgName = orgData['name'] as string;
  const orgSlug = (orgData['slug'] as string | undefined) ?? orgId;

  const adminsSnap = await db.collection('memberships')
    .where('orgId', '==', orgId)
    .where('status', '==', 'active')
    .where('role', 'in', DUES_ADMIN_ROLES)
    .get();

  if (adminsSnap.empty) return { success: true, sent: 0 };

  const duesUrl = `${APP_BASE_URL}/${orgSlug}/dues`;
  const amountStr = `${currency ?? ''} ${(amount ?? 0).toFixed(2)}`.trim();

  const isSubmitted = kind === 'submitted';
  const subject = isSubmitted
    ? `Dues payment awaiting approval — ${memberName}`
    : `Dues payment recorded — ${memberName}`;
  const eyebrow = isSubmitted ? 'Approval needed' : 'Payment recorded';
  const heading = isSubmitted ? 'A payment needs your approval' : 'A payment was recorded';
  const bodyText = isSubmitted
    ? `${esc(memberName)} submitted a dues payment of <strong>${esc(amountStr)}</strong> for <strong>${esc(periodName)}</strong>. It's waiting on an admin to approve or reject it.`
    : `${esc(memberName)}'s dues payment of <strong>${esc(amountStr)}</strong> for <strong>${esc(periodName)}</strong> was recorded as paid by another admin — no action needed, just keeping you in the loop.`;
  const cta = isSubmitted ? 'Review and approve' : 'View in Scribb';

  const emailJobs = adminsSnap.docs
    .filter((d) => (d.data() as Record<string, unknown>)['userId'] !== callerUid)
    .map(async (adminDoc) => {
      const adminMember = adminDoc.data();
      const adminEmail  = adminMember['email'] as string;
      const adminName   = adminMember['name']  as string;
      if (!adminEmail) return;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fafaf9;border:1px solid #e7e5e4;">
      <tr>
        <td style="background:#171B21;padding:18px 28px;">
          <span style="color:#EFE9DC;font-size:17px;font-weight:700;letter-spacing:-.01em;">Scribb</span>
          <span style="color:#8A8F99;font-size:13px;margin-left:10px;">${esc(orgName)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="color:#a8a29e;font-size:11px;text-transform:uppercase;letter-spacing:.18em;margin:0 0 6px;font-family:monospace;">${esc(eyebrow)}</p>
          <h1 style="color:#1c1917;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.25;">${esc(heading)}</h1>
          <p style="color:#57534e;font-size:14px;line-height:1.6;margin:0 0 24px;">${bodyText}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #e7e5e4;margin-bottom:20px;">
            <tr>
              <td style="padding:22px;text-align:center;">
                <a href="${esc(duesUrl)}" style="display:inline-block;background:#1c1917;color:white;text-decoration:none;padding:12px 28px;font-size:14px;font-weight:600;border-radius:4px;">${esc(cta)} →</a>
              </td>
            </tr>
          </table>
          <p style="color:#a8a29e;font-size:12px;text-align:center;margin:0;">
            You're receiving this because you're an admin of ${esc(orgName)} on Scribb.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

      if (!brevoKey) {
        logger.info(`[DEV DUES EMAIL] → ${adminEmail} | ${subject}`);
        return;
      }

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: `${orgName} via Scribb`, email: senderEmail },
          to: [{ email: adminEmail, name: adminName }],
          subject,
          htmlContent: html,
        }),
      });

      if (!res.ok) {
        const d = await res.json() as { message?: string };
        logger.warn(`Dues activity email failed for ${adminEmail}: ${d.message}`);
      }
    });

  const results = await Promise.allSettled(emailJobs);
  const failed  = results.filter((r) => r.status === 'rejected').length;
  const sent    = results.length - failed;
  logger.info(`Dues activity (${kind}) notifications: ${sent} sent, ${failed} failed for org ${orgId}`);
  return { success: true, sent, failed };
});

// ─── handleEmailRsvp ──────────────────────────────────────────────────────────
// Validates a per-member RSVP token from an email link and records the response.
// Does NOT require Firebase authentication — the token is the proof of identity.

export const handleEmailRsvp = onCall({ cors: true }, async (request) => {
  const { orgId, eventId, memberId, token, status } = request.data as {
    orgId: string;
    eventId: string;
    memberId: string;
    token: string;
    status: string;
  };

  const validStatuses = ['attending', 'maybe', 'declining'];
  if (!validStatuses.includes(status)) {
    throw new HttpsError('invalid-argument', 'Invalid RSVP status.');
  }
  if (!orgId || !eventId || !memberId || !token) {
    throw new HttpsError('invalid-argument', 'Missing required RSVP parameters.');
  }

  const tokenKey  = `${orgId}_${eventId}_${memberId}`;
  const tokenDoc  = await db.collection('eventRsvpTokens').doc(tokenKey).get();

  if (!tokenDoc.exists) {
    throw new HttpsError('not-found', 'This RSVP link is invalid or has expired.');
  }

  const td = tokenDoc.data()!;
  if (td['token'] !== token) {
    throw new HttpsError('unauthenticated', 'Invalid RSVP token.');
  }
  if (Date.now() > (td['expiresAt'] as number)) {
    throw new HttpsError('deadline-exceeded', 'This RSVP link has expired.');
  }

  const memberName = td['memberName'] as string;

  await db.collection('organizations').doc(orgId)
    .collection('events').doc(eventId)
    .update({
      [`rsvps.${memberId}`]: {
        name: memberName,
        status,
        respondedAt: new Date().toISOString(),
      },
    });

  // Fetch event + org slug for the confirmation page
  const [eventDoc, orgDoc] = await Promise.all([
    db.collection('organizations').doc(orgId).collection('events').doc(eventId).get(),
    db.collection('organizations').doc(orgId).get(),
  ]);

  const orgSlug = (orgDoc.data()?.['slug'] as string | undefined) ?? orgId;

  return {
    success: true,
    status,
    memberName,
    eventTitle:     (eventDoc.data()?.['title']     as string) ?? '',
    eventStartDate: (eventDoc.data()?.['startDate'] as string) ?? '',
    orgSlug,
  };
});

// ─── sharePreview ─────────────────────────────────────────────────────────────
// HTTP function that serves OG-tagged HTML for social sharing previews.
// Firebase Hosting rewrites /share/** to this function.
// Crawlers (WhatsApp, Telegram, etc.) see OG meta tags.
// Real users get a JS redirect into the app.

export const sharePreview = onRequest(async (req, res) => {
  // Path: /share/{orgSlug}/{type}/{id}
  const parts = req.path.split('/').filter(Boolean);
  const [, orgSlug, type, id] = parts; // parts[0] = 'share'

  if (!orgSlug || !type || !id || !['event', 'poll'].includes(type)) {
    res.status(404).send('Not found');
    return;
  }

  const orgSnap = await db.collection('organizations')
    .where('slug', '==', orgSlug)
    .limit(1)
    .get();

  if (orgSnap.empty) { res.status(404).send('Not found'); return; }

  const orgDoc  = orgSnap.docs[0];
  const orgData = orgDoc.data();
  const orgName = orgData['name'] as string;

  const ogImage  = `${APP_BASE_URL}/icon.png`;
  const shareUrl = `${APP_BASE_URL}/share/${orgSlug}/${type}/${id}`;
  const css = `*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafaf9;display:flex;align-items:flex-start;justify-content:center;min-height:100vh;margin:0;padding:32px 20px}.card{max-width:480px;width:100%}.logo{font-size:18px;font-weight:700;color:#1c1917;letter-spacing:-.01em;margin-bottom:28px}.badge{font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:#b45309;font-family:monospace;margin-bottom:6px}h1{font-size:22px;font-weight:700;color:#1c1917;margin:0 0 12px;line-height:1.3}.meta{font-size:13px;color:#78716c;margin-bottom:6px}.desc{font-size:14px;color:#57534e;margin:14px 0 0;line-height:1.65;white-space:pre-line}hr{border:none;border-top:1px solid #e7e5e4;margin:20px 0}.rsvp-label{font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#78716c;margin-bottom:10px}.rsvp-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.btn{display:inline-block;padding:10px 20px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px}.btn-a{background:#059669;color:#fff}.btn-m{background:#d97706;color:#fff}.btn-d{background:#78716c;color:#fff}.btn-open{display:block;text-align:center;padding:10px 16px;font-size:13px;color:#78716c;text-decoration:none;border:1px solid #e7e5e4;border-radius:6px;margin-top:8px}.body-text{font-size:15px;color:#1c1917;line-height:1.7;white-space:pre-line;margin:0 0 20px}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (type === 'event') {
    const eventDoc = await db.collection('organizations').doc(orgDoc.id)
      .collection('events').doc(id).get();
    if (!eventDoc.exists) { res.status(404).send('Not found'); return; }

    const ev       = eventDoc.data()!;
    const evTitle  = ev['title'] as string;
    const dateStr  = formatEventDate(ev['startDate'] as string, ev['endDate'] as string | undefined, ev['allDay'] as boolean | undefined);
    const evLoc    = ev['location'] as string | undefined;
    const evDesc   = ev['description'] as string | undefined;

    const ogTitle  = `${orgName} - Event`;
    const ogDesc   = evTitle + (evDesc ? `: ${evDesc.slice(0, 150)}` : ` · ${dateStr}`);
    const eventsUrl = `${APP_BASE_URL}/${orgSlug}/calendar`;

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(ogTitle)}</title>
  <meta name="description" content="${esc(ogDesc)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${esc(shareUrl)}" />
  <meta property="og:site_name" content="Scribb" />
  <meta property="og:title" content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDesc)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1254" />
  <meta property="og:image:height" content="1254" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDesc)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />
  <style>${css}</style>
</head>
<body>
  <div class="card">
    <div class="logo">Scribb</div>
    <div class="badge">${esc(orgName)} · Event</div>
    <h1>${esc(evTitle)}</h1>
    <div class="meta">📅 ${esc(dateStr)}</div>
    ${evLoc  ? `<div class="meta">📍 ${esc(evLoc)}</div>` : ''}
    ${evDesc ? `<p class="desc">${esc(evDesc)}</p>`        : ''}
    <hr />
    <div class="rsvp-label">RSVP</div>
    <div class="rsvp-row">
      <a href="${esc(eventsUrl)}?openEvent=${esc(id)}&amp;rsvp=attending" class="btn btn-a">Attending</a>
      <a href="${esc(eventsUrl)}?openEvent=${esc(id)}&amp;rsvp=maybe"     class="btn btn-m">Maybe</a>
      <a href="${esc(eventsUrl)}?openEvent=${esc(id)}&amp;rsvp=declining" class="btn btn-d">Declining</a>
    </div>
    <a href="${esc(eventsUrl)}?openEvent=${esc(id)}" class="btn-open">View in Scribb →</a>
  </div>
</body>
</html>`);
    return;
  }

  // Poll
  if (type === 'poll') {
    const pollDoc = await db.collection('organizations').doc(orgDoc.id)
      .collection('polls').doc(id).get();
    if (!pollDoc.exists) { res.status(404).send('Not found'); return; }

    const poll       = pollDoc.data()!;
    const pollTitle  = poll['title'] as string;
    const pollDesc   = (poll['description'] as string | undefined) ?? '';
    const options    = (poll['options'] as { id: string; text: string }[]) ?? [];
    const votes      = (poll['votes'] as Record<string, { optionIds: string[] }>) ?? {};
    const totalVotes = Object.keys(votes).length;
    const pollStatus = poll['status'] as string;
    const deadline   = (poll['deadline'] as string | undefined) ?? '';

    const counts: Record<string, number> = {};
    for (const opt of options) counts[opt.id] = 0;
    for (const v of Object.values(votes)) {
      for (const oid of v.optionIds) counts[oid] = (counts[oid] ?? 0) + 1;
    }

    const votesUrl    = APP_BASE_URL + '/' + orgSlug + '/proposals?openPoll=' + esc(id);
    const pollOgTitle = orgName + ' - Vote';
    const pollOgDesc  = pollTitle + (pollDesc ? ': ' + pollDesc.slice(0, 150) : '');
    const statusBadge = pollStatus === 'closed' ? ' · Closed' : '';
    const voteBtn     = pollStatus === 'active'
      ? '<a href="' + esc(votesUrl) + '" class="btn btn-a" style="display:block;text-align:center;margin-bottom:8px">Vote now</a>'
      : '<p style="font-size:13px;color:#78716c;text-align:center;margin-bottom:8px">Voting has closed.</p>';
    const deadlineRow = deadline ? (' · Closes ' + esc(deadline)) : '';

    const optionRows = options.map((opt) => {
      const cnt = counts[opt.id] ?? 0;
      const pct = totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0;
      return '<div style="margin-bottom:10px">'
        + '<div style="display:flex;justify-content:space-between;font-size:13px;color:#1c1917;margin-bottom:4px">'
        + '<span>' + esc(opt.text) + '</span>'
        + '<span style="font-family:monospace;color:#78716c">' + cnt + ' · ' + pct + '%</span>'
        + '</div>'
        + '<div style="height:6px;background:#f5f5f4;border-radius:99px;overflow:hidden">'
        + '<div style="height:100%;width:' + pct + '%;background:#1c1917;border-radius:99px"></div>'
        + '</div></div>';
    }).join('');

    const descHtml = pollDesc ? '<p class="desc" style="margin-bottom:16px">' + esc(pollDesc) + '</p>' : '';

    res.send('<!DOCTYPE html><html lang="en"><head>'
      + '<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>'
      + '<title>' + esc(pollOgTitle) + '</title>'
      + '<meta name="description" content="' + esc(pollOgDesc) + '"/>'
      + '<meta property="og:type" content="website"/>'
      + '<meta property="og:url" content="' + esc(shareUrl) + '"/>'
      + '<meta property="og:site_name" content="Scribb"/>'
      + '<meta property="og:title" content="' + esc(pollOgTitle) + '"/>'
      + '<meta property="og:description" content="' + esc(pollOgDesc) + '"/>'
      + '<meta property="og:image" content="' + esc(ogImage) + '"/>'
      + '<meta property="og:image:width" content="1254"/>'
      + '<meta property="og:image:height" content="1254"/>'
      + '<meta name="twitter:card" content="summary_large_image"/>'
      + '<meta name="twitter:title" content="' + esc(pollOgTitle) + '"/>'
      + '<meta name="twitter:description" content="' + esc(pollOgDesc) + '"/>'
      + '<meta name="twitter:image" content="' + esc(ogImage) + '"/>'
      + '<style>' + css + '</style>'
      + '</head><body><div class="card">'
      + '<div class="logo">Scribb</div>'
      + '<div class="badge">' + esc(orgName) + ' · Vote' + statusBadge + '</div>'
      + '<h1>' + esc(pollTitle) + '</h1>'
      + descHtml
      + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#78716c;margin-bottom:8px">'
      + totalVotes + ' vote' + (totalVotes !== 1 ? 's' : '') + deadlineRow
      + '</div>'
      + optionRows
      + '<hr/>'
      + voteBtn
      + '<a href="' + esc(votesUrl) + '" class="btn-open">View in Scribb</a>'
      + '</div></body></html>');
    return;
  }

  // Unreachable given the whitelist check above, but keeps control flow explicit
  // now that 'announcement' is no longer a valid share type.
  res.status(404).send('Not found');
});

// ─── publicOrgData ────────────────────────────────────────────────────────────
// Public JSON endpoint for external websites to display live org summary data.
// No authentication required. Accessible via GET /api/public-data?orgSlug=xxx
// Returns: memberCount, upcomingEvents, duesRates, transparencyUrl, eventsUrl

export const publicOrgData = onRequest({ cors: true }, async (req, res) => {
  const orgSlug = (req.query['orgSlug'] as string | undefined ?? '').trim();

  if (!orgSlug) {
    res.status(400).json({ error: 'orgSlug query parameter is required' });
    return;
  }

  const orgSnap = await db.collection('organizations')
    .where('slug', '==', orgSlug)
    .limit(1)
    .get();

  if (orgSnap.empty) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const orgDoc  = orgSnap.docs[0];
  const orgId   = orgDoc.id;
  const orgData = orgDoc.data();

  const now = new Date().toISOString();

  const [membersSnap, eventsSnap] = await Promise.all([
    db.collection('memberships')
      .where('orgId', '==', orgId)
      .where('status', '==', 'active')
      .get(),
    db.collection('organizations').doc(orgId)
      .collection('events')
      .where('startDate', '>=', now)
      .orderBy('startDate', 'asc')
      .limit(6)
      .get(),
  ]);

  const upcomingEvents = eventsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id:          doc.id,
      title:       d['title']       as string,
      startDate:   d['startDate']   as string,
      endDate:     (d['endDate']    as string | undefined) ?? null,
      location:    (d['location']   as string | undefined) ?? null,
      description: (d['description'] as string | undefined) ?? null,
      allDay:      (d['allDay']     as boolean | undefined) ?? false,
      imageUrl:    (d['imageUrl']   as string | undefined) ?? null,
    };
  });

  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    memberCount:     membersSnap.size,
    upcomingEvents,
    duesRates:       orgData['duesRates'] ?? null,
    tagline:         (orgData['tagline'] as string) || null,
    logoUrl:         (orgData['logoUrl'] as string) || null,
    transparencyUrl: `${APP_BASE_URL}/${orgSlug}/transparency`,
    eventsUrl:       `${APP_BASE_URL}/${orgSlug}/calendar`,
  });
});

// ─── createNotifications ──────────────────────────────────────────────────────

export const createNotifications = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in.');

  const { orgId, type, title, body, link } = (request.data ?? {}) as {
    orgId?: string;
    type?: string;
    title?: string;
    body?: string;
    link?: string;
  };

  if (!orgId || !type || !title || !link) {
    throw new HttpsError('invalid-argument', 'Missing required fields.');
  }

  // Verify caller is an active member of the org
  const callerUid  = request.auth.uid;
  const membershipId = `${orgId}_${callerUid}`;
  const callerSnap = await db.collection('memberships').doc(membershipId).get();
  if (!callerSnap.exists) throw new HttpsError('permission-denied', 'Not a member of this org.');

  const callerRole = (callerSnap.data() as Record<string, unknown>)?.role as string | undefined;
  const canAnnounce = ['owner', 'admin', 'treasurer', 'finance'].includes(callerRole ?? '');
  if (!canAnnounce) throw new HttpsError('permission-denied', 'Insufficient role.');

  // Fetch all active members of the org
  const membersSnap = await db.collection('memberships')
    .where('orgId', '==', orgId)
    .where('status', '==', 'active')
    .get();

  const uids = membersSnap.docs.map((d) => (d.data() as Record<string, unknown>).userId as string).filter(Boolean);
  if (uids.length === 0) return { sent: 0 };

  const now = new Date().toISOString();
  const notifPayload = { orgId, type, title, body: body ?? '', link, read: false, createdAt: now };

  // Write in batches of 499 (Firestore batch limit is 500 ops)
  const BATCH_SIZE = 499;
  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const uid of uids.slice(i, i + BATCH_SIZE)) {
      const ref = db.collection('users').doc(uid).collection('notifications').doc();
      batch.set(ref, notifPayload);
    }
    await batch.commit();
  }

  // Best-effort FCM push
  try {
    const userDocs = await Promise.all(uids.map((uid) => db.collection('users').doc(uid).get()));
    const tokens: string[] = [];
    for (const d of userDocs) {
      const fcmTokens = (d.data() as Record<string, unknown> | undefined)?.fcmTokens;
      if (Array.isArray(fcmTokens)) tokens.push(...(fcmTokens as string[]));
    }
    if (tokens.length > 0) {
      const FCM_BATCH = 500;
      for (let i = 0; i < tokens.length; i += FCM_BATCH) {
        await admin.messaging().sendEachForMulticast({
          tokens: tokens.slice(i, i + FCM_BATCH),
          notification: { title, body: body ?? '' },
          webpush: {
            notification: { title, body: body ?? '', icon: `${APP_BASE_URL}/icon.png` },
            fcmOptions: { link: `${APP_BASE_URL}${link}` },
          },
        });
      }
    }
  } catch (e) {
    logger.warn('FCM push best-effort failed:', e);
  }

  return { sent: uids.length };
});

// ─── cleanupAbandonedDraftOrgs ─────────────────────────────────────────────────

const DRAFT_RETENTION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export const cleanupAbandonedDraftOrgs = onSchedule('every 24 hours', async () => {
  const cutoffMs = Date.now() - DRAFT_RETENTION_MS;

  const snap = await db.collection('organizations')
    .where('organizationStatus', 'in', ['draft', 'pending_payment'])
    .get();

  let deleted = 0;
  for (const orgDoc of snap.docs) {
    const data = orgDoc.data() as Record<string, unknown>;
    const createdAtTs = data.createdAtTs as admin.firestore.Timestamp | undefined;
    if (!createdAtTs || createdAtTs.toMillis() > cutoffMs) continue; // still within retention window

    const memberSnap = await db.collection('memberships').where('orgId', '==', orgDoc.id).get();
    const batch = db.batch();
    for (const m of memberSnap.docs) batch.delete(m.ref);
    batch.delete(orgDoc.ref);
    await batch.commit();
    deleted++;
  }

  logger.info(`cleanupAbandonedDraftOrgs: removed ${deleted} abandoned draft organization(s).`);
});
