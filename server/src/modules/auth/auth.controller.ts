import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";
import { RegisterSchema, LoginSchema, RefreshTokenSchema, GoogleOAuthSchema } from "./auth.schemas";

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RegisterSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.user!.sub);
    res.json({ success: true, data: { message: "Logged out" } });
  } catch (err) {
    next(err);
  }
}

export async function googleOAuthHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = GoogleOAuthSchema.parse(req.body);
    const result = await authService.googleOAuth(input);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
