const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const router = express.Router();

const XML_URL = "https://connecteo.in/mondus-property-listing/website-xml.php";

const { propertyUpload } = require("../middleware/upload");

const {
  addProperty,
  getProperties,
  getSingleProperty,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
} = require("../controller/propertyController");

/**
 * ============================================
 * PROPERTY ROUTES
 * ============================================
 */

// CREATE (with images and brochure)
router.post(
  "/",
  propertyUpload.fields([
    { name: "propertyImages", maxCount: 20 },
    { name: "propertyBrochure", maxCount: 1 },
  ]),
  addProperty,
);

// UPDATE (with optional images and brochure)
router.put(
  "/:id",
  propertyUpload.fields([
    { name: "propertyImages", maxCount: 10 },
    { name: "propertyBrochure", maxCount: 1 },
  ]),
  updateProperty,
);

// READ
router.get("/", getProperties);
router.get("/:idOrSlug", getSingleProperty);

// UPDATE STATUS
router.patch("/:id/status", updatePropertyStatus);

// DELETE
router.delete("/:id", deleteProperty);

/**
 * ============================================
 * ERROR HANDLING
 * ============================================
 */
router.use((err, req, res, next) => {
  const errorContext = "PROPERTY_ROUTE_ERROR";

  // Log the error properly
  if (err?.message) {
    console.error(`[ERROR] [${errorContext}]`, err.message);
  }
  if (err?.stack) {
    console.error(`[ERROR] [${errorContext}] Stack:`, err.stack);
  }

  // Handle Multer errors
  if (err?.name === "MulterError") {
    console.error(`[ERROR] [${errorContext}] MulterError:`, err.message);
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      code: err.code,
    });
  }

  // Handle file validation errors
  if (err?.message?.includes("File") || err?.message?.includes("file")) {
    console.error(`[ERROR] [${errorContext}] File error:`, err.message);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Handle Cloudinary errors
  if (err?.message?.includes("Cloudinary")) {
    console.error(`[ERROR] [${errorContext}] Cloudinary error:`, err.message);
    return res.status(500).json({
      success: false,
      message: "Error uploading files to cloud storage",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  // Generic error
  console.error(`[ERROR] [${errorContext}] Unhandled error:`, {
    message: err?.message,
    code: err?.code,
    statusCode: err?.statusCode,
  });

  next(err);
});
/**
 * 
// Utility function to fetch and parse data
async function getProperties() {
  const response = await axios.get(XML_URL);
  const xml = response.data;

  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) return reject(err);
      resolve(result.list.property || []);
    });
  });
}

// Route: All properties
router.get("/", async (req, res) => {
  try {
    const properties = await getProperties();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// Route: Rent properties
router.get("/rent", async (req, res) => {
  try {
    const properties = await getProperties();
    const rentData = properties.filter(
      (item) =>
        item?.properties.property_purpose.key_0 === "Rent" ||
        item?.name?.toLowerCase().includes("Rent"),
    );
    res.json(rentData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rent properties" });
  }
});

// Route: Sale properties
router.get("/sale", async (req, res) => {
  try {
    const properties = await getProperties();
    const saleData = properties.filter(
      (item) =>
        item?.properties.property_purpose.key_0 === "Sale" ||
        item?.name?.toLowerCase().includes("Sale"),
    );
    res.json(saleData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sale properties" });
  }
});
 */

module.exports = router;
