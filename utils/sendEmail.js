require("dotenv").config();

const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, text, html, attachments }) => {
  try {
    console.log("SMTP HOST:", process.env.BREVO_SMTP_HOST);
    console.log("SMTP PORT:", process.env.BREVO_SMTP_PORT);
    console.log("SMTP USER:", process.env.BREVO_SMTP_USER);
    console.log("SMTP PASS EXISTS:", !!process.env.BREVO_SMTP_PASS);

    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT),
      secure: false, // 587
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
      family: 4, // 🔥 FORCE IPv4 (fixes ::1 issue)
    });

    await transporter.verify(); // 🔥 fails fast if config is wrong

    await transporter.sendMail({
      from: `"${process.env.BREVO_FROM_NAME}" <${process.env.BREVO_FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
      attachments,
    });

    console.log("📧 Email sent to", to);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
};

module.exports = sendEmail;
