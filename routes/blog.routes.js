const router = require("express").Router();
const {
  newBlogPost,
  getBlog,
  updateBlogPostBySlug,
  deleteBlogPostBySlug,
  getBlogBySlug,
} = require("../controller/Blog.controller");

const { blogUpload } = require("../middleware/upload");

/**
 * ============================================
 * BLOG ROUTES
 * ============================================
 */

// CREATE (with cover image)
router.post("/add", blogUpload.single("coverImage"), newBlogPost);

// GET ALL BLOGS
router.get("/viewblog", getBlog);

// GET BLOG BY SLUG
router.get("/:slug", getBlogBySlug);

// UPDATE BLOG (with optional cover image)
router.put("/:slug", blogUpload.single("coverImage"), updateBlogPostBySlug);

// DELETE BLOG
router.delete("/:slug", deleteBlogPostBySlug);

module.exports = router;
