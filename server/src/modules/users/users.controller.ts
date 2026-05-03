import { Request, Response, NextFunction } from "express";
import * as usersService from "./users.service";
import { UpdateProfileSchema } from "./users.service";

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await usersService.getMe(req.user!.sub);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateProfileSchema.parse(req.body);
    const data = await usersService.updateMe(req.user!.sub, input);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getPublicProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await usersService.getPublicProfile(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deletePhotoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const index = parseInt(req.params.index, 10);
    const data = await usersService.deletePhoto(req.user!.sub, index);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
