import multer from "multer";

// Version MEMORY :
export const uploadConfig = multer({
  storage: multer.memoryStorage(),
});
