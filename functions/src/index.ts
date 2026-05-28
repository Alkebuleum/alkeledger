import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

admin.initializeApp();

const db = admin.firestore();
const adminAuth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://bracket-f99ff.web.app';

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
    inviteCode: upperCode,
    memberCount: memberSnap.size,
    inviteeName,
    inviteeEmail,
  };
});

// ─── redeemInvite ─────────────────────────────────────────────────────────────

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

  const email          = inviteData['email'] as string;
  const orgId          = inviteData['orgId'] as string;
  const memberType     = (inviteData['memberType'] as string) || 'individual';
  const memberOrgName  = (inviteData['orgName']  as string | null) ?? null;
  const memberOrgTitle = (inviteData['orgTitle'] as string | null) ?? null;

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

// ─── notifyEventCreated ───────────────────────────────────────────────────────
// Sends event invitation emails with one-click RSVP buttons to all active
// members of the org. Called from the client immediately after creating an event.

export const notifyEventCreated = onCall(async (request) => {
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

  const brevoKey    = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@alkeledger.app';

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
  const appEventsUrl = `${APP_BASE_URL}/${orgSlug}/events`;

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
        <td style="background:#1c1917;padding:18px 28px;">
          <span style="color:white;font-size:17px;font-weight:900;letter-spacing:-.02em;">Alke</span><span style="color:white;font-size:17px;font-weight:300;letter-spacing:-.02em;">Ledger</span>
          <span style="color:#57534e;font-size:13px;margin-left:10px;">${esc(orgName)}</span>
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
            <a href="${appEventsUrl}" style="color:#78716c;font-size:13px;text-decoration:underline;">View all events in AlkeLedger →</a>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:14px 28px;border-top:1px solid #e7e5e4;">
          <p style="color:#a8a29e;font-size:11px;margin:0;">You're receiving this because you're a member of ${esc(orgName)} on AlkeLedger.</p>
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
        sender: { name: `${orgName} via AlkeLedger`, email: senderEmail },
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

// ─── handleEmailRsvp ──────────────────────────────────────────────────────────
// Validates a per-member RSVP token from an email link and records the response.
// Does NOT require Firebase authentication — the token is the proof of identity.

export const handleEmailRsvp = onCall(async (request) => {
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

  if (!orgSlug || !type || !id || !['event', 'announcement'].includes(type)) {
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

  let ogTitle       = '';
  let ogDescription = '';
  let appUrl        = `${APP_BASE_URL}/${orgSlug}`;

  if (type === 'event') {
    const eventDoc = await db.collection('organizations').doc(orgDoc.id)
      .collection('events').doc(id).get();
    if (!eventDoc.exists) { res.status(404).send('Not found'); return; }

    const ev = eventDoc.data()!;
    const dateStr = formatEventDate(ev['startDate'] as string, ev['endDate'] as string | undefined, ev['allDay'] as boolean | undefined);
    ogTitle       = `${ev['title'] as string} — ${orgName}`;
    ogDescription = [dateStr, ev['location'], ev['description']]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 200);
    appUrl = `${APP_BASE_URL}/${orgSlug}/events`;

  } else {
    const annDoc = await db.collection('organizations').doc(orgDoc.id)
      .collection('announcements').doc(id).get();
    if (!annDoc.exists) { res.status(404).send('Not found'); return; }

    const ann = annDoc.data()!;
    ogTitle       = `${ann['title'] as string} — ${orgName}`;
    ogDescription = ((ann['body'] as string) ?? '').slice(0, 200);
    appUrl = `${APP_BASE_URL}/${orgSlug}/announcements`;
  }

  const shareUrl = `${APP_BASE_URL}/share/${orgSlug}/${type}/${id}`;
  const ogImage  = `${APP_BASE_URL}/logo.png`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(ogTitle)}</title>
  <meta name="description" content="${esc(ogDescription)}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${esc(shareUrl)}" />
  <meta property="og:site_name"   content="AlkeLedger" />
  <meta property="og:title"       content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDescription)}" />
  <meta property="og:image"       content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1080" />
  <meta property="og:image:height" content="734" />

  <!-- Twitter / X -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDescription)}" />
  <meta name="twitter:image"       content="${esc(ogImage)}" />

  <meta http-equiv="refresh" content="0;url=${esc(appUrl)}" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #fafaf9; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
    .card { max-width: 480px; width: 100%; text-align: center; }
    .logo { font-size: 20px; font-weight: 900; color: #1c1917; letter-spacing: -.02em; margin-bottom: 24px; }
    .logo span { font-weight: 300; }
    h1 { font-size: 20px; color: #1c1917; margin: 0 0 8px; }
    p  { font-size: 14px; color: #78716c; margin: 0 0 20px; }
    a  { display: inline-block; padding: 12px 24px; background: #1c1917; color: white;
         text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Alke<span>Ledger</span></div>
    <h1>${esc(ogTitle)}</h1>
    <p>${esc(ogDescription)}</p>
    <a href="${esc(appUrl)}">Open in AlkeLedger →</a>
  </div>
  <script>window.location.replace('${appUrl.replace(/'/g, "\\'")}');</script>
</body>
</html>`);
});
