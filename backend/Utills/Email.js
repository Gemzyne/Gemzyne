// backend/Utills/Email.js
const nodemailer = require("nodemailer");

let transporter; // singleton

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
    const secure = bool(process.env.SMTP_SECURE, port === 465); // Gmail: false for 587 (STARTTLS)
    const user = process.env.SMTP_USER;
    // App password sometimes pasted with spaces; strip them
    const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

    if (!host || !user || !pass) {
      throw new Error("SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env");
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

  // ---- Ethereal fallback ----
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
  // Prefer SMTP_FROM; else fall back to EMAIL_FROM_* or SMTP_USER
  return (
    process.env.SMTP_FROM ||
    `"${process.env.EMAIL_FROM_NAME || "GemZyne"}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`
  );
}

async function sendEmail({ to, subject, text, html }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html: html || (text ? `<p>${text}</p>` : undefined),
  });
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log("[Email] Ethereal preview:", preview);
  else console.log("[Email] Sent via real SMTP. MessageId:", info.messageId);
  return info;
}

// ---- Optional OTP helper (use if you want a nicer email) ----
function otpTemplate(code, minutes = 10) {
  const c = String(code).replace(/[^\dA-Za-z]/g, "");
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px">
      <h2 style="margin:0 0 12px;color:#111">Your GemZyne verification code</h2>
      <p>Use this one-time code to continue:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;background:#f6f6f6;padding:12px;border-radius:8px;text-align:center">${c}</div>
      <p style="margin-top:12px;color:#444">This code expires in <strong>${minutes} minutes</strong>.</p>
    </div>`;
  const text = `Your GemZyne code is ${c}. It expires in ${minutes} minutes.`;
  return { html, text };
}

async function sendOtpEmail(to, code, { expiresInMinutes = 10 } = {}) {
  const { html, text } = otpTemplate(code, expiresInMinutes);
  return sendEmail({ to, subject: "Your GemZyne verification code", html, text });
}

// Export default function for backward compatibility,
// and also expose sendOtpEmail if you want it.
module.exports = Object.assign(sendEmail, { sendOtpEmail });
