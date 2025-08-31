const nodemailer = require("nodemailer");

let transporterPromise;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;
  const forceEthereal =
    String(process.env.USE_ETHEREAL || "").toLowerCase() === "true";

  if (!forceEthereal && process.env.SMTP_HOST) {
    console.log("SMTP_HOST =", process.env.SMTP_HOST);
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    );
  } else {
    console.log("SMTP_HOST = (Ethereal fallback)");
    const testAccount = await nodemailer.createTestAccount(); // Ethereal (free, preview link)
    console.log("Ethereal user:", testAccount.user);
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      })
    );
  }
  return transporterPromise;
}

async function sendEmail({ to, subject, text, html }) {
  console.log("[MAIL] sendEmail called with:", { to, subject });
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "GemZyne"}" <${
      process.env.EMAIL_FROM_ADDRESS || "no-reply@gemzyne.local"
    }>`,
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`,
  });
  console.log("MessageId:", info.messageId);
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log("Ethereal preview URL:", preview);
  } else {
    console.log("No Ethereal preview (using real SMTP).");
  }
  return info;
}

module.exports = sendEmail;
