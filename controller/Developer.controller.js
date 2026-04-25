const mongoose = require("mongoose");
const Developer = require("../models/Developer");
const { deleteMultipleFromCloudinary, logger } = require("../utils/cloudinary");

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validate required fields for create
 */
const validateCreateInput = (body) => {
  const errors = [];

  if (!body.name?.trim()) errors.push("Developer name is required");
  if (!body.slug?.trim()) errors.push("Slug is required");
  if (!body.shortDescription?.trim()) errors.push("Short description is required");

  if (body.shortDescription && body.shortDescription.length > 300) {
    errors.push("Short description must not exceed 300 characters");
  }

  return errors;
};

/**
 * Sanitize and prepare developer data
 */
const prepareDeveloperData = async (body, files, isUpdate = false, existingDeveloper = null) => {
  const data = {
    name: body.name?.trim(),
    slug: body.slug?.trim().toLowerCase(),
    shortDescription: body.shortDescription?.trim(),
  };

  // Optional fields
  //if (body.coverImage) data.coverImage = body.coverImage.trim();
  if (body.fullDescription) data.fullDescription = body.fullDescription;
  if (body.website) data.website = body.website.trim();

  // Stats
  if (body.stats) {
    data.stats = {};
    if (body.stats.establishedYear) data.stats.establishedYear = parseInt(body.stats.establishedYear);
    if (body.stats.totalProjects !== undefined) data.stats.totalProjects = parseInt(body.stats.totalProjects) || 0;
  }

  // Arrays
  if (body.highlights) {
    data.highlights = Array.isArray(body.highlights)
      ? body.highlights.filter(h => h?.trim())
      : body.highlights.split(",").map(h => h.trim()).filter(Boolean);
  }

  if (body.amenities) {
    data.amenities = Array.isArray(body.amenities)
      ? body.amenities.filter(a => a?.trim())
      : body.amenities.split(",").map(a => a.trim()).filter(Boolean);
  }

  if (body.certifications) {
    data.certifications = Array.isArray(body.certifications)
      ? body.certifications.filter(c => c?.trim())
      : body.certifications.split(",").map(c => c.trim()).filter(Boolean);
  }

  if (body.images) {
    data.images = Array.isArray(body.images)
      ? body.images.filter(g => g?.trim())
      : body.images.split(",").map(g => g.trim()).filter(Boolean);
  }

  if (body.projects) {
    data.projects = Array.isArray(body.projects) ? body.projects : [];
  }

  // Social Links
  if (body.socialLinks) {
    data.socialLinks = {
      facebook: body.socialLinks.facebook?.trim() || null,
      instagram: body.socialLinks.instagram?.trim() || null,
      linkedin: body.socialLinks.linkedin?.trim() || null,
      twitter: body.socialLinks.twitter?.trim() || null,
    };
  }

  // SEO
  if (body.seo) {
    data.seo = {
      metaTitle: body.seo.metaTitle?.trim() || "",
      metaDescription: body.seo.metaDescription?.trim() || "",
      keywords: Array.isArray(body.seo.keywords)
        ? body.seo.keywords.filter(k => k?.trim())
        : (body.seo.keywords ? body.seo.keywords.split(",").map(k => k.trim()).filter(Boolean) : []),
    };
  }

  // Controls
  if (body.isFeatured !== undefined) data.isFeatured = Boolean(body.isFeatured);
  if (body.priority !== undefined) data.priority = parseInt(body.priority) || 0;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.faqs) {
    data.faqs = Array.isArray(body.faqs) ? body.faqs : [];
  }
  const newImages = [];
  const toDelete = [];
  if (!isUpdate && files) {
    if (files.brochure) {
      data.brochure = files.brochure[0].path;
    }
    if (files.images) {
      files.images.forEach((file) => {
        newImages.push(file.path);
      })
    }
    if (files.logo) {
      data.logo = files.logo[0].path;
    }
  } else if (isUpdate && files) {
    if (files.brochure) {
      data.brochure = files.brochure[0].path;
      toDelete.push(existingDeveloper.brochure);
    }
    if (files.logo) {
      data.logo = files.logo[0].path;
      toDelete.push(existingDeveloper.logo);
    }
    if (files.images && body.imageOrder) {
      let existingImages = existingDeveloper.images || [];
      imageorder = JSON.parse(body.imageOrder);
      let index = 0;
      imageorder.forEach((img) => {
        if (img.type === "new") {
          newImages.push(files.images[index].path);
          index++;
        } else if (img.type === "existing") {
          newImages.push(img.url);
        }
      })
    }
    existingDeveloper.images.forEach((img) => {
      if (!newImages.includes(img)) {
        toDelete.push(img);
      }
    })

  }
  if (toDelete.length > 0) {
    try {
      const deleteResult = await deleteMultipleFromCloudinary(toDelete);
    } catch (err) {
      logger.warn(context, "Error deleting old images", {
        error: err.message,
      });
    }
  }
  if(body.coverImage) {
    data.coverImage = newImages[0];
  }
  data.images = newImages;

  return data;
};

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * @route   POST /api/developers
 * @desc    Create a new developer
 * @access  Private/Admin
 */
exports.createDeveloper = async (req, res) => {
  try {
    // Validate input
    const errors = validateCreateInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Check slug uniqueness
    const existingSlug = await Developer.findOne({
      slug: req.body.slug.trim().toLowerCase()
    });

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "A developer with this slug already exists",
      });
    }

    // Prepare and create developer
    const developerData =  await prepareDeveloperData(req.body, req.files);
    const developer = await Developer.create(developerData);

    res.status(201).json({
      success: true,
      message: "Developer created successfully",
      data: developer,
    });
  } catch (error) {
    console.error("Create Developer Error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate key error",
        field: Object.keys(error.keyPattern)[0],
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create developer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/developers
 * @desc    Get all developers with filtering, sorting, and pagination
 * @access  Public
 */
exports.getAllDevelopers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isFeatured,
      isActive,
      sortBy = "priority",
      order = "desc",
    } = req.query;

    // Build query
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    // Featured filter
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === "true";
    }

    // Active filter
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Pagination
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(Math.max(parseInt(limit), 1), 100);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = {};

    if (sortBy === "priority") {
      sortOptions.priority = -1;
      sortOptions.isFeatured = -1;
      sortOptions.createdAt = -1;
    } else if (sortBy === "name") {
      sortOptions.name = sortOrder;
    } else if (sortBy === "createdAt") {
      sortOptions.createdAt = sortOrder;
    } else {
      sortOptions.priority = -1;
      sortOptions.createdAt = -1;
    }

    // Execute queries
    const [developers, total] = await Promise.all([
      Developer.find(query)
        .populate("projects", "title slug coverImage location")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Developer.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: developers.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: developers,
    });
  } catch (error) {
    console.error("Get All Developers Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch developers",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/developers/:identifier
 * @desc    Get single developer by ID or slug
 * @access  Public
 */
exports.getDeveloperByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    let developer = null;

    // Try to find by ID first
    if (isValidObjectId(identifier)) {
      developer = await Developer.findById(identifier)
        .populate("projects", "title slug coverImage location price bedrooms bathrooms area")
        .lean();
    }

    // If not found by ID, try by slug
    if (!developer) {
      developer = await Developer.findOne({ slug: identifier })
        .populate("projects", "title slug coverImage location price bedrooms bathrooms area")
        .lean();
    }

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: "Developer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: developer,
    });
  } catch (error) {
    console.error("Get Developer Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch developer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   PUT /api/developers/:id
 * @desc    Update developer
 * @access  Private/Admin
 */
exports.updateDeveloper = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid developer ID",
      });
    }

    // Find developer
    const developer = await Developer.findById(id);

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: "Developer not found",
      });
    }

    // Check slug uniqueness if slug is being updated
    if (req.body.slug && req.body.slug.trim().toLowerCase() !== developer.slug) {
      const slugExists = await Developer.findOne({
        slug: req.body.slug.trim().toLowerCase(),
        _id: { $ne: id },
      });

      if (slugExists) {
        return res.status(409).json({
          success: false,
          message: "Slug already in use by another developer",
        });
      }
    }

    // Prepare update data
    const updateData =  await prepareDeveloperData(req.body, req.files, true, developer);

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update developer
    const updatedDeveloper = await Developer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("projects", "title slug coverImage location");

    res.status(200).json({
      success: true,
      message: "Developer updated successfully",
      data: updatedDeveloper,
    });
  } catch (error) {
    console.error("Update Developer Error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate key error",
        field: Object.keys(error.keyPattern)[0],
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update developer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   PATCH /api/developers/:id/toggle-featured
 * @desc    Toggle featured status
 * @access  Private/Admin
 */
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid developer ID",
      });
    }

    const developer = await Developer.findById(id);

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: "Developer not found",
      });
    }

    developer.isFeatured = !developer.isFeatured;
    await developer.save();

    res.status(200).json({
      success: true,
      message: `Developer ${developer.isFeatured ? "featured" : "unfeatured"} successfully`,
      data: developer,
    });
  } catch (error) {
    console.error("Toggle Featured Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle featured status",
    });
  }
};

/**
 * @route   PATCH /api/developers/:id/toggle-active
 * @desc    Toggle active status
 * @access  Private/Admin
 */
exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid developer ID",
      });
    }

    const developer = await Developer.findById(id);

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: "Developer not found",
      });
    }

    developer.isActive = !developer.isActive;
    await developer.save();

    res.status(200).json({
      success: true,
      message: `Developer ${developer.isActive ? "activated" : "deactivated"} successfully`,
      data: developer,
    });
  } catch (error) {
    console.error("Toggle Active Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle active status",
    });
  }
};

/**
 * @route   PATCH /api/developers/:id/projects
 * @desc    Add project to developer
 * @access  Private/Admin
 */
exports.addProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const developer = await Developer.findById(id);

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: "Developer not found",
      });
    }

    // Check if project already exists
    if (developer.projects.includes(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Project already linked to this developer",
      });
    }

    developer.projects.push(projectId);
    await developer.save();

    const updatedDeveloper = await Developer.findById(id).populate("projects");

    res.status(200).json({
      success: true,
      message: "Project added successfully",
      data: updatedDeveloper,
    });
  } catch (error) {
    console.error("Add Project Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add project",
    });
  }
};

/**
 * @route   DELETE /api/developers/:id/projects/:projectId
 * @desc    Remove project from developer
 * @access  Private/Admin
 */
exports.removeProject = async (req, res) => {
  try {
    const { id, projectId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const developer = await Developer.findByIdAndUpdate(
      id,
      { $pull: { projects: projectId } },
      { new: true }
    ).populate("projects");

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: "Developer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Project removed successfully",
      data: developer,
    });
  } catch (error) {
    console.error("Remove Project Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove project",
    });
  }
};

/**
 * @route   DELETE /api/developers/:id
 * @desc    Delete developer
 * @access  Private/Admin
 */
exports.deleteDeveloper = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid developer ID",
      });
    }

    const developer = await Developer.findByIdAndDelete(id);

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: "Developer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Developer deleted successfully",
      data: { id: developer._id },
    });
  } catch (error) {
    console.error("Delete Developer Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete developer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/developers/stats/overview
 * @desc    Get developer statistics
 * @access  Private/Admin
 */
exports.getDeveloperStats = async (req, res) => {
  try {
    const [total, active, featured, totalProjects] = await Promise.all([
      Developer.countDocuments(),
      Developer.countDocuments({ isActive: true }),
      Developer.countDocuments({ isFeatured: true }),
      Developer.aggregate([
        { $group: { _id: null, total: { $sum: "$stats.totalProjects" } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDevelopers: total,
        activeDevelopers: active,
        featuredDevelopers: featured,
        inactiveDevelopers: total - active,
        totalProjects: totalProjects[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get Developer Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
    });
  }
};