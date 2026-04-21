// const express = require("express");
// const router = express.Router();
// const Prompt = require("../models/prompt.model");
// const Notify = require("../models/notify");
// const sendEmail = require("../utils/sendEmail");

// const OpenAI = require("openai");
// require("dotenv").config();

// const openai = new OpenAI(process.env.OPENAI_API_KEY);

// const companyInfo = `
// **About Mondus Properties**
// Mondus Properties is a forward-thinking real estate agency and investment advisory firm based in Dubai, UAE. As a trusted name in the region, we specialize in helping clients navigate the dynamic Dubai property market with confidence. Our curated portfolio includes some of the most sought-after properties in the city, offering premium options for buying, renting, or investing.

// Whether you're a first-time homebuyer, seasoned investor, or searching for your dream residence, our dedicated team ensures a seamless, personalized journey to find the perfect property. At Mondus Properties, we combine global expertise with local insights to make your real estate experience effortless and rewarding.

// **Why Choose Us**
// - Unmatched access to Dubai’s most desirable locations and properties
// - Transparent, ethical, and client-first advisory at every step
// - Expertise in luxury, investment-grade, and off-plan real estate
// - End-to-end support – from discovery to deal closure and beyond

// **Our Services**
// 1. **Luxury Property Sales**: Premium homes and apartments in Dubai's prime locations.
// 2. **Real Estate Investment Advisory**: Tailored strategies for high-yield and long-term gains.
// 3. **Rental Services**: Finding the perfect short- or long-term rental property.
// 4. **Property Management**: Complete oversight and care for your investment.
// 5. **Off-Plan Advisory**: Expert guidance on upcoming projects with strong potential.

// **Our Vision**
// To empower clients in making smart, strategic real estate decisions by delivering excellence, integrity, and value – and turning dream properties into real assets.

// **Target Clients**
// - Local & international homebuyers
// - High-net-worth individuals
// - Long-term investors
// - Corporate & institutional clients
// `;

// // POST /api/prompt/submit
// router.post("/prompt", async (req, res) => {
//   const { name, phone, email } = req.body;

//   if (!name || !phone || !email) {
//     return res.status(400).json({ error: "All fields are required." });
//   }

//   try {
//     const newPrompt = new Prompt({ name, phone, email });
//     await newPrompt.save();
//     return res.status(200).json({ message: "Form submitted and saved." });
//   } catch (error) {
//     console.error("Error saving prompt:", error);
//     return res.status(500).json({ error: "Failed to save form." });
//   }
// });

// // STEP 1: Send OTP
// router.post("/send-otp", async (req, res) => {
//   const { email } = req.body;

//   if (!email) return res.status(400).json({ error: "Email is required." });

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//   try {
//     await Prompt.findOneAndUpdate(
//       { email },
//       { otp, otpExpires, isVerified: false },
//       { upsert: true, new: true }
//     );

//     await sendEmail({
//       to: email,
//       subject: "Your OTP Code",
//       text: `Your OTP is ${otp}`,
//       html: `<p>Your OTP is <b>${otp}</b>. It will expire in 10 minutes.</p>`,
//     });

//     return res.status(200).json({ message: "OTP sent successfully." });
//   } catch (error) {
//     console.error("Error sending OTP:", error);
//     return res.status(500).json({ error: "Failed to send OTP." });
//   }
// });

// // STEP 2: Verify OTP and Submit Form
// router.post("/verify-otp", async (req, res) => {
//   const { name, phone, email, otp } = req.body;

//   if (!name || !phone || !email || !otp)
//     return res.status(400).json({ error: "All fields are required." });

//   try {
//     const prompt = await Prompt.findOne({ email });

//     if (!prompt || prompt.otp !== otp || prompt.otpExpires < new Date()) {
//       return res.status(400).json({ error: "Invalid or expired OTP." });
//     }

//     prompt.name = name;
//     prompt.phone = phone;
//     prompt.isVerified = true;
//     prompt.otp = null;
//     prompt.otpExpires = null;
//     await prompt.save();

//     await sendEmail({
//       to: email,
//       subject: "📬 Thank You for Submitting Your Details",
//       text: "We've received your information and will get back to you shortly.",
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
//           <h2>✅ Details Received</h2>
//           <p>Hi ${name},</p>
//           <p>Thank you for submitting your details. We've received your information successfully.</p>
//           <p>Our team will review your query and get in touch with you shortly.</p>
//           <hr style="margin: 20px 0;" />
//           <p style="font-size: 14px; color: #888;">If you didn't fill out a form recently, you can safely ignore this email.</p>
//           <p>Best regards,<br>The Team</p>
//         </div>
//       `,
//     });

//     return res
//       .status(200)
//       .json({ message: "OTP verified and form submitted." });
//   } catch (error) {
//     console.error("Error verifying OTP:", error);
//     return res.status(500).json({ error: "OTP verification failed." });
//   }
// });

// router.get("/consultation", async (req, res) => {
//   try {
//     const consultations = await Prompt.find().sort({ createdAt: -1 });
//     res.status(200).json(consultations);
//   } catch (error) {
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // notify me

// router.post("/send-otp/notify", async (req, res) => {
//   const { email } = req.body;

//   if (!email) return res.status(400).json({ error: "Email is required." });

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//   try {
//     await Notify.findOneAndUpdate(
//       { email },
//       { otp, otpExpires, isVerified: false },
//       { upsert: true, new: true }
//     );

//     await sendEmail({
//       to: email,
//       subject: "Your OTP Code",
//       text: `Your OTP is ${otp}`,
//       html: `<p>Your OTP is <b>${otp}</b>. It will expire in 10 minutes.</p>`,
//     });

//     return res.status(200).json({ message: "OTP sent successfully." });
//   } catch (error) {
//     console.error("Error sending OTP:", error);
//     return res.status(500).json({ error: "Failed to send OTP." });
//   }
// });

// router.post("/verifyOtp/notifyme", async (req, res) => {
//   const { purpose, category, bedrooms, name, phone, email, otp } = req.body;

//   if (!name || !phone || !email || !otp) {
//     return res.status(400).json({ error: "All fields are required." });
//   }

//   try {
//     const notify = await Notify.findOne({ email });

//     if (!notify || notify.otp !== otp || notify.otpExpires < new Date()) {
//       return res.status(400).json({ error: "Invalid or expired OTP." });
//     }
//     notify.purpose = purpose;
//     notify.category = category;
//     notify.bedrooms = bedrooms;
//     notify.name = name;
//     notify.phone = phone;
//     notify.isVerified = true;
//     notify.otp = null;
//     notify.otpExpires = null;
//     await notify.save();

//     await sendEmail({
//       to: email,
//       subject: "📬 Thank You for Submitting Your Details",
//       text: "We've received your information and will get back to you shortly.",
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
//           <h2>✅ Details Received</h2>
//           <p>Hi ${name},</p>
//           <p>Thank you for submitting your details. We've received your information successfully.</p>
//           <p>Our team will review your query and get in touch with you shortly.</p>
//           <hr style="margin: 20px 0;" />
//           <p style="font-size: 14px; color: #888;">If you didn't fill out a form recently, you can safely ignore this email.</p>
//           <p>Best regards,<br>The Team</p>
//         </div>
//       `,
//     });

//     return res
//       .status(200)
//       .json({ message: "OTP verified and form submitted." });
//   } catch (error) {
//     console.error("Error saving prompt:", error);
//     return res.status(500).json({ error: "Failed to save form." });
//   }
// });

// router.get("/notify", async (req, res) => {
//   try {
//     const consultations = await Notify.find().sort({ createdAt: -1 });
//     res.status(200).json(consultations);
//   } catch (error) {
//     res.status(500).json({ error: "Server error" });
//   }
// });

// const ChatbotModel = require("../models/chatbot.model");

// router.post("/chatbot", async (req, res) => {
//   const { message } = req.body;

//   if (!message) {
//     return res.status(400).json({ error: "Message is required" });
//   }

//   try {
//     const prompt = `
// You are a helpful chatbot for Granth Dream Homes, a luxury real estate company in Goa.
// Use the company details below to answer the user's question in a friendly and informative way.

// Company Info:
// ${companyInfo}

// User Question: ${message}
// `;

//     const response = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages: [
//         { role: "system", content: "You are a helpful real estate assistant." },
//         { role: "user", content: prompt },
//       ],
//       temperature: 0.7,
//     });

//     const reply =
//       response.choices[0].message.content.trim() ||
//       "Sorry, I couldn’t find an answer.";

//     // Save to DB
//     await ChatbotModel.create({
//       userMessage: message,
//       botReply: reply,
//     });

//     res.json({ reply });
//   } catch (error) {
//     console.error("Chatbot error:", error);
//     res.status(500).json({ error: "Something went wrong with the chatbot." });
//   }
// });

// router.get("/chatbot", async (req, res) => {
//   try {
//     const chats = await ChatbotModel.find().sort({ createdAt: -1 }); // latest first
//     res.json(chats);
//   } catch (error) {
//     console.error("Error fetching chat history:", error);
//     res.status(500).json({ error: "Failed to fetch chat history." });
//   }
// });

// module.exports = router;
