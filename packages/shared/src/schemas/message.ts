import { z } from "zod";

export const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  mediaUrl: z.string().url().optional(),
  messageType: z.enum(["text", "image", "gif"]).default("text"),
}).refine((d) => d.content || d.mediaUrl, {
  message: "Either content or mediaUrl is required",
});

export const MessageQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type MessageQueryInput = z.infer<typeof MessageQuerySchema>;
