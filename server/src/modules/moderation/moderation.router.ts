import { Router } from "express";
import { authGuard } from "../../middleware/authGuard";
import { defaultLimiter } from "../../middleware/rateLimit";
import { blockUserHandler, reportUserHandler } from "./moderation.controller";

const router = Router();

router.use(authGuard, defaultLimiter);
router.post("/:id/block", blockUserHandler);
router.post("/:id/report", reportUserHandler);

export default router;
