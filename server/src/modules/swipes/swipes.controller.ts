import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as swipesService from "./swipes.service";

const SwipeSchema = z.object({
  swipedId: z.string().uuid(),
  direction: z.enum(["like", "pass"]),
});

export async function swipeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { swipedId, direction } = SwipeSchema.parse(req.body);
    const data = await swipesService.recordSwipe(req.user!.sub, swipedId, direction);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
