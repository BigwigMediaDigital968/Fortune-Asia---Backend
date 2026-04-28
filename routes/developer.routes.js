const express = require("express");
const router = express.Router();
const developerController = require("../controller/developer.controller.js");
const { developerUpload } = require("../middleware/upload");

// You can add authentication middleware here
// const { authenticate, authorize } = require("../middleware/auth");

/* ============================================
   PUBLIC ROUTES
============================================ */

/**
 * @route   GET /api/developers
 * @desc    Get all developers (with filtering, sorting, pagination)
 * @query   page, limit, search, isFeatured, isActive, sortBy, order
 * @access  Public
 */
router.get("/", developerController.getAllDevelopers);

/**
 * @route   GET /api/developers/stats/overview
 * @desc    Get developer statistics (total, active, featured, etc.)
 * @access  Public (or Private/Admin if you want)
 */
router.get("/stats/overview", developerController.getDeveloperStats);

/**
 * @route   GET /api/developers/:identifier
 * @desc    Get single developer by ID or slug
 * @param   identifier - MongoDB ObjectId or slug
 * @access  Public
 */
router.get("/:identifier", developerController.getDeveloperByIdentifier);

/* ============================================
   PRIVATE/ADMIN ROUTES
   (Add authentication middleware as needed)
============================================ */

/**
 * @route   POST /api/developers
 * @desc    Create a new developer
 * @access  Private/Admin
 */
router.post(
  "/",
  // authenticate,
  // authorize("admin"),
  developerUpload.fields([
    { name: "images", maxCount: 10 },
    { name: "brochure", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  developerController.createDeveloper,
);

/**
 * @route   PUT /api/developers/:id
 * @desc    Update developer
 * @access  Private/Admin
 */
router.put(
  "/:id",
  // authenticate,
  // authorize("admin"),
  developerUpload.fields([
    { name: "images", maxCount: 10 },
    { name: "brochure", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  developerController.updateDeveloper,
);

/**
 * @route   PATCH /api/developers/:id/toggle-featured
 * @desc    Toggle featured status
 * @access  Private/Admin
 */
router.patch(
  "/:id/toggle-featured",
  // authenticate,
  // authorize("admin"),
  developerController.toggleFeatured,
);

/**
 * @route   PATCH /api/developers/:id/toggle-active
 * @desc    Toggle active status
 * @access  Private/Admin
 */
router.patch(
  "/:id/toggle-active",
  // authenticate,
  // authorize("admin"),
  developerController.toggleActive,
);

/**
 * @route   PATCH /api/developers/:id/projects
 * @desc    Add project to developer
 * @body    { projectId: "..." }
 * @access  Private/Admin
 */
router.patch(
  "/:id/projects",
  // authenticate,
  // authorize("admin"),
  developerController.addProject,
);

/**
 * @route   DELETE /api/developers/:id/projects/:projectId
 * @desc    Remove project from developer
 * @access  Private/Admin
 */
router.delete(
  "/:id/projects/:projectId",
  // authenticate,
  // authorize("admin"),
  developerController.removeProject,
);

/**
 * @route   DELETE /api/developers/:id
 * @desc    Delete developer
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  // authenticate,
  // authorize("admin"),
  developerController.deleteDeveloper,
);

module.exports = router;
