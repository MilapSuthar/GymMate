import { Request, Response, NextFunction } from "express";
import * as photosService from "./photos.service";

export async function uploadPhotoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "No file uploaded" } });
    const data = await photosService.uploadPhoto(req.user!.sub, req.file);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getPresignedUrlHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { filename, contentType } = req.body as { filename: string; contentType: string };
    const data = await photosService.getPresignedUploadUrl(req.user!.sub, filename, contentType);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
