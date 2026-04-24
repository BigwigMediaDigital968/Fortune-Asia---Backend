const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const listingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    bedrooms: { type: String, default: null },
    size: { type: String, required: true },
    message: { type: String, default: null },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    source: {
      type: String,
      trim: true,
      default: "website",
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
  },
  { timestamps: true },
);

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
