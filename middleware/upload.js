const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const { logger } = require("../utils/cloudinary");

const uploadContext = "MULTER_UPLOAD";

/**
 * ============================================
 * DIRECTORY SETUP
 * ============================================
 */
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(uploadContext, `Created directory: ${dir}`);
  }
};

// Ensure local backup directories exist (for development)
ensureDir("FAR/images");
ensureDir("FAR/brochures");
ensureDir("FAR/blogs");

/**
 * ============================================
 * MIME TYPES & EXTENSIONS
 * ============================================
 */
const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "image/tiff",
];

const ALLOWED_IMAGE_EXT = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
  ".bmp",
  ".tiff",
];

const ALLOWED_PDF_MIME = "application/pdf";
const ALLOWED_PDF_EXT = ".pdf";

/**
 * ============================================
 * FILE FILTER
 * ============================================
 */
const createFileFilter = (allowedTypes = ["image"]) => {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const context = `${uploadContext}_FILTER`;

    logger.debug(context, "File received", {
      fieldname: file.fieldname,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Size validation
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      logger.error(context, "File exceeds max size", {
        file: file.originalname,
        size: file.size,
        max: MAX_FILE_SIZE,
      });
      return cb(
        new Error(
          `File too large. Max size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        ),
      );
    }

    // PDF validation
    if (
      allowedTypes.includes("pdf") &&
      (file.fieldname === "propertyBrochure" || file.fieldname === "brochure")
    ) {
      if (file.mimetype === ALLOWED_PDF_MIME && ext === ALLOWED_PDF_EXT) {
        logger.debug(context, "PDF file accepted", { file: file.originalname });
        return cb(null, true);
      }
      logger.error(context, "Invalid PDF file", {
        file: file.originalname,
        mimetype: file.mimetype,
        ext,
      });
      return cb(new Error("Only PDF files are allowed for brochures"));
    }

    // Image validation
    if (allowedTypes.includes("image")) {
      if (
        ALLOWED_IMAGE_MIMES.includes(file.mimetype) &&
        ALLOWED_IMAGE_EXT.includes(ext)
      ) {
        logger.debug(context, "Image file accepted", {
          file: file.originalname,
        });
        return cb(null, true);
      }
      logger.error(context, "Invalid image file", {
        file: file.originalname,
        mimetype: file.mimetype,
        ext,
      });
      return cb(
        new Error(
          "Invalid image format. Allowed: JPG, PNG, GIF, WebP, SVG, AVIF, BMP, TIFF",
        ),
      );
    }

    logger.error(context, "File type not allowed", {
      file: file.originalname,
      fieldname: file.fieldname,
    });
    cb(new Error("File type not allowed"));
  };
};

/**
 * ============================================
 * LOCAL DISK STORAGE (FALLBACK)
 * ============================================
 */
const createLocalStorage = (destination = "images") => {
  return {
    destination: (req, file, cb) => {
      const dir = `FAR/${destination}`;
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, uniqueName + ext);
    },
  };
};

/**
 * ============================================
 * CLOUDINARY STORAGE
 * ============================================
 */
const createCloudinaryStorage = (folder = "FAR/images") => {
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const context = `${uploadContext}_CLOUDINARY`;

      try {
        const ext = path.extname(file.originalname).toLowerCase();

        // PDF handling
        if (
          file.fieldname === "propertyBrochure" ||
          file.fieldname === "brochure"
        ) {
          const cleanName = file.originalname
            .replace(/\s+/g, "_")
            .split(".")[0];

          logger.info(context, "Uploading PDF to Cloudinary", {
            fieldname: file.fieldname,
            cleanName,
          });

          const params = {
            folder: folder,
            resource_type: "raw", // IMPORTANT for pdf
            type: "upload",
            format: "pdf",
            access_mode: "public",
            public_id: `brochure_${cleanName}_${Date.now()}`,
          };

          logger.info(context, "PDF params generated", params);
          return params;
        }

        // Image handling
        const imageCleanName = file.originalname
          .replace(/\s+/g, "_")
          .replace(/\.[^/.]+$/, "");

        logger.info(context, "Uploading image to Cloudinary", {
          fieldname: file.fieldname,
          originalname: file.originalname,
        });

        const params = {
          folder: folder,
          resource_type: "image",
          public_id: `${imageCleanName}_${Date.now()}`,
          allowed_formats: [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "svg",
            "avif",
            "bmp",
            "tiff",
          ],
        };

        logger.info(context, "Image params generated", params);
        return params;
      } catch (error) {
        const context = `${uploadContext}_CLOUDINARY_PARAMS`;
        logger.error(context, "Error in params function", error);
        throw error;
      }
    },
  });

  // Wrap storage to catch upload errors
  const originalBucket = storage._bucket;
  if (storage._bucket && typeof storage._bucket === "object") {
    storage._bucket = {
      ...originalBucket,
      _handleFile: async function (req, file, cb) {
        try {
          if (typeof originalBucket._handleFile === "function") {
            const result = await originalBucket._handleFile.call(
              this,
              req,
              file,
              cb,
            );
            return result;
          } else {
            logger.warn(
              `${uploadContext}_CLOUDINARY`,
              "Original _handleFile not found",
            );
            cb(new Error("Storage handler not available"));
          }
        } catch (error) {
          logger.error(
            `${uploadContext}_CLOUDINARY_UPLOAD`,
            "Error during file upload",
            error,
          );
          cb(error);
        }
      },
    };
  }

  return storage;
};

/**
 * ============================================
 * MULTER CONFIGURATIONS
 * ============================================
 */

// Property upload (multiple images + brochure)
const propertyUpload = multer({
  storage: createCloudinaryStorage("FAR/properties"),
  fileFilter: createFileFilter(["image", "pdf"]),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 11, // 10 images + 1 brochure
  },
});

// Developer upload (multiple images + brochure)
  const developerUpload = multer({
    storage: createCloudinaryStorage("FAR/developers"),
    fileFilter: createFileFilter(["image", "pdf"]),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB per file
      files: 11, // 10 images + 1 brochure
    },
  });

// Blog upload (single cover image)
const blogUpload = multer({
  storage: createCloudinaryStorage("FAR/blogs"),
  fileFilter: createFileFilter(["image"]),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

// Generic single image upload
const singleImageUpload = multer({
  storage: createCloudinaryStorage("FAR/images"),
  fileFilter: createFileFilter(["image"]),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

const blogContentUplold = multer({
  storage: createCloudinaryStorage("FAR/blogs/content"),
  fileFilter: createFileFilter(["image"]),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

// Generic single PDF upload
const singlePdfUpload = multer({
  storage: createCloudinaryStorage("FAR/brochures"),
  fileFilter: createFileFilter(["pdf"]),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
});

// Generic multiple files upload
const multipleFilesUpload = multer({
  storage: createCloudinaryStorage("FAR/files"),
  fileFilter: createFileFilter(["image", "pdf"]),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 20,
  },
});

module.exports = {
  // Main upload configurations
  propertyUpload,
  blogUpload,
  singleImageUpload,
  singlePdfUpload,
  multipleFilesUpload,
  blogContentUplold,
  developerUpload,
  // Utilities
  createFileFilter,
  createCloudinaryStorage,
  createLocalStorage,
  logger,

  // Legacy exports (for backward compatibility)
  upload: multipleFilesUpload,
  newUpload: propertyUpload,
};
