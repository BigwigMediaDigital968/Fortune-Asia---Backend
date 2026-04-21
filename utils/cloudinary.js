const cloudinary = require("../config/cloudinary");

/**
 * ============================================
 * LOGGER UTILITY FOR DEBUGGING
 * ============================================
 */
const logger = {
  info: (context, message, data = {}) => {
    console.log(`[INFO] [${context}] ${message}`, data);
  },
  warn: (context, message, data = {}) => {
    console.warn(`[WARN] [${context}] ${message}`, data);
  },
  error: (context, message, error = {}) => {
    console.error(`[ERROR] [${context}] ${message}`, {
      message: error.message,
      stack: error.stack,
      ...error,
    });
  },
  debug: (context, message, data = {}) => {
    if (process.env.DEBUG === "true") {
      console.log(`[DEBUG] [${context}] ${message}`, data);
    }
  },
};

/**
 * ============================================
 * EXTRACT PUBLIC ID FROM CLOUDINARY URL
 * ============================================
 */
const extractPublicId = (url) => {
  try {
    if (!url) {
      logger.debug("extractPublicId", "URL is empty or null");
      return null;
    }

    // Remove query params if any
    const cleanUrl = url.split("?")[0];

    // Example:
    // https://res.cloudinary.com/demo/image/upload/v1234567890/uploads/images/abc.jpg

    const parts = cleanUrl.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) {
      logger.warn("extractPublicId", "Could not find 'upload' in URL", {
        url: cleanUrl,
      });
      return null;
    }

    let publicIdParts = parts.slice(uploadIndex + 1);

    // Remove version prefix (v1234567890)
    if (publicIdParts[0]?.startsWith("v")) {
      publicIdParts.shift();
    }

    let publicId = publicIdParts.join("/");
    publicId = publicId.replace(/\.[^/.]+$/, ""); // Remove extension

    logger.debug("extractPublicId", "Successfully extracted public ID", {
      url: cleanUrl,
      publicId,
    });

    return publicId;
  } catch (err) {
    logger.error("extractPublicId", "Error extracting public_id", err);
    return null;
  }
};

/**
 * ============================================
 * DELETE FILE FROM CLOUDINARY (WITH RETRY)
 * ============================================
 */
const deleteFromCloudinary = async (url, retries = 2) => {
  const context = "deleteFromCloudinary";

  if (!url) {
    logger.warn(context, "URL is empty or null");
    return { success: true, message: "Skipped deletion (empty URL)" };
  }

  try {
    const publicId = extractPublicId(url);

    if (!publicId) {
      logger.warn(context, "Could not extract public ID from URL", { url });
      return {
        success: true,
        message: "Skipped deletion (invalid URL format)",
      };
    }

    const isPDF = url.includes("/raw/") || url.endsWith(".pdf");
    const resourceType = isPDF ? "raw" : "image";

    logger.info(context, "Attempting to delete file", {
      publicId,
      resourceType,
      url,
    });

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    logger.info(context, "Successfully deleted file", {
      publicId,
      result,
    });

    return { success: true, result };
  } catch (err) {
    logger.error(context, "Error deleting from Cloudinary", err);

    // Retry logic
    if (retries > 0) {
      logger.info(context, `Retrying... (${retries} retries left)`, { url });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      return deleteFromCloudinary(url, retries - 1);
    }

    throw new Error(
      `Failed to delete file from Cloudinary after retries: ${err.message}`,
    );
  }
};

/**
 * ============================================
 * DELETE MULTIPLE FILES FROM CLOUDINARY
 * ============================================
 */
const deleteMultipleFromCloudinary = async (urls = []) => {
  const context = "deleteMultipleFromCloudinary";

  if (!Array.isArray(urls) || urls.length === 0) {
    logger.info(context, "No files to delete");
    return { success: true, deleted: [], failed: [] };
  }

  logger.info(context, `Starting bulk deletion of ${urls.length} files`);

  const results = {
    deleted: [],
    failed: [],
  };

  for (const url of urls) {
    try {
      await deleteFromCloudinary(url);
      results.deleted.push(url);
    } catch (err) {
      logger.error(context, `Failed to delete ${url}`, err);
      results.failed.push({ url, error: err.message });
    }
  }

  logger.info(context, "Bulk deletion completed", {
    deleted: results.deleted.length,
    failed: results.failed.length,
  });

  return results;
};

/**
 * ============================================
 * VALIDATE CLOUDINARY URL
 * ============================================
 */
const isValidCloudinaryUrl = (url) => {
  try {
    if (!url || typeof url !== "string") return false;
    return (
      url.includes("res.cloudinary.com") &&
      (url.includes("/upload/") || url.includes("/raw/"))
    );
  } catch (err) {
    logger.error("isValidCloudinaryUrl", "Error validating URL", err);
    return false;
  }
};

/**
 * ============================================
 * GET FILE INFO FROM CLOUDINARY URL
 * ============================================
 */
const getCloudinaryFileInfo = (url) => {
  try {
    const publicId = extractPublicId(url);
    if (!publicId) return null;

    const isPDF = url.includes("/raw/") || url.endsWith(".pdf");

    return {
      publicId,
      resourceType: isPDF ? "raw" : "image",
      isPDF,
      url,
    };
  } catch (err) {
    logger.error("getCloudinaryFileInfo", "Error getting file info", err);
    return null;
  }
};

module.exports = {
  extractPublicId,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  isValidCloudinaryUrl,
  getCloudinaryFileInfo,
  logger,
};
