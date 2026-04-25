const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
});


const developerSchema = new mongoose.Schema(
  {
    // 🏢 Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },

    logo: {
      type: String,
      required: true,
      trim: true,
    },

    coverImage: {
      type: String,
      trim: true,
      default: null,
    },

    // 📝 Content
    shortDescription: {
      type: String,
      required: true,
      maxlength: 300,
      trim: true,
    },

    fullDescription: {
      type: String, // rich text (Jodit)
      default: null,
    },

    // 📊 Stats
    stats: {
      establishedYear: {
        type: Number,
        default: null,
      },
      totalProjects: {
        type: Number,
        default: 0,
      },
    },

    // 🏆 Highlights / USP
    highlights: {
      type: [String],
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },

    // 🏗️ Related Properties / Projects
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PropertyListing", // ✅ fixed
        default: []
      },
    ],

    // 📜 Certifications
    certifications: {
      type: [String],
      default: [],
    },

    // 🌐 Links
    website: {
      type: String,
      trim: true,
      default: null,
    },

    socialLinks: {
      facebook: {
        type: String,
        default: null,
      },
      instagram: {
        type: String,
        default: null,
      },
      linkedin: {
        type: String,
        default: null,
      },
      twitter: {
        type: String,
        default: null,
      },
    },

    // 🖼️ Gallery (images only)
    images: {
      type: [String], // ✅ simple array of URLs
      default: [],
    },

    brochure: {
      type: String,
      default: null,
    },

    // 🔍 SEO
    seo: {
      metaTitle: {
        type: String,
        default: ""
      },
      metaDescription: {
        type: String,
        default: ""
      },
      keywords: {
        type: [String],
        default: []
      }
    },

    // FAQs FIELD
  faqs: {
    type: [faqSchema],
    default: [],
  },

    // ⭐ Optional controls
    isFeatured: {
      type: Boolean,
      default: false,
    },

    priority: {
      type: Number,
      default: 0,
    },

    // 🟢 Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Developer", developerSchema);