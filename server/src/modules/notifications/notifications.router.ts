import { Router } from "express";
import { authGuard } from "../../middleware/authGuard";
import { defaultLimiter } from "../../middleware/rateLimit";
import { registerTokenHandler, unregisterTokenHandler } from "./notifications.controller";

const router = Router();

router.use(authGuard, defaultLimiter);
router.post("/", registerTokenHandler);
router.delete("/:token", unregisterTokenHandler);

export default router;
