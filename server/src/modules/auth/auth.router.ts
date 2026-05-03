import { Router } from "express";
import { authLimiter } from "../../middleware/rateLimit";
import { authGuard } from "../../middleware/authGuard";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  googleOAuthHandler,
} from "./auth.controller";

const router = Router();

router.post("/register", authLimiter, registerHandler);
router.post("/login", authLimiter, loginHandler);
router.post("/refresh", authLimiter, refreshHandler);
router.post("/logout", authGuard, logoutHandler);
router.post("/oauth/google", authLimiter, googleOAuthHandler);

export default router;
