/**
 * LifeLeadger - Firebase Cloud Functions
 * Password Reset OTP System
 *
 * Functions:
 *  - sendOtp        POST { email }              → generates & emails 6-digit OTP
 *  - verifyOtp      POST { email, otp }         → validates OTP, returns a short-lived token
 *  - resetPassword  POST { email, token, newPassword } → updates password via Admin SDK
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');

admin.initializeApp();
const db = admin.firestore();

/* ─────────────────────────────────────────────────────────────────
   CONFIGURE YOUR GMAIL CREDENTIALS
   Set these with:
     firebase functions:config:set gmail.user="you@gmail.com" gmail.pass="your-app-password"
   Then redeploy.
   ───────────────────────────────────────────────────────────────── */
const getTransporter = () => {
  const gmailUser = functions.config().gmail?.user;
  const gmailPass = functions.config().gmail?.pass;

  if (!gmailUser || !gmailPass) {
    throw new Error('Gmail credentials not configured. Run: firebase functions:config:set gmail.user="..." gmail.pass="..."');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass   // Use a Gmail App Password, NOT your real Gmail password
    }
  });
};

/* ─── Constants ─── */
const OTP_EXPIRY_MS    = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRY_MS  = 15 * 60 * 1000; // 15 minutes (after OTP verified)
const MAX_OTP_ATTEMPTS = 5;

/* ─── CORS helper ─── */
const corsOrigins = ['http://localhost:3000', 'http://localhost:5173'];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (corsOrigins.includes(origin) || (origin && origin.startsWith('https://'))) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

/* ═══════════════════════════════════════════════════════════════
   FUNCTION 1 — sendOtp
   Generates a 6-digit OTP, stores it in Firestore, emails it.
   ═══════════════════════════════════════════════════════════════ */
exports.sendOtp = functions.https.onRequest(async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { email } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    /* 1. Check the user exists in Firebase Auth */
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(normalizedEmail);
    } catch (authErr) {
      // Return a generic message so we don't reveal whether accounts exist
      return res.status(200).json({ success: true, message: 'If an account exists, an OTP has been sent.' });
    }

    /* 2. Rate-limit: max 3 OTPs per hour per email */
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentOtps = await db.collection('passwordResetOtps')
      .where('email', '==', normalizedEmail)
      .where('createdAt', '>', oneHourAgo)
      .get();

    if (recentOtps.size >= 3) {
      return res.status(429).json({ error: 'Too many reset attempts. Please wait an hour before trying again.' });
    }

    /* 3. Delete any existing unused OTPs for this email */
    const existingOtps = await db.collection('passwordResetOtps')
      .where('email', '==', normalizedEmail)
      .where('used', '==', false)
      .get();

    const deletePromises = existingOtps.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    /* 4. Generate a 6-digit OTP */
    const otp = crypto.randomInt(100000, 999999).toString();

    /* 5. Hash the OTP before storing (never store plain OTPs) */
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    /* 6. Store in Firestore */
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    await db.collection('passwordResetOtps').add({
      email:     normalizedEmail,
      otpHash,
      createdAt: Date.now(),
      expiresAt,
      used:      false,
      attempts:  0,
      uid:       userRecord.uid
    });

    /* 7. Send the email */
    const transporter = getTransporter();
    const gmailUser   = functions.config().gmail.user;

    const mailOptions = {
      from: `"LifeLeadger" <${gmailUser}>`,
      to:   normalizedEmail,
      subject: 'LifeLeadger — Your Password Reset Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="margin:0;padding:0;background:#0A0F1E;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0F1E;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" style="max-width:480px;background:#0F172A;border-radius:16px;border:1px solid rgba(34,211,238,0.2);overflow:hidden;">
                    
                    <!-- Top accent bar -->
                    <tr>
                      <td style="height:3px;background:linear-gradient(90deg,transparent,#22D3EE,transparent);"></td>
                    </tr>

                    <!-- Header -->
                    <tr>
                      <td style="padding:32px 32px 20px;text-align:center;">
                        <h1 style="margin:0;font-size:22px;letter-spacing:4px;color:#ffffff;">LIFELEADGER</h1>
                        <p style="margin:8px 0 0;font-size:11px;letter-spacing:2px;color:#22D3EE;text-transform:uppercase;">Password Reset</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding:0 32px 12px;text-align:center;">
                        <p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.7;margin:0 0 24px;">
                          You requested a password reset for your LifeLeadger account.<br>
                          Use the code below to continue. It expires in <strong style="color:#22D3EE;">10 minutes</strong>.
                        </p>

                        <!-- OTP box -->
                        <div style="background:rgba(34,211,238,0.06);border:2px solid rgba(34,211,238,0.3);border-radius:12px;padding:24px 32px;margin:0 auto 24px;display:inline-block;">
                          <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;color:rgba(34,211,238,0.6);text-transform:uppercase;">Your Reset Code</p>
                          <p style="margin:0;font-size:42px;font-weight:bold;letter-spacing:12px;color:#22D3EE;font-family:'Courier New',monospace;">${otp}</p>
                        </div>

                        <p style="color:rgba(255,255,255,0.35);font-size:11px;line-height:1.6;margin:0 0 8px;">
                          Enter this code in the LifeLeadger app to reset your password.<br>
                          <strong style="color:rgba(255,87,87,0.7);">Do not share this code with anyone.</strong>
                        </p>
                        <p style="color:rgba(255,255,255,0.25);font-size:10px;margin:0 0 8px;">
                          If you didn't request this, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:16px 32px 28px;text-align:center;border-top:1px solid rgba(34,211,238,0.08);">
                        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.2);letter-spacing:1px;">
                          © LifeLeadger · This is an automated message
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: 'If an account exists, an OTP has been sent.',
      expiresIn: OTP_EXPIRY_MS / 1000
    });

  } catch (err) {
    console.error('sendOtp error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});


/* ═══════════════════════════════════════════════════════════════
   FUNCTION 2 — verifyOtp
   Validates the 6-digit OTP and returns a one-time reset token.
   ═══════════════════════════════════════════════════════════════ */
exports.verifyOtp = functions.https.onRequest(async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOtp   = otp.toString().trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    return res.status(400).json({ error: 'OTP must be a 6-digit number.' });
  }

  try {
    /* Find the active OTP document */
    const otpQuery = await db.collection('passwordResetOtps')
      .where('email', '==', normalizedEmail)
      .where('used',  '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (otpQuery.empty) {
      return res.status(400).json({ error: 'No active reset code found. Please request a new one.' });
    }

    const otpDoc  = otpQuery.docs[0];
    const otpData = otpDoc.data();

    /* Check expiry */
    if (Date.now() > otpData.expiresAt) {
      await otpDoc.ref.update({ used: true });
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    /* Check attempt limit */
    if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
      await otpDoc.ref.update({ used: true });
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    /* Verify hash */
    const inputHash = crypto.createHash('sha256').update(normalizedOtp).digest('hex');
    if (inputHash !== otpData.otpHash) {
      await otpDoc.ref.update({ attempts: otpData.attempts + 1 });
      const remaining = MAX_OTP_ATTEMPTS - (otpData.attempts + 1);
      return res.status(400).json({
        error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      });
    }

    /* ✅ OTP is valid — generate a short-lived reset token */
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash  = crypto.createHash('sha256').update(resetToken).digest('hex');

    await otpDoc.ref.update({
      used:          true,
      verifiedAt:    Date.now(),
      resetTokenHash: tokenHash,
      tokenExpiresAt: Date.now() + TOKEN_EXPIRY_MS
    });

    return res.status(200).json({
      success:    true,
      resetToken,                    // send back to the client (plain)
      expiresIn:  TOKEN_EXPIRY_MS / 1000
    });

  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});


/* ═══════════════════════════════════════════════════════════════
   FUNCTION 3 — resetPassword
   Verifies the reset token and updates the user's password.
   ═══════════════════════════════════════════════════════════════ */
exports.resetPassword = functions.https.onRequest(async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { email, resetToken, newPassword } = req.body;

  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({ error: 'Email, reset token, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    /* Find the verified OTP document with this token */
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const tokenQuery = await db.collection('passwordResetOtps')
      .where('email',          '==', normalizedEmail)
      .where('used',           '==', true)
      .where('resetTokenHash', '==', tokenHash)
      .limit(1)
      .get();

    if (tokenQuery.empty) {
      return res.status(400).json({ error: 'Invalid or expired reset session. Please start over.' });
    }

    const tokenDoc  = tokenQuery.docs[0];
    const tokenData = tokenDoc.data();

    /* Check token expiry */
    if (Date.now() > tokenData.tokenExpiresAt) {
      return res.status(400).json({ error: 'Reset session has expired. Please start over.' });
    }

    /* Update the password using Admin SDK */
    await admin.auth().updateUser(tokenData.uid, { password: newPassword });

    /* Invalidate the token so it can't be reused */
    await tokenDoc.ref.update({
      resetTokenHash: null,
      tokenExpiresAt: 0,
      passwordUpdatedAt: Date.now()
    });

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });

  } catch (err) {
    console.error('resetPassword error:', err);
    if (err.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Password is too weak. Please choose a stronger password.' });
    }
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});


/* ═══════════════════════════════════════════════════════════════
   CLEANUP JOB — runs daily to delete expired OTP documents
   ═══════════════════════════════════════════════════════════════ */
exports.cleanupExpiredOtps = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoff    = Date.now() - 24 * 60 * 60 * 1000;
    const expiredDocs = await db.collection('passwordResetOtps')
      .where('createdAt', '<', cutoff)
      .get();

    const deletePromises = expiredDocs.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log(`Cleaned up ${expiredDocs.size} expired OTP documents.`);
    return null;
  });