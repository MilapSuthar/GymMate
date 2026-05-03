import { z } from "zod";

export const MatchQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type MatchQueryInput = z.infer<typeof MatchQuerySchema>;
