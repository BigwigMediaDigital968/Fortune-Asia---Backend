// models/Opportunity.js
const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String },
  type: { type: String }, // e.g., "Full-time", "Internship"
  postedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Opportunity", opportunitySchema);
