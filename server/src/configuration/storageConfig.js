import multer from "multer";
import { Constants } from "../../constants/constants.js";

export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Error raised when an uploaded file is rejected, carrying the translation key sent to the client.
 */
export class UploadError extends Error {
  constructor(key) {
    super(key);
    this.name = "UploadError";
  }
}

// Version MEMORY : the size limit stops oversized uploads before they are buffered entirely.
// SVG is refused because it can carry scripts.
export const uploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Constants.AVATAR_MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      return cb(new UploadError("server.upload.errors.invalid_file_type"));
    }
    cb(null, true);
  },
});
