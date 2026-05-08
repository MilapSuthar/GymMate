import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../lib/errors";

export function roleGuard(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }
    next();
  };
}
