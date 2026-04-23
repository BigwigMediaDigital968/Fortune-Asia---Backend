const mongoose = require("mongoose");
const { Schema } = mongoose;

const leadSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    purpose: {
      type: String,
      enum: ["buy", "sell", "rent", "lease", "investment", "general"],
      default: "general",
    },

    message: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    source: {
      type: String,
      trim: true,
      default: "website",
    },

    // Assignment
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    // Lead Status
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "qualified",
        "assigned",
        "negotiation",
        "closed",
        "lost",
      ],
      default: "new",
    },

    notes: {
      type: {
        text: { type: String, trim: true },
        addedBy: {
          type: Schema.Types.ObjectId,
          ref: "Employee",
          default: null,
        },
        createdAt: { type: Date, default: Date.now },
      },
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;
