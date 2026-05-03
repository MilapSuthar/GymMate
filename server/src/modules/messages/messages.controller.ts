import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as messagesService from "./messages.service";

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  mediaUrl: z.string().url().optional(),
  messageType: z.enum(["text", "image", "gif"]).default("text"),
}).refine((d) => d.content || d.mediaUrl, { message: "content or mediaUrl required" });

const QuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function getMessagesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { cursor, limit } = QuerySchema.parse(req.query);
    const data = await messagesService.getMessages(req.user!.sub, req.params.matchId, cursor, limit);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function sendMessageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, mediaUrl, messageType } = SendMessageSchema.parse(req.body);
    const data = await messagesService.sendMessage(req.user!.sub, req.params.matchId, content, mediaUrl, messageType);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}
