import { Router } from "express";
import { authGuard } from "../../middleware/authGuard";
import { swipeLimiter } from "../../middleware/rateLimit";
import { swipeHandler } from "./swipes.controller";

const router = Router();

router.use(authGuard, swipeLimiter);
router.post("/", swipeHandler);

export default router;
