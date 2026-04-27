const mongoose = require("mongoose");

const { Schema } = mongoose;

const propertyListingSchema = new mongoose.Schema(
  {
    propertyName: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },

    listingType: {
      type: String,
      enum: ["buy", "rent"],
      required: true,
    },

    propertyType: { type: String, required: true },

    price: {
      type: String,
      required: true,
    },

    bedroom: { type: Number, required: true },
    bathroom: { type: Number, required: true },
    sizeSqft: { type: String, required: true },

    address: { type: String, required: true },
    subArea: { type: String },

    googleMapUrl: {
      type: String,
      default: null,
    },

    developer: {
      type: Schema.Types.ObjectId,
      ref: "Developer",
      default: null,
    },

    propertyImages: [
      {
        type: String,
        required: true,
      },
    ],

    propertyBrochure: {
      type: String,
      default: null,
    },

    videoLink: {
      type: String,
      default: null,
    },

    propertyDetails: { type: String, required: true },

    highlights: {
      type: [String],
      default: [],
    },

    featuresAmenities: {
      type: [String],
      default: [],
    },

    nearby: {
      type: [String],
      default: [],
    },

    extraHighlights: {
      type: [String],
      default: [],
    },

    status: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PropertyListing", propertyListingSchema);
