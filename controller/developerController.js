const mongoose = require("mongoose");
const Developer = require("../models/Developer.js");

// Utility validator
const validateDeveloperInput = (body, isUpdate = false) => {
  const errors = [];

  if (!isUpdate) {
    if (!body.developerName) errors.push("Developer name is required");
    if (!body.slug) errors.push("Slug is required");
    if (!body.shortDescription) errors.push("Short description is required");
    if (!body.location) errors.push("Location is required");
  }
  return errors;
};

/**
 * CREATE DEVELOPER
 */
const createDeveloper = async (req, res) => {
  try {
    const {
      developerName,
      developerLogo, // URL
      shortDescription,
      highlights,
      slug,
      location,
      establishedYear,
      totalProjects,
      website,
    } = req.body;

    // Required field validation
    if (
      !developerName ||
      !developerLogo ||
      !shortDescription ||
      !slug ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    // Slug uniqueness check
    const existingSlug = await Developer.findOne({ slug });
    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "Developer with this slug already exists",
      });
    }

    const developer = await Developer.create({
      developerName,
      developerLogo, // stored directly as URL
      shortDescription,
      highlights: Array.isArray(highlights)
        ? highlights
        : highlights?.split(",").map((x) => x.trim()),
      slug,
      location,
      establishedYear,
      totalProjects,
      website,
    });

    res.status(201).json({
      success: true,
      data: developer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET ALL DEVELOPERS
 */
const getAllDevelopers = async (req, res) => {
  try {
    const developers = await Developer.find().sort({
      isFeatured: -1,
      createdAt: -1,
    });

    res.json({
      success: true,
      count: developers.length,
      data: developers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET DEVELOPER BY ID OR SLUG
 */
const getDeveloperByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    let developer = null;

    // If valid MongoDB ObjectId → search by ID
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      developer = await Developer.findById(identifier);
    }

    // If not found by ID → search by slug
    if (!developer) {
      developer = await Developer.findOne({ slug: identifier });
    }

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: "Developer not found",
      });
    }

    res.json({
      success: true,
      data: developer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * UPDATE DEVELOPER
 */
const updateDeveloper = async (req, res) => {
  try {
    const developer = await Developer.findById(req.params.id);
    if (!developer) {
      return res.status(404).json({
        success: false,
        message: "Developer Details not found",
      });
    }

    const {
      developerName,
      developerLogo,
      shortDescription,
      highlights,
      slug,
      location,
      establishedYear,
      totalProjects,
      website,
    } = req.body;

    // Prevent duplicate slug
    if (slug && slug !== developer.slug) {
      const slugExists = await Developer.findOne({
        slug,
        _id: { $ne: developer._id },
      });

      if (slugExists) {
        return res.status(409).json({
          success: false,
          message: "Slug already in use",
        });
      }
    }

    developer.developerName = developerName ?? developer.developerName;
    developer.developerLogo = developerLogo ?? developer.developerLogo;
    developer.shortDescription = shortDescription ?? developer.shortDescription;
    developer.slug = slug ?? developer.slug;
    developer.location = location ?? developer.location;
    developer.establishedYear = establishedYear ?? developer.establishedYear;
    developer.totalProjects = totalProjects ?? developer.totalProjects;
    developer.website = website ?? developer.website;

    if (highlights) {
      developer.highlights = Array.isArray(highlights)
        ? highlights
        : highlights.split(",").map((x) => x.trim());
    }

    await developer.save();

    res.json({
      success: true,
      data: developer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DELETE DEVELOPER
 */
const deleteDeveloper = async (req, res) => {
  try {
    const developer = await Developer.findByIdAndDelete(req.params.id);

    if (!developer) {
      return res
        .status(404)
        .json({ success: false, message: "Developer not found" });
    }

    res.json({
      success: true,
      message: "Developer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDeveloper,
  getAllDevelopers,
  getDeveloperByIdentifier,
  updateDeveloper,
  deleteDeveloper,
};
