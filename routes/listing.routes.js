const express = require("express");
const Listing = require("../models/listing.model");
const router = express.Router();
const sendEmail = require("../utils/sendEmail");

/**
 * POST /api/listings
 * Submit a new property listing
 */
router.post("/", async (req, res) => {
  const { name, email, phone, address, bedrooms, size, message } = req.body;

  if (!name || !email || !phone || !address || !bedrooms || !size || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const newListing = new Listing({
      name,
      email,
      phone,
      address,
      bedrooms,
      size,
      message,
    });

    await newListing.save();

    // ✅ Send confirmation email
    await sendEmail({
      to: email,
      subject: "Property Listing Received – Mondus",
      text: `Hi ${name},\n\nThank you for listing your property with Mondus.\nOur team will contact you shortly regarding your listing at ${address}.\n\nRegards,\nMondus Team`,
      html: `
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for listing your property with <strong>Mondus</strong>.</p>
        <p>We’ve received the following details:</p>
        <ul>
          <li><strong>Phone:</strong> ${phone}</li>
          <li><strong>Address:</strong> ${address}</li>
          <li><strong>Bedrooms:</strong> ${bedrooms}</li>
          <li><strong>Size:</strong> ${size}</li>
          
        </ul>
        <p>Our team will contact you shortly to assist further.</p>
        <br/>
        <p>Regards,<br/><strong>Mondus Team</strong></p>
      `,
    });

    res.status(201).json({ message: "Listing submitted and email sent." });
  } catch (error) {
    console.error("❌ Error saving listing or sending email:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET /api/listings
 * Fetch all property listings (for admin/dashboard)
 */
router.get("/", async (req, res) => {
  try {
    const listings = await Listing.find().sort({ createdAt: -1 });
    res.status(200).json(listings);
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
