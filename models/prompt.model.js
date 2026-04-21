const mongoose = require("mongoose");

const promptSchema = new mongoose.Schema(
  {
    name: { type: String },
    phone: { type: String },
    email: { type: String, required: true, unique: true },
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prompt", promptSchema);
