const nodemailer = require('nodemailer');

/**
 * Creates the appropriate Nodemailer transporter based on available environment variables.
 * Priority:
 * 1. Gmail OAuth2 (OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REFRESH_TOKEN)
 * 2. Standard SMTP / App Password (SMTP_HOST, SMTP_USER, SMTP_PASS)
 * 3. Fallback: null (prints formatted email & temporary password to terminal)
 */
function createTransporter() {
  const {
    EMAIL_FROM,
    GMAIL_USER,
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    OAUTH_REFRESH_TOKEN,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  // 1. Check for OAuth2 configuration
  if (GMAIL_USER && OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET && OAUTH_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: GMAIL_USER,
        clientId: OAUTH_CLIENT_ID,
        clientSecret: OAUTH_CLIENT_SECRET,
        refreshToken: OAUTH_REFRESH_TOKEN,
      },
    });
  }

  // 2. Check for standard SMTP configuration (or Google App Password)
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  // 3. Fallback in development mode
  return null;
}

/**
 * Generates an aesthetic, clean, modern dark-mode HTML email template.
 */
function buildTemporaryPasswordHtml({ username, tempPassword }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TwoGether Temporary Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #080c14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #080c14;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid rgba(0, 242, 254, 0.28);
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 254, 0.12);
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      margin-bottom: 20px;
      padding: 10px 18px;
      background: rgba(0, 242, 254, 0.12);
      border: 1px solid rgba(0, 242, 254, 0.35);
      border-radius: 999px;
      font-weight: 800;
      font-size: 14px;
      color: #00f2fe;
      letter-spacing: 0.05em;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 20px;
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
    }
    .password-box {
      margin: 28px 0;
      padding: 18px 24px;
      background: #090e18;
      border: 1.5px dashed rgba(0, 242, 254, 0.5);
      border-radius: 12px;
    }
    .password-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .password-val {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: #00f2fe;
      text-shadow: 0 0 16px rgba(0, 242, 254, 0.4);
      user-select: all;
    }
    .instructions {
      background: rgba(168, 85, 247, 0.1);
      border: 1px solid rgba(168, 85, 247, 0.25);
      border-radius: 10px;
      padding: 14px 18px;
      margin: 24px 0 28px;
      text-align: left;
    }
    .instructions p {
      margin: 0;
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .instructions strong {
      color: #d8b4fe;
    }
    .btn-login {
      display: inline-block;
      background: linear-gradient(135deg, #00f2fe, #4facfe);
      color: #04121f !important;
      font-weight: 800;
      font-size: 15px;
      padding: 12px 28px;
      border-radius: 10px;
      text-decoration: none;
      box-shadow: 0 4px 18px rgba(0, 242, 254, 0.35);
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo-badge">⚡ TWOGETHER SECURITY</div>
      <h1>Temporary Login Password</h1>
      <p>Hello <strong>${username}</strong>,<br>We received a request to access your TwoGether account. Use the temporary password below to sign in:</p>
      
      <div class="password-box">
        <div class="password-label">YOUR TEMPORARY PASSWORD</div>
        <div class="password-val">${tempPassword}</div>
      </div>

      <div class="instructions">
        <p>⚠️ <strong>Important:</strong> After logging in with this temporary password, please head to <strong>Settings &gt; Change Password</strong> inside the app to choose a secure, permanent password of your choice.</p>
      </div>

      <a href="${process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0] : 'http://localhost:5173'}/login" class="btn-login">
        Sign In to TwoGether →
      </a>

      <div class="footer">
        If you did not request this temporary password, you can safely ignore this email or change your password if you suspect unauthorized access.<br>
        © ${new Date().getFullYear()} TwoGether. Shared Momentum & Habit Tracking.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends a temporary password email to the specified user.
 * If no transport is configured, logs the aesthetic output to console for instant local testing.
 */
async function sendTemporaryPasswordEmail({ toEmail, username, tempPassword }) {
  const transporter = createTransporter();
  const html = buildTemporaryPasswordHtml({ username, tempPassword });
  const fromAddress = process.env.EMAIL_FROM || process.env.GMAIL_USER || '"TwoGether Security" <security@twogether.app>';

  if (transporter) {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: '🔑 Your TwoGether Temporary Password',
      text: `Hello ${username},\n\nYour temporary password for TwoGether is: ${tempPassword}\n\nPlease log in and immediately change this password in Settings.\n\nBest,\nTwoGether Team`,
      html,
    });
    console.log(`[Email Service] Temporary password email sent to ${toEmail} (messageId: ${info.messageId})`);
    return { success: true, delivered: true, messageId: info.messageId };
  }

  // Development Fallback: output clearly formatted preview in terminal
  console.log('\n' + '='.repeat(60));
  console.log('📨 [TWO-GETHER EMAIL SIMULATOR (No SMTP/OAuth Credentials Configured)]');
  console.log(`To:        ${toEmail}`);
  console.log(`Username:  ${username}`);
  console.log(`Subject:   🔑 Your TwoGether Temporary Password`);
  console.log(`Temporary Password:  >>>>> ${tempPassword} <<<<<`);
  console.log('Action:    Please log in with this temporary password and update it in Settings.');
  console.log('='.repeat(60) + '\n');

  return { success: true, delivered: false, simulated: true, tempPassword };
}

/**
 * Generates an aesthetic, urgent Code-Red dark-mode HTML email for Emergency SOS.
 */
function buildEmergencySOSHtml({ partnerUsername, senderUsername, customMessage, streakCount }) {
  const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0] : 'http://localhost:5173';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Streak SOS from ${senderUsername}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0710;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0710;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background: #180d19;
      border: 1px solid rgba(244, 63, 94, 0.45);
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(244, 63, 94, 0.2);
      text-align: center;
    }
    .badge-sos {
      display: inline-block;
      margin-bottom: 20px;
      padding: 8px 18px;
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.5);
      border-radius: 999px;
      font-weight: 900;
      font-size: 13px;
      color: #ff4b72;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 24px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 20px;
      font-size: 15px;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .streak-alert-box {
      margin: 24px 0;
      padding: 20px 24px;
      background: #0f0714;
      border: 1.5px solid rgba(244, 63, 94, 0.5);
      border-radius: 12px;
      text-align: left;
    }
    .streak-alert-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #ff4b72;
      margin-bottom: 6px;
    }
    .streak-alert-text {
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .streak-meta {
      display: inline-block;
      padding: 6px 12px;
      background: rgba(244, 63, 94, 0.12);
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #fda4af;
    }
    .btn-rescue {
      display: inline-block;
      background: linear-gradient(135deg, #ff4b72, #f43f5e);
      color: #ffffff !important;
      font-weight: 800;
      font-size: 15px;
      padding: 14px 32px;
      border-radius: 10px;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(244, 63, 94, 0.4);
      margin: 10px 0 24px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="badge-sos">🚨 CODE RED • EMERGENCY STREAK ALERT</div>
      <h1>@${senderUsername} Triggered an Emergency SOS!</h1>
      <p>Hello <strong>${partnerUsername}</strong>,<br>Your accountability partner has sounded the emergency streak alarm. Midnight cutoff is approaching and your joint streak is on the line!</p>
      
      <div class="streak-alert-box">
        <div class="streak-alert-title">MESSAGE FROM @${senderUsername}</div>
        <div class="streak-alert-text">“${customMessage || "Midnight cutoff is approaching! Please complete your daily habits so we don't break our streak!"}”</div>
        <div class="streak-meta">🛡️ Joint Streak at Risk: ${streakCount || 0} Days Active</div>
      </div>

      <a href="${clientUrl}/tasks?action=sos&from=${encodeURIComponent(senderUsername)}" class="btn-rescue">
        🛡️ Complete Daily Habits & Save Streak →
      </a>

      <div class="footer">
        You are receiving this emergency alert because your Duo partner dispatched an Emergency SOS on TwoGether.<br>
        © ${new Date().getFullYear()} TwoGether. Shared Accountability & Habit Tracking.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends an Emergency SOS email to the partner.
 */
async function sendEmergencySOSEmail({ toEmail, partnerUsername, senderUsername, customMessage, streakCount }) {
  const transporter = createTransporter();
  const html = buildEmergencySOSHtml({ partnerUsername, senderUsername, customMessage, streakCount });
  const fromAddress = process.env.EMAIL_FROM || process.env.GMAIL_USER || '"TwoGether Emergency SOS" <security@twogether.app>';

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `🚨 EMERGENCY SOS from @${senderUsername}: Save our streak before midnight!`,
        text: `EMERGENCY SOS from @${senderUsername}!\n\n${customMessage || 'Midnight cutoff is approaching — please complete your daily habits to save our joint streak!'}\n\nLog in now to save your streak shield: http://localhost:5173/tasks`,
        html,
      });
      console.log(`[Email Service] Emergency SOS email sent to ${toEmail} (messageId: ${info.messageId})`);
      return { success: true, delivered: true, messageId: info.messageId };
    } catch (err) {
      console.warn(`[Email Service] Failed to deliver Emergency SOS email to ${toEmail}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Development Fallback
  console.log('\n' + '='.repeat(60));
  console.log('🚨 [TWO-GETHER EMERGENCY SOS EMAIL SIMULATOR]');
  console.log(`To:        ${toEmail} (@${partnerUsername})`);
  console.log(`From:      @${senderUsername}`);
  console.log(`Subject:   🚨 EMERGENCY SOS from @${senderUsername}`);
  console.log(`Message:   ${customMessage || 'Midnight cutoff approaching!'}`);
  console.log('='.repeat(60) + '\n');

  return { success: true, delivered: false, simulated: true };
}

module.exports = {
  sendTemporaryPasswordEmail,
  sendEmergencySOSEmail,
  createTransporter,
};
