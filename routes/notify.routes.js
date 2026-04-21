const express = require("express");
const router = express.Router();

const {
  sendOtpNotify,
  verifyOtpNotify,
  getNotifyLeads,
  getNotifyLeadById,
  deleteNotifyLead,
  verifyNotifyLeadManually,
} = require("../controller/Notify.controller");

// Client
router.post("/send-otp", sendOtpNotify);
router.post("/verify-otp", verifyOtpNotify);

// Admin
router.get("/leads", getNotifyLeads);
router.get("/leads/:id", getNotifyLeadById);
router.delete("/leads/:id", deleteNotifyLead);
router.patch("/leads/:id/verify", verifyNotifyLeadManually);

module.exports = router;
