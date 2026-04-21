const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    bedrooms: { type: String, required: true },
    size: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
