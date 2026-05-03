import { Request, Response, NextFunction } from "express";
import * as discoveryService from "./discovery.service";
import { z } from "zod";

const DiscoveryQuerySchema = z.object({
  radius_km: z.coerce.number().min(1).max(100).default(25),
  limit: z.coerce.number().min(1).max(50).default(20),
  fitness_levels: z.string().transform((v) => v.split(",")).optional(),
});

export async function getDiscoveryFeedHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { radius_km, limit, fitness_levels } = DiscoveryQuerySchema.parse(req.query);
    const data = await discoveryService.getDiscoveryFeed({
      userId: req.user!.sub,
      radiusKm: radius_km,
      limit,
      fitnessLevels: fitness_levels,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
