import { Router } from "express";
import multer from "multer";
import { authGuard } from "../../middleware/authGuard";
import { defaultLimiter } from "../../middleware/rateLimit";
import { uploadPhotoHandler, getPresignedUrlHandler } from "./photos.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.use(authGuard, defaultLimiter);
router.post("/", upload.single("photo"), uploadPhotoHandler);
router.post("/presigned", getPresignedUrlHandler);

export default router;
