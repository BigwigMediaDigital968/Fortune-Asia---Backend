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
ensureDir("uploads/images");
ensureDir("uploads/brochures");
ensureDir("uploads/blogs");

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
      const dir = `uploads/${destination}`;
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
const createCloudinaryStorage = (folder = "uploads/images") => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const context = `${uploadContext}_CLOUDINARY`;
      const ext = path.extname(file.originalname).toLowerCase();

      // PDF handling
      if (
        file.fieldname === "propertyBrochure" ||
        file.fieldname === "brochure"
      ) {
        const cleanName = file.originalname
          .replace(/\s+/g, "_")
          .replace(/\.[^/.]+$/, "");

        logger.info(context, "Uploading PDF to Cloudinary", {
          fieldname: file.fieldname,
          cleanName,
        });

        return {
          folder: folder,
          resource_type: "raw",
          type: "upload",
          format: "pdf",
          access_mode: "public",
          flags: "immutable",
          public_id: `${cleanName}_${Date.now()}`,
        };
      }

      // Image handling
      logger.info(context, "Uploading image to Cloudinary", {
        fieldname: file.fieldname,
        originalname: file.originalname,
      });

      return {
        folder: folder,
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
        access_mode: "public",
        flags: "immutable",
        quality: "auto",
        fetch_format: "auto",
      };
    },
  });
};

/**
 * ============================================
 * MULTER CONFIGURATIONS
 * ============================================
 */

// Property upload (multiple images + brochure)
const propertyUpload = multer({
  storage: createCloudinaryStorage("uploads/properties"),
  fileFilter: createFileFilter(["image", "pdf"]),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 11, // 10 images + 1 brochure
  },
});

// Blog upload (single cover image)
const blogUpload = multer({
  storage: createCloudinaryStorage("uploads/blogs"),
  fileFilter: createFileFilter(["image"]),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

// Generic single image upload
const singleImageUpload = multer({
  storage: createCloudinaryStorage("uploads/images"),
  fileFilter: createFileFilter(["image"]),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

// Generic single PDF upload
const singlePdfUpload = multer({
  storage: createCloudinaryStorage("uploads/brochures"),
  fileFilter: createFileFilter(["pdf"]),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
});

// Generic multiple files upload
const multipleFilesUpload = multer({
  storage: createCloudinaryStorage("uploads/files"),
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

  // Utilities
  createFileFilter,
  createCloudinaryStorage,
  createLocalStorage,
  logger,

  // Legacy exports (for backward compatibility)
  upload: multipleFilesUpload,
  newUpload: propertyUpload,
};
