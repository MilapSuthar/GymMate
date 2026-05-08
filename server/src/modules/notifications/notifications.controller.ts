import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as notificationsService from "./notifications.service";

const RegisterTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

export async function registerTokenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, platform } = RegisterTokenSchema.parse(req.body);
    await notificationsService.registerDeviceToken(req.user!.sub, token, platform);
    res.status(201).json({ success: true, data: { registered: true } });
  } catch (err) { next(err); }
}

export async function unregisterTokenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationsService.unregisterDeviceToken(req.user!.sub, req.params.token);
    res.json({ success: true, data: { unregistered: true } });
  } catch (err) { next(err); }
}
