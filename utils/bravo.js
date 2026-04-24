const { BrevoClient } = require("@getbrevo/brevo");
require("dotenv").config();
// create instance once (singleton)
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});
//console.log(process.env.BREVO_API_KEY); // 👈 MUST print value
/**
 * Reusable email sender
 */
const sendEmail = async ({
  to,
  subject,
  htmlContent,
  sender,
  templateId,
  params,
}) => {
  try {
    const emailData = {
      sender: sender || {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || "FAR",
      },
      to,
    };

    if (templateId) {
      emailData.templateId = templateId;
      emailData.params = params || {};
    } else {
      emailData.subject = subject;
      emailData.htmlContent = htmlContent;
    }

    const response =
      await brevo.transactionalEmails.sendTransacEmail(emailData);

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Brevo Error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  sendEmail,
};
