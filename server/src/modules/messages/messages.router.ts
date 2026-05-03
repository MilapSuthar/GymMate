import { Router } from "express";
import { authGuard } from "../../middleware/authGuard";
import { defaultLimiter } from "../../middleware/rateLimit";
import { getMessagesHandler, sendMessageHandler } from "./messages.controller";

const router = Router({ mergeParams: true });

router.use(authGuard, defaultLimiter);
router.get("/", getMessagesHandler);
router.post("/", sendMessageHandler);

export default router;
