const router = require("express").Router();
const {
  newBlogPost,
  getBlog,
  updateBlogPostBySlug,
  deleteBlogPostBySlug,
  getBlogBySlug,
} = require("../controller/Blog.controller");

const { blogUpload, blogContentUplold } = require("../middleware/upload");

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

router.post('/upload/image', blogContentUplold.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    res.json({
      success: true,
      url: req.file.path, // Cloudinary URL
      public_id: req.file.filename,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed',
    });
  }
});

module.exports = router;
