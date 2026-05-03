import { Router } from "express";
import { authGuard } from "../../middleware/authGuard";
import { defaultLimiter } from "../../middleware/rateLimit";
import { getMatchesHandler, getMatchHandler } from "./matches.controller";

const router = Router();

router.use(authGuard, defaultLimiter);
router.get("/", getMatchesHandler);
router.get("/:id", getMatchHandler);

export default router;
