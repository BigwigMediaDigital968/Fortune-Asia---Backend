const BlogPost = require("../models/Blog.model");
const { deleteFromCloudinary, logger } = require("../utils/cloudinary");

const controllerContext = "BLOG_CONTROLLER";

/**
 * Extract cover image from request
 */
const extractCoverImage = (req) => {
  if (!req.file) {
    return null;
  }

  const coverImage = req.file.secure_url || req.file.path;

  logger.debug(controllerContext, "Extracted cover image", {
    hasFile: !!coverImage,
  });

  return coverImage;
};

/**
 * ================== CREATE NEW BLOG POST ==================
 */
exports.newBlogPost = async (req, res) => {
  const context = `${controllerContext}_CREATE_BLOG`;

  try {
    logger.info(context, "Starting blog post creation");

    const { title, slug, excerpt, content, author, coverImageAlt, tags } =
      req.body;

    /* REQUIRED FIELDS VALIDATION */
    if (!title || !title.trim()) {
      logger.warn(context, "Title is required");
      return res.status(400).json({
        success: false,
        error: "Title is required.",
      });
    }

    if (!content || !content.trim()) {
      logger.warn(context, "Content is required");
      return res.status(400).json({
        success: false,
        error: "Content is required.",
      });
    }

    /* COVER IMAGE VALIDATION */
    const coverImage = extractCoverImage(req);
    if (!coverImage) {
      logger.warn(context, "Cover image is required");
      return res.status(400).json({
        success: false,
        error: "Cover image is required.",
      });
    }

    /* PARSE FAQs */
    let faqs = [];
    if (req.body.faqs) {
      try {
        faqs =
          typeof req.body.faqs === "string"
            ? JSON.parse(req.body.faqs)
            : req.body.faqs;
        logger.debug(context, "Parsed FAQs", { count: faqs.length });
      } catch (err) {
        logger.error(context, "Invalid FAQs format", err);
        return res.status(400).json({
          success: false,
          error: "Invalid FAQs format. Must be valid JSON.",
        });
      }
    }

    /* AUTO-GENERATE SLUG IF NOT PROVIDED */
    let finalSlug = slug?.trim();
    if (!finalSlug) {
      finalSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      logger.debug(context, "Auto-generated slug", { slug: finalSlug });
    }

    /* CHECK SLUG UNIQUENESS */
    const existingBlog = await BlogPost.findOne({ slug: finalSlug });
    if (existingBlog) {
      logger.warn(context, "Slug already exists", { slug: finalSlug });
      return res.status(400).json({
        success: false,
        error: "Slug already exists. Please use a different title.",
      });
    }

    /* CREATE BLOG POST */
    const blogPost = new BlogPost({
      title,
      slug: finalSlug,
      excerpt: excerpt?.trim() || "",
      content,
      author: author?.trim() || "Unknown",
      coverImageAlt: coverImageAlt?.trim() || title,
      tags: tags || [],
      coverImage,
      faqs,
      datePublished: new Date(),
    });

    await blogPost.save();

    logger.info(context, "Blog post created successfully", {
      blogId: blogPost._id,
      slug: blogPost.slug,
    });

    return res.status(201).json({
      success: true,
      message: "Blog post created successfully.",
      data: blogPost,
    });
  } catch (error) {
    logger.error(context, "Error creating blog post", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create blog post.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ================== GET ALL BLOGS ==================
 */
exports.getBlog = async (req, res) => {
  const context = `${controllerContext}_GET_ALL`;

  try {
    logger.info(context, "Fetching all blog posts");

    const blogs = await BlogPost.find()
      .sort({ lastUpdated: -1, datePublished: -1 })
      .lean();

    logger.info(context, "Blogs fetched successfully", { count: blogs.length });

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    logger.error(context, "Error fetching blogs", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch blogs.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ================== GET BLOG BY SLUG ==================
 */
exports.getBlogBySlug = async (req, res) => {
  const context = `${controllerContext}_GET_BY_SLUG`;
  const { slug } = req.params;

  try {
    logger.debug(context, "Fetching blog by slug", { slug });

    // 1. Try exact slug match first
    let blog = await BlogPost.findOne({ slug }).lean();

    // 2. If not found, check slugHistory for old slugs (redirect support)
    if (!blog) {
      logger.debug(context, "Slug not found, checking slug history");

      // const oldBlog = await BlogPost.findOne({ slugHistory: slug }).lean();

      // if (oldBlog) {
      //   logger.info(context, "Found blog with old slug, redirecting", {
      //     oldSlug: slug,
      //     newSlug: oldBlog.slug,
      //   });

      //   return res.status(200).json({
      //     success: true,
      //     redirect: true,
      //     newSlug: oldBlog.slug,
      //   });
      // }

      logger.warn(context, "Blog not found", { slug });
      return res.status(404).json({
        success: false,
        error: "Blog post not found.",
      });
    }

    logger.info(context, "Blog fetched successfully", { blogId: blog._id });

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    logger.error(context, "Error fetching blog by slug", error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch blog post.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ================== UPDATE BLOG POST ==================
 */
exports.updateBlogPostBySlug = async (req, res) => {
  const context = `${controllerContext}_UPDATE_BY_SLUG`;
  const { slug } = req.params;

  try {
    logger.info(context, "Starting blog post update", { slug });

    const blog = await BlogPost.findOne({ slug });

    if (!blog) {
      logger.warn(context, "Blog post not found", { slug });
      return res.status(404).json({
        success: false,
        error: "Blog post not found.",
      });
    }

    const { title, content, author, coverImageAlt, excerpt, tags } = req.body;
    const { slug: newSlug } = req.body;

    /* HANDLE SLUG CHANGE */
    if (newSlug && newSlug !== slug) {
      const trimmedNewSlug = newSlug.trim();

      // Check duplicate
      const existing = await BlogPost.findOne({
        slug: trimmedNewSlug,
        _id: { $ne: blog._id },
      });

      if (existing) {
        logger.warn(context, "New slug already exists", {
          slug: trimmedNewSlug,
        });
        return res.status(400).json({
          success: false,
          error: "New slug already exists. Please choose a different slug.",
        });
      }

      // Save old slug in history
      blog.slugHistory = blog.slugHistory || [];
      if (!blog.slugHistory.includes(slug)) {
        blog.slugHistory.push(slug);
      }

      blog.slug = trimmedNewSlug;
      logger.debug(context, "Updated slug", {
        oldSlug: slug,
        newSlug: trimmedNewSlug,
      });
    }

    /* UPDATE FIELDS */
    if (title) blog.title = title.trim();
    if (content) blog.content = content;
    if (author) blog.author = author.trim();
    if (excerpt) blog.excerpt = excerpt.trim();
    if (tags) blog.tags = Array.isArray(tags) ? tags : [tags];
    if (coverImageAlt) blog.coverImageAlt = coverImageAlt.trim();

    /* PARSE FAQs */
    if (req.body.faqs) {
      try {
        blog.faqs =
          typeof req.body.faqs === "string"
            ? JSON.parse(req.body.faqs)
            : req.body.faqs;
        logger.debug(context, "Updated FAQs", { count: blog.faqs.length });
      } catch (err) {
        logger.error(context, "Invalid FAQs format", err);
        return res.status(400).json({
          success: false,
          error: "Invalid FAQs format. Must be valid JSON.",
        });
      }
    }

    /* HANDLE COVER IMAGE UPDATE */
    if (req.file && (req.file.secure_url || req.file.path)) {
      const newCoverImage = req.file.secure_url || req.file.path;

      logger.info(context, "Updating cover image");

      // Delete old cover image if it exists
      if (blog.coverImage) {
        try {
          await deleteFromCloudinary(blog.coverImage);
          logger.info(context, "Old cover image deleted");
        } catch (delErr) {
          logger.warn(context, "Failed to delete old cover image", delErr);
          // Continue anyway, don't fail the update
        }
      }

      blog.coverImage = newCoverImage;
    }

    /* HANDLE IMAGE REMOVAL */
    if (req.body.removeImage === "true") {
      logger.info(context, "Removing cover image");

      if (blog.coverImage) {
        try {
          await deleteFromCloudinary(blog.coverImage);
          logger.info(context, "Cover image deleted");
        } catch (delErr) {
          logger.warn(context, "Failed to delete cover image", delErr);
        }
      }

      blog.coverImage = null;
    }

    /* SAVE UPDATES */
    blog.lastUpdated = new Date();
    await blog.save();

    logger.info(context, "Blog post updated successfully", {
      blogId: blog._id,
      slug: blog.slug,
    });

    res.status(200).json({
      success: true,
      message: "Blog post updated successfully.",
      data: blog,
    });
  } catch (error) {
    logger.error(context, "Error updating blog post", error);

    res.status(500).json({
      success: false,
      error: "Failed to update blog post.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ================== DELETE BLOG POST ==================
 */
exports.deleteBlogPostBySlug = async (req, res) => {
  const context = `${controllerContext}_DELETE_BY_SLUG`;
  const { slug } = req.params;

  try {
    logger.info(context, "Starting blog post deletion", { slug });

    const blog = await BlogPost.findOne({ slug });

    if (!blog) {
      logger.warn(context, "Blog post not found", { slug });
      return res.status(404).json({
        success: false,
        error: "Blog post not found.",
      });
    }

    /* DELETE COVER IMAGE FROM CLOUDINARY */
    if (blog.coverImage) {
      try {
        logger.info(context, "Deleting cover image from Cloudinary");
        await deleteFromCloudinary(blog.coverImage);
        logger.info(context, "Cover image deleted successfully");
      } catch (delErr) {
        logger.warn(
          context,
          "Failed to delete cover image, continuing anyway",
          delErr,
        );
        // Don't fail the blog deletion if image deletion fails
      }
    }

    /* DELETE FROM DATABASE */
    await BlogPost.findByIdAndDelete(blog._id);

    logger.info(context, "Blog post deleted successfully", {
      blogId: blog._id,
    });

    res.status(200).json({
      success: true,
      message: "Blog post deleted successfully.",
    });
  } catch (error) {
    logger.error(context, "Error deleting blog post", error);

    res.status(500).json({
      success: false,
      error: "Failed to delete blog post.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
