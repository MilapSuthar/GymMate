import { Router } from "express";
import { authGuard } from "../../middleware/authGuard";
import { defaultLimiter } from "../../middleware/rateLimit";
import { getDiscoveryFeedHandler } from "./discovery.controller";

const router = Router();

router.use(authGuard, defaultLimiter);
router.get("/", getDiscoveryFeedHandler);

export default router;
