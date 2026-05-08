import { z } from "zod";
import { FitnessLevel, Goal } from "../constants/fitnessLevels";

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gymName: z.string().max(100).optional(),
  goals: z.array(z.nativeEnum(Goal)).optional(),
  fitnessLevel: z.nativeEnum(FitnessLevel).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
