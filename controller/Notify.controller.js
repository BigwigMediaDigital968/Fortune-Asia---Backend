const Notify = require("../models/notify");
const sendEmail = require("../utils/sendEmail");

/* --------------------------------------------------
   CREATE LEAD + SEND OTP
   POST /api/notify/send-otp
---------------------------------------------------*/

exports.sendOtpNotify = async (req, res) => {
  try {
    const { name, email, phone, purpose, category, bedrooms } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    let lead = await Notify.findOne({ email, phone });

    if (!lead) {
      lead = await Notify.create({
        name,
        email,
        phone,
        purpose,
        category,
        bedrooms,
        otp,
        otpExpires,
      });
    } else {
      lead.otp = otp;
      lead.otpExpires = otpExpires;
      await lead.save();
    }

    await sendEmail({
      to: email,
      subject: "Your OTP Verification Code",
      html: `
        <p>Hello ${name},</p>
        <p>Your OTP is <b>${otp}</b></p>
        <p>This code expires in 5 minutes.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

/* --------------------------------------------------
   VERIFY OTP
   POST /api/notify/verify-otp
---------------------------------------------------*/
exports.verifyOtpNotify = async (req, res) => {
  try {
    const { email, phone, otp } = req.body;

    const lead = await Notify.findOne({ email, phone });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    if (lead.otp !== otp || lead.otpExpires < new Date()) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    lead.isVerified = true;
    lead.otp = undefined;
    lead.otpExpires = undefined;

    await lead.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ error: "OTP verification failed" });
  }
};

/* --------------------------------------------------
   GET ALL LEADS (ADMIN)
   GET /api/leads/notify
---------------------------------------------------*/
exports.getNotifyLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { verified, search } = req.query;

    const query = {};

    if (verified !== undefined) {
      query.isVerified = verified === "true";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const [leads, total] = await Promise.all([
      Notify.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notify.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch Leads Error:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
};

/* --------------------------------------------------
   GET SINGLE LEAD
   GET /api/leads/notify/:id
---------------------------------------------------*/
exports.getNotifyLeadById = async (req, res) => {
  try {
    const lead = await Notify.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lead" });
  }
};

/* --------------------------------------------------
   DELETE LEAD
   DELETE /api/leads/notify/:id
---------------------------------------------------*/
exports.deleteNotifyLead = async (req, res) => {
  try {
    const lead = await Notify.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete lead" });
  }
};

/* --------------------------------------------------
   MANUAL VERIFY LEAD (ADMIN)
   PATCH /api/notify/leads/:id/verify
---------------------------------------------------*/
exports.verifyNotifyLeadManually = async (req, res) => {
  try {
    const lead = await Notify.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    lead.isVerified = true;
    lead.otp = undefined;
    lead.otpExpires = undefined;

    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead verified successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Manual Verify Error:", error);
    res.status(500).json({ error: "Failed to verify lead" });
  }
};
