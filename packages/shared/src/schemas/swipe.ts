import { z } from "zod";

export const SwipeSchema = z.object({
  swipedId: z.string().uuid(),
  direction: z.enum(["like", "pass"]),
});

export type SwipeInput = z.infer<typeof SwipeSchema>;
