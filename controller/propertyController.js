const PropertyListing = require("../models/propertyListingmodel.js");
const fs = require("fs");
const path = require("path");
const {
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  logger,
} = require("../utils/cloudinary.js");

const controllerContext = "PROPERTY_CONTROLLER";

/* ================== HELPERS ================== */
const parseArray = (value) =>
  value ? value.split(",").map((i) => i.trim()) : [];

/**
 * Extract uploaded file paths from request
 */
const extractUploadedFiles = (req) => {
  const images = [];
  const brochure = null;

  // Handle multiple image uploads
  if (req.files?.propertyImages && Array.isArray(req.files.propertyImages)) {
    req.files.propertyImages.forEach((file) => {
      if (file.path || file.secure_url) {
        images.push(file.path || file.secure_url);
      }
    });
  }

  // Handle brochure upload
  let brochureFile = null;
  if (req.files?.propertyBrochure?.[0]) {
    brochureFile =
      req.files.propertyBrochure[0].path ||
      req.files.propertyBrochure[0].secure_url ||
      null;
  }

  logger.debug(controllerContext, "Extracted uploaded files", {
    imageCount: images.length,
    hasBrochure: !!brochureFile,
  });

  return { images, brochure: brochureFile };
};

/**
 * ================== ADD PROPERTY ==================
 */
exports.addProperty = async (req, res) => {
  const context = `${controllerContext}_ADD_PROPERTY`;

  try {
    logger.info(context, "Starting property creation");

    const { images, brochure } = extractUploadedFiles(req);

    if (images.length === 0) {
      logger.warn(context, "No property images provided");
      return res.status(400).json({
        success: false,
        message: "At least one property image is required",
      });
    }

    /* 🔥 REQUIRED FIELD VALIDATION */
    const requiredFields = [
      "propertyName",
      "slug",
      "propertyType",
      "address",
      "propertyDetails",
    ];

    const missingFields = requiredFields.filter(
      (field) => !req.body[field] || !req.body[field].toString().trim(),
    );

    if (missingFields.length > 0) {
      logger.warn(context, "Missing required fields", { missingFields });
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields,
      });
    }

    /* 🔥 AUTO-GENERATE SLUG IF NOT PROVIDED */
    let slug = req.body.slug?.trim();

    if (!slug) {
      slug = req.body.propertyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      logger.debug(context, "Auto-generated slug", { slug });
    }

    const baseSlug = slug;
    let counter = 1;

    // Ensure slug uniqueness
    while (await PropertyListing.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
      logger.debug(context, "Slug already exists, trying new slug", { slug });
    }

    /* 🔥 PREPARE PROPERTY DATA */
    const propertyData = {
      propertyName: req.body.propertyName?.trim(),
      developer: req.body.developer || null,
      listingType: req.body.listingType?.trim().toLowerCase(),
      propertyType: req.body.propertyType?.trim().toLowerCase(),
      address: req.body.address?.trim(),
      subArea: req.body.subArea?.trim(),
      slug: req.body.slug?.trim() || slug,
      developerName: req.body.developer || null,
      isFeatured: req.body.isFeatured || false,
      propertyDetails: req.body.propertyDetails?.trim(),

      /* NUMBERS */
      price: req.body.price || 0,
      bedroom: req.body.bedroom || null,
      bathroom: req.body.bathroom || null,
      sizeSqft: req.body.sizeSqft?.trim() || "",

      /* ARRAYS */
      highlights: parseArray(req.body.highlights),
      featuresAmenities: parseArray(req.body.featuresAmenities),
      nearby: parseArray(req.body.nearby),
      extraHighlights: parseArray(req.body.extraHighlights),

      /* MEDIA / LINKS */
      videoLink: req.body.videoLink?.trim() || null,
      googleMapUrl: req.body.googleMapUrl?.trim() || null,

      /* UPLOADS */
      propertyImages: images,
      propertyBrochure: brochure,
    };

    const property = await PropertyListing.create(propertyData);

    logger.info(context, "Property created successfully", {
      propertyId: property._id,
      imageCount: images.length,
      hasBrochure: !!brochure,
    });

    res.status(201).json({
      success: true,
      message: "Property added successfully",
      data: property,
    });
  } catch (error) {
    logger.error(context, "Error creating property", error);

    // Determine error status code based on error type
    let statusCode = 400;
    let message = error.message || "Error creating property";

    // Check for specific error types
    if (error.message?.includes("duplicate") || error.code === 11000) {
      statusCode = 409;
      message = "Property with this slug already exists";
    } else if (error.message?.includes("validation")) {
      statusCode = 422;
      message = "Validation error: " + error.message;
    } else if (error.message?.includes("CloudinaryError")) {
      statusCode = 500;
      message = "Error uploading files to Cloudinary";
    }

    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
        stack: error.stack,
      }),
    });
  }
};

/**
 * ================== GET ALL PROPERTIES (WITH FILTERS) ==================
 */
exports.getProperties = async (req, res) => {
  const context = `${controllerContext}_GET_PROPERTIES`;

  try {
    const {
      listingType,
      propertyType,
      bedroom,
      bathroom,
      subArea,
      minSqft,
      maxSqft,
      minPrice,
      maxPrice,
      status,
      developerName,
      isFeatured,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    if (listingType) filter.listingType = listingType;
    if (propertyType) filter.propertyType = propertyType;
    if (developerName) filter.developerName = developerName;
    if (bedroom) filter.bedroom = { $regex: `\\b${bedroom}\\b`, $options: "i" };;
    if (bathroom) filter.bathroom = { $regex: `\\b${bathroom}\\b`, $options: "i" };
    if (subArea) filter.subArea = subArea;
    if (status !== undefined) filter.status = status === "true";
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";

    /* PRICE FILTER */
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    /* SIZE FILTER */
    if (minSqft || maxSqft) {
      filter.sizeSqft = {};
      if (minSqft) filter.sizeSqft.$gte = Number(minSqft);
      if (maxSqft) filter.sizeSqft.$lte = Number(maxSqft);
    }

    logger.debug(context, "Fetching properties with filter", { filter });

    const [properties, total] = await Promise.all([
      PropertyListing.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("developer", "name logo"),

      PropertyListing.countDocuments(filter),
    ]);

    logger.info(context, "Properties fetched successfully", {
      count: properties.length,
    });

    res.status(200).json({
      success: true,
      count: properties.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: properties,
    });
  } catch (error) {
    logger.error(context, "Error fetching properties", error);

    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * ================== GET SINGLE PROPERTY (ID OR SLUG) ==================
 */
exports.getSingleProperty = async (req, res) => {
  const context = `${controllerContext}_GET_SINGLE_PROPERTY`;

  try {
    const { idOrSlug } = req.params;

    logger.debug(context, "Fetching property", { idOrSlug });

    let property;

    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      // Valid Mongo ObjectId
      property = await PropertyListing.findById(idOrSlug).populate("developer");
    } else {
      // Slug
      property = await PropertyListing.findOne({ slug: idOrSlug }).populate(
        "developer",
      );
    }

    if (!property) {
      logger.warn(context, "Property not found", { idOrSlug });
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    logger.info(context, "Property fetched successfully", {
      propertyId: property._id,
    });

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    logger.error(context, "Error fetching property", error);

    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * ================== UPDATE PROPERTY ==================
 */
exports.updateProperty = async (req, res) => {
  const context = `${controllerContext}_UPDATE_PROPERTY`;

  try {
    const { id } = req.params;

    logger.info(context, "Starting property update", { propertyId: id });

    const property = await PropertyListing.findById(id);

    if (!property) {
      logger.warn(context, "Property not found", { propertyId: id });
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    /* 🔥 AUTO SLUG UPDATE */
    let slug = req.body.slug?.trim();

    if (!slug && req.body.propertyName) {
      slug = req.body.propertyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      logger.debug(context, "Auto-generated new slug", { slug });
    }

    /* 🔥 PREPARE UPDATE DATA */
    const updateData = {
      propertyName: req.body.propertyName?.trim(),
      developer: req.body.developer || null,
      listingType: req.body.listingType?.trim().toLowerCase(),
      propertyType: req.body.propertyType?.trim().toLowerCase(),
      address: req.body.address?.trim(),
      subArea: req.body.subArea?.trim(),
      slug: req.body.slug?.trim() || slug,
      developerName: req.body.developer || null,
      price: req.body.price && req.body.price,
      bedroom: req.body.bedroom || null,
      bathroom: req.body.bathroom || null,
      sizeSqft: req.body.sizeSqft && req.body.sizeSqft.trim(),
      videoLink: req.body.videoLink?.trim() || null,
      googleMapUrl: req.body.googleMapUrl?.trim() || null,
      isFeatured: req.body.isFeatured || false,
    };

    /* ARRAY UPDATES */
    if (req.body.highlights)
      updateData.highlights = parseArray(req.body.highlights);
    if (req.body.featuresAmenities)
      updateData.featuresAmenities = parseArray(req.body.featuresAmenities);
    if (req.body.nearby) updateData.nearby = parseArray(req.body.nearby);
    if (req.body.extraHighlights)
      updateData.extraHighlights = parseArray(req.body.extraHighlights);

    /* 🔥 IMAGE REPLACE - Delete old images and upload new ones */
    let updatedImages = [];
    let usedOldImages = [];

    // ✅ Parse imageOrder from frontend (array of strings: URLs or "FILE:0", "FILE:1", etc.)
    let imageOrder = [];
    try {
      imageOrder = JSON.parse(req.body.imageOrder || "[]");
      logger.debug(context, "Parsed imageOrder from frontend", { imageOrder });
    } catch (err) {
      logger.warn(context, "Invalid imageOrder JSON", { error: err.message });
    }

    // ✅ Extract newly uploaded files
    const uploadedImages =
      req.files?.propertyImages
        ?.map((file) => file.path || file.secure_url)
        .filter(Boolean) || [];

    logger.debug(context, "Extracted uploaded images", {
      uploadedCount: uploadedImages.length,
    });

    // ✅ Build final image array based on frontend order
    let newIndex = 0;
    imageOrder.forEach((item) => {
      if (item.type === "new") {
        if (uploadedImages[newIndex]) {
          updatedImages.push(uploadedImages[newIndex++]);
        }
      } else {
        updatedImages.push(item.url);
      }
    });

    // ✅ Find old images to delete (those not in usedOldImages)
    const oldImages = property.propertyImages || [];
    const toDelete = oldImages.filter((img) => !updatedImages.includes(img));

    // ✅ Delete removed images from Cloudinary
    if (toDelete.length > 0) {
      try {
        const deleteResult = await deleteMultipleFromCloudinary(toDelete);
      } catch (err) {
        logger.warn(context, "Error deleting old images", {
          error: err.message,
        });
      }
    } else {
      logger.debug(context, "No images to delete");
    }

    // ✅ Update propertyImages if imageOrder was provided
    if (imageOrder.length > 0) {
      updateData.propertyImages = updatedImages;

      logger.info(context, "Property images updated successfully", {
        finalCount: updatedImages.length,
      });
    } else {
      // If no imageOrder sent, keep existing images untouched
      logger.debug(context, "No imageOrder provided, keeping existing images");
    }

    /* 🔥 BROCHURE REPLACE - Delete old brochure and upload new one */
    if (req.files?.propertyBrochure?.[0]) {
      logger.info(context, "Replacing property brochure");

      // Delete old brochure from Cloudinary
      if (property.propertyBrochure) {
        try {
          await deleteFromCloudinary(property.propertyBrochure);
          logger.info(context, "Old brochure deleted");
        } catch (delErr) {
          logger.warn(
            context,
            "Failed to delete old brochure, continuing anyway",
            delErr,
          );
        }
      }

      // Set new brochure URL
      const newBrochure =
        req.files.propertyBrochure[0].path ||
        req.files.propertyBrochure[0].secure_url;
      updateData.propertyBrochure = newBrochure;

      logger.debug(context, "Brochure updated");
    }

    /* 🔥 SAVE UPDATES */
    const updatedProperty = await PropertyListing.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    logger.info(context, "Property updated successfully", {
      propertyId: updatedProperty._id,
    });

    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: updatedProperty,
    });
  } catch (error) {
    logger.error(context, "Error updating property", error);

    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * ================== UPDATE STATUS ==================
 */
exports.updatePropertyStatus = async (req, res) => {
  const context = `${controllerContext}_UPDATE_STATUS`;

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (typeof status !== "boolean") {
      logger.warn(context, "Invalid status value", { status });
      return res.status(400).json({
        success: false,
        message: "Status must be a boolean",
      });
    }

    logger.info(context, "Updating property status", {
      propertyId: id,
      status,
    });

    const property = await PropertyListing.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!property) {
      logger.warn(context, "Property not found", { propertyId: id });
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    logger.info(context, "Property status updated successfully", {
      propertyId: property._id,
      status: property.status,
    });

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: property,
    });
  } catch (error) {
    logger.error(context, "Error updating status", error);

    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * ================== DELETE PROPERTY ==================
 */
exports.deleteProperty = async (req, res) => {
  const context = `${controllerContext}_DELETE_PROPERTY`;

  try {
    const { id } = req.params;

    logger.info(context, "Starting property deletion", { propertyId: id });

    const property = await PropertyListing.findById(id);

    if (!property) {
      logger.warn(context, "Property not found", { propertyId: id });
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    /* 🔥 DELETE ALL ASSOCIATED FILES FROM CLOUDINARY */
    const filesToDelete = [];

    // Collect all images
    if (property.propertyImages && property.propertyImages.length > 0) {
      filesToDelete.push(...property.propertyImages);
    }

    // Collect brochure
    if (property.propertyBrochure) {
      filesToDelete.push(property.propertyBrochure);
    }

    // Delete all files from Cloudinary
    if (filesToDelete.length > 0) {
      logger.info(context, "Deleting files from Cloudinary", {
        fileCount: filesToDelete.length,
      });

      const deleteResult = await deleteMultipleFromCloudinary(filesToDelete);

      logger.info(context, "Files deletion completed", {
        deleted: deleteResult.deleted.length,
        failed: deleteResult.failed.length,
      });

      if (deleteResult.failed.length > 0) {
        logger.warn(context, "Some files failed to delete", {
          failed: deleteResult.failed,
        });
      }
    }

    /* 🔥 DELETE FROM DATABASE */
    await PropertyListing.findByIdAndDelete(id);

    logger.info(context, "Property deleted successfully", { propertyId: id });

    res.status(200).json({
      success: true,
      message: "Property and all associated files deleted successfully",
    });
  } catch (error) {
    logger.error(context, "Error deleting property", error);

    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
