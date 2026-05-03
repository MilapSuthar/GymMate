import { Request, Response, NextFunction } from "express";
import * as matchesService from "./matches.service";

export async function getMatchesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.getMatches(req.user!.sub);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getMatchHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.getMatch(req.user!.sub, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
