/**
 * Token store backed by Redis when REDIS_URL is set, otherwise an in-memory
 * Map (dev fallback so the server runs without a Redis instance).
 */
import Redis from "ioredis";

interface TokenStore {
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  isRedis(): boolean;
}

class RedisStore implements TokenStore {
  constructor(private client: Redis) {}
  async set(key: string, value: string, ttl: number) {
    await this.client.set(key, value, "EX", ttl);
  }
  async get(key: string) {
    return this.client.get(key);
  }
  async del(key: string) {
    await this.client.del(key);
  }
  isRedis() {
    return true;
  }
}

class MemoryStore implements TokenStore {
  private map = new Map<string, { value: string; expiresAt: number }>();
  async set(key: string, value: string, ttl: number) {
    this.map.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  }
  async get(key: string) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }
  async del(key: string) {
    this.map.delete(key);
  }
  isRedis() {
    return false;
  }
}

let store: TokenStore | null = null;

export function getTokenStore(): TokenStore {
  if (store) return store;
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1 });
      client.on("error", () => {
        // swallow connection errors at runtime; Next.js will surface usage errors
      });
      store = new RedisStore(client);
      return store;
    } catch {
      // fall through to memory
    }
  }
  store = new MemoryStore();
  return store;
}
