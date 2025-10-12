// backend/Utills/Email.js
const nodemailer = require("nodemailer");

let transporter;

function bool(v, def = false) {
  if (v == null) return def;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

async function buildTransporter() {
  const useEthereal = bool(process.env.USE_ETHEREAL, false);

  if (!useEthereal) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = bool(process.env.SMTP_SECURE, port === 465);
    const user = process.env.SMTP_USER;
    const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
    if (!host || !user || !pass) {
      throw new Error(
        "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env"
      );
    }
    const t = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { ciphers: "TLSv1.2" },
    });
    try {
      await t.verify();
      console.log(`[Email] SMTP ready: ${host}:${port} secure=${secure}`);
    } catch (e) {
      console.error("[Email] SMTP verify failed:", e.message);
    }
    return t;
  }

  const testAcc = await nodemailer.createTestAccount();
  console.log("[Email] Using Ethereal:", testAcc.user);
  return nodemailer.createTransport({
    host: testAcc.smtp.host,
    port: testAcc.smtp.port,
    secure: testAcc.smtp.secure,
    auth: { user: testAcc.user, pass: testAcc.pass },
  });
}

async function getTransporter() {
  if (!transporter) transporter = await buildTransporter();
  return transporter;
}

function fromAddress() {
  return (
    process.env.SMTP_FROM ||
    `"${process.env.EMAIL_FROM_NAME || "GemZyne"}" <${
      process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER
    }>`
  );
}

async function sendEmail({ to, subject, text, html, headers, replyTo }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html: html || (text ? `<p>${text}</p>` : undefined),
    headers,
    replyTo: replyTo || process.env.REPLY_TO || undefined,
  });
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log("[Email] Ethereal preview:", preview);
  else console.log("[Email] Sent via SMTP. MessageId:", info.messageId);
  return info;
}

/* ------------------------- PREMIUM TEMPLATES ------------------------- */

const BRAND = {
  name: "GemZyne",
  gold: "#d4af37",
  goldLight: "#f9f295",
  goldDark: "#b38728",
  bg: "#0a0a0a",
  bgLight: "#1a1a1a",
  text: "#f5f5f5",
  textSecondary: "#b0b0b0",
  textMuted: "#888888",
  border: "rgba(212, 175, 55, 0.3)",
  borderLight: "rgba(212, 175, 55, 0.1)",
};

function baseTemplate({ title, lead, code, button, footerNote, preheader }) {
  const htmlSafeCode = code ? String(code).replace(/[^\dA-Za-z]/g, "") : "";

  const codeBlock = code
    ? `<div class="code" style="
        margin: 24px 0 18px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        font-size: 30px; font-weight: 800; letter-spacing: 8px; text-align: center;
        color: ${BRAND.gold}; background: rgba(212,175,55,.08);
        border: 2px solid ${BRAND.border}; border-radius: 12px;
        padding: 16px;">
        ${htmlSafeCode}
      </div>`
    : "";

  const buttonBlock = button
    ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 18px auto 0;">
      <tr>
        <td align="center" bgcolor="${BRAND.gold}" style="
          border-radius: 40px;
          background: linear-gradient(135deg, ${BRAND.gold} 0%, ${BRAND.goldDark} 100%);
        ">
          <a href="${button.href}" style="
            display:inline-block; padding:14px 28px; font-family: Arial, Helvetica, sans-serif;
            font-size:16px; font-weight:700; text-decoration:none; color:#0a0a0a;">
            ${button.label}
          </a>
        </td>
      </tr>
    </table>`
    : "";

  const foot =
    footerNote || "Didn't request this? You can safely ignore this email.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} – ${BRAND.name}</title>
  <style>
    /* mobile type scale */
    @media only screen and (max-width: 600px) {
      .wrap { width: 100% !important; }
      .pad  { padding: 28px 18px !important; }
      .h1   { font-size: 24px !important; }
      .lead { font-size: 15px !important; }
      .code { font-size: 28px !important; letter-spacing: 7px !important; padding: 14px !important; }
    }
    /* dark mode */
    @media (prefers-color-scheme: dark) {
      .bg     { background: #0a0a0a !important; }
      .panel  { background: #1a1a1a !important; border-color: #2a2a2a !important; }
      .text   { color: #f5f5f5 !important; }
      .muted  { color: #b0b0b0 !important; }
      .code   { background:#1b1b1b !important; color:#f9f295 !important; }
      .hr     { border-color:#2a2a2a !important; }
    }
    /* fix iOS auto-link colors */
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body class="bg" style="margin:0; padding:0; background:${BRAND.bg};">

  <!-- hidden preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    ${preheader || ""}
  </div>

  <!-- FULL-WIDTH OUTER TABLE -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${
    BRAND.bg
  };">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <!-- FIXED-CENTER WRAP (bulletproof centering) -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
               class="wrap" style="width:600px; max-width:600px; margin:0 auto;">
          <!-- BRAND BAR -->
          <tr>
            <td align="center" style="
              padding:18px 24px;
              background: linear-gradient(135deg, ${BRAND.gold} 0%, ${
    BRAND.goldDark
  } 100%);
              border-radius:14px 14px 0 0;">
              <div style="font-family:Arial,Helvetica,sans-serif; font-weight:800; font-size:22px; color:#0a0a0a; letter-spacing:.5px;">
                ${BRAND.name}
              </div>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:rgba(0,0,0,.75); margin-top:4px;">
                Rare Gems, Timeless Beauty
              </div>
            </td>
          </tr>

          <!-- PANEL -->
          <tr>
            <td class="panel pad" style="
              background:${BRAND.bgLight};
              border:1px solid ${BRAND.borderLight};
              border-top:none;
              padding:34px 26px;
              border-radius:0 0 14px 14px;
            ">
              <h1 class="h1 text" style="margin:0 0 10px; font-family:Arial,Helvetica,sans-serif; font-size:26px; line-height:1.25; color:${
                BRAND.text
              }; text-align:center;">
                ${title}
              </h1>

              ${
                lead
                  ? `<p class="lead muted" style="margin:0 0 18px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:${BRAND.textSecondary}; text-align:center;">${lead}</p>`
                  : ""
              }

              ${codeBlock}

              ${buttonBlock}

              <hr class="hr" style="border:none; border-top:1px solid ${
                BRAND.borderLight
              }; margin:24px 0 16px;">

              <p class="muted" style="margin:0 0 10px; font-family:Arial,Helvetica,sans-serif; font-size:13px; line-height:1.5; color:${
                BRAND.textSecondary
              }; text-align:center;">
                ${foot}
              </p>
              <p class="muted" style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:13px; line-height:1.5; color:${
                BRAND.textSecondary
              }; text-align:center;">
                Need assistance? Reply to this email and our team will help.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding:16px 8px;">
              <p style="margin:0 0 6px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:${
                BRAND.gold
              };">
                <a href="#" style="color:${
                  BRAND.gold
                }; text-decoration:none;">Website</a> &nbsp;•&nbsp;
                <a href="#" style="color:${
                  BRAND.gold
                }; text-decoration:none;">Privacy</a> &nbsp;•&nbsp;
                <a href="#" style="color:${
                  BRAND.gold
                }; text-decoration:none;">Terms</a>
              </p>
              <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#888;">
                © ${new Date().getFullYear()} ${
    BRAND.name
  }. All rights reserved.<br>Rathnapura, Sri Lanka
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText({ title, lead, code, button, footerNote }) {
  const lines = [
    `✨ ${BRAND.name} ✨`,
    "=".repeat(40),
    title,
    "",
    lead || "",
    "",
    ...(code ? [`VERIFICATION CODE: ${code}`, ""] : []),
    ...(button
      ? [`ACTION REQUIRED: ${button.label}`, `LINK: ${button.href}`, ""]
      : []),
    footerNote || "If this wasn't you, please ignore this email.",
    "",
    "Need help? Reply to this email.",
    "",
    `© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.`,
    "Rathnapura, Sri Lanka",
  ];

  return lines.filter(Boolean).join("\n");
}

/* ------------------------- PREMIUM EMAIL TEMPLATES ------------------------- */

function otpEmailPieces(purpose, code, minutes = 10) {
  const templates = {
    verify_email: {
      title: "Verify Your GemZyne Account",
      lead: `Welcome to GemZyne! Use the verification code below to complete your account setup. This code will expire in ${minutes} minutes.`,
      subject: "Verify Your GemZyne Account",
    },
    reset_password: {
      title: "Reset Your Password",
      lead: `You've requested to reset your GemZyne password. Use the code below to proceed with creating a new password. This code expires in ${minutes} minutes.`,
      subject: "Reset Your GemZyne Password",
    },
    change_email: {
      title: "Confirm Your New Email",
      lead: `You've requested to change your email address associated with GemZyne. Use the verification code below to confirm this change. This code expires in ${minutes} minutes.`,
      subject: "Confirm Your Email Change",
    },
    welcome: {
      title: "Welcome to GemZyne!",
      lead: `Thank you for joining the GemZyne family! Your account has been successfully verified. Start exploring our exquisite collection of premium gemstones.`,
      subject: "Welcome to GemZyne - Your Account is Ready!",
    },
  };

  const template = templates[purpose] || {
    title: "Your Verification Code",
    lead: `Use the verification code below to complete your request. This code expires in ${minutes} minutes.`,
    subject: "Your Verification Code",
  };

  const html = baseTemplate({
    title: template.title,
    lead: template.lead,
    code,
    preheader: `${template.subject}. Code: ${code}. Valid for ${minutes} minutes.`,
  });

  const text = buildText({
    title: template.title,
    lead: template.lead,
    code,
  });

  return { subject: template.subject, html, text };
}

/* ------------------------- PREMIUM EMAIL FUNCTIONS ------------------------- */

async function sendVerifyEmail(to, code, { expiresInMinutes = 10 } = {}) {
  const { subject, html, text } = otpEmailPieces(
    "verify_email",
    code,
    expiresInMinutes
  );
  return sendEmail({
    to,
    subject,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `verify-${Date.now()}`,
      "X-Priority": "1",
      Importance: "high",
    },
  });
}

async function sendPasswordResetEmail(
  to,
  code,
  { expiresInMinutes = 10 } = {}
) {
  const { subject, html, text } = otpEmailPieces(
    "reset_password",
    code,
    expiresInMinutes
  );
  return sendEmail({
    to,
    subject,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `reset-${Date.now()}`,
      "X-Priority": "1",
      Importance: "high",
    },
  });
}

async function sendChangeEmailCodeEmail(
  to,
  code,
  { expiresInMinutes = 10 } = {}
) {
  const { subject, html, text } = otpEmailPieces(
    "change_email",
    code,
    expiresInMinutes
  );
  return sendEmail({
    to,
    subject,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `change-email-${Date.now()}`,
    },
  });
}

async function sendWelcomeEmail(to, name = "there") {
  const subject = "Welcome to GemZyne - Your Premium Gemstone Destination";
  const html = baseTemplate({
    title: "Welcome to GemZyne!",
    lead: `Dear ${name}, thank you for joining the GemZyne family. Your account has been successfully verified and you're now part of our exclusive community of gemstone enthusiasts.`,
    button: {
      label: "Explore Premium Gems",
      href: `${process.env.FRONTEND_URL || "https://gemzyne.com"}/inventory`,
    },
    footerNote:
      "Start your journey into the world of exquisite gemstones today.",
    preheader:
      "Welcome to GemZyne! Your account is ready. Start exploring our premium gem collection.",
  });

  const text = buildText({
    title: "Welcome to GemZyne!",
    lead: `Dear ${name}, thank you for joining GemZyne. Your account is ready. Start exploring our premium gemstone collection.`,
    button: {
      label: "Explore Premium Gems",
      href: `${process.env.FRONTEND_URL || "https://gemzyne.com"}/inventory`,
    },
  });

  return sendEmail({
    to,
    subject,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `welcome-${Date.now()}`,
    },
  });
}

// Enhanced default export with all premium email functions
module.exports = Object.assign(sendEmail, {
  sendVerifyEmail,
  sendPasswordResetEmail,
  sendChangeEmailCodeEmail,
  sendWelcomeEmail,
  baseTemplate, // Export for custom templates
  buildText, // Export for custom text templates
});
