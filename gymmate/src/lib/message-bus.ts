import { EventEmitter } from "events";

/**
 * In-process pub/sub for chat SSE.
 *
 * Each connected client subscribes to events for a single matchId. When a
 * POST /api/messages/[matchId] writes a row, it `publish`es to that matchId
 * and every subscriber on this Node process receives it.
 *
 * **Limitation:** this is per-process. With multiple Next.js instances behind
 * a load balancer, a publish on instance A is NOT visible to subscribers on
 * instance B. For prod, swap the EventEmitter for Redis pub/sub (the
 * publish/subscribe API stays identical — only this file changes).
 *
 * The 100-listener cap raises Node's default warning threshold; chat can
 * legitimately have many subscribers per match if the same user has multiple
 * tabs open.
 */
export interface ChatEvent {
  type: "message" | "read";
  matchId: string;
  // For "message": the new message payload. For "read": the userId that
  // just marked things as read so the sender's UI can update receipts.
  message?: {
    id: string;
    matchId: string;
    senderId: string;
    content: string;
    createdAt: string;
    readAt: string | null;
  };
  readerId?: string;
}

type Handler = (event: ChatEvent) => void;

const globalForBus = globalThis as unknown as { __chatBus?: EventEmitter };
const bus =
  globalForBus.__chatBus ??
  ((): EventEmitter => {
    const e = new EventEmitter();
    e.setMaxListeners(100);
    return e;
  })();
if (process.env.NODE_ENV !== "production") globalForBus.__chatBus = bus;

export function subscribe(matchId: string, handler: Handler): () => void {
  bus.on(matchId, handler);
  return () => bus.off(matchId, handler);
}

export function publish(matchId: string, event: ChatEvent): void {
  bus.emit(matchId, event);
}
