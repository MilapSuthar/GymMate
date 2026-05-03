import { Router } from "express";
import { authGuard } from "../../middleware/authGuard";
import { defaultLimiter } from "../../middleware/rateLimit";
import { getMeHandler, updateMeHandler, getPublicProfileHandler, deletePhotoHandler } from "./users.controller";

const router = Router();

router.use(authGuard, defaultLimiter);

router.get("/me", getMeHandler);
router.put("/me", updateMeHandler);
router.delete("/me/photos/:index", deletePhotoHandler);
router.get("/:id", getPublicProfileHandler);

export default router;
