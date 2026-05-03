import { Request, Response, NextFunction } from "express";
import * as moderationService from "./moderation.service";
import { ReportSchema } from "./moderation.service";

export async function blockUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await moderationService.blockUser(req.user!.sub, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function reportUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason, details } = ReportSchema.parse(req.body);
    const data = await moderationService.reportUser(req.user!.sub, req.params.id, reason, details);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}
