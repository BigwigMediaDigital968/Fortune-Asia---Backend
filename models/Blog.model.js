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

const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  excerpt: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },

  // ✅ NEW FAQs FIELD
  faqs: {
    type: [faqSchema],
    default: [],
  },

  author: {
    type: String,
    required: true,
  },
  coverImageAlt: {
    type: String,
  },
  coverImage: {
    type: String,
    required: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  slugHistory: {
    type: [String],
    default: [],
  },
  datePublished: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

const BlogPost = mongoose.model("BlogPost", blogPostSchema);

module.exports = BlogPost;
