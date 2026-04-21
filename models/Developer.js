const mongoose = require("mongoose");

const developerSchema = new mongoose.Schema(
  {
    developerName: { type: String, required: true },
    developerLogo: { type: String, required: true },
    shortDescription: { type: String, required: true },
    highlights: [String],
    slug: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    establishedYear: Number,
    totalProjects: Number,
    website: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Developer", developerSchema);
