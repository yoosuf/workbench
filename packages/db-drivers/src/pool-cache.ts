import { ConnectionConfig } from './types';

interface PoolCacheOptions<TPool> {
  create: (config: ConnectionConfig) => Promise<TPool>;
  destroy: (pool: TPool) => Promise<void>;
  idleTimeoutMs?: number;
}

interface CacheEntry<TPool> {
  pool: TPool;
  lastUsed: number;
}

/**
 * Caches long-lived connection pools keyed by target connection identity, so repeated
 * driver calls against the same saved connection (e.g. browsing many tables in a schema)
 * reuse one warm pool instead of paying a fresh TCP+auth handshake per call.
 */
export class PoolCache<TPool> {
  private entries = new Map<string, CacheEntry<TPool>>();
  private pending = new Map<string, Promise<TPool>>();
  private readonly idleTimeoutMs: number;
  private readonly sweepTimer: ReturnType<typeof setInterval>;

  constructor(private readonly options: PoolCacheOptions<TPool>) {
    this.idleTimeoutMs = options.idleTimeoutMs ?? 10 * 60 * 1000;
    this.sweepTimer = setInterval(() => void this.sweepIdle(), 60 * 1000);
    this.sweepTimer.unref?.();
  }

  private key(config: ConnectionConfig): string {
    return JSON.stringify({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      ssl: config.ssl ?? null,
    });
  }

  async get(config: ConnectionConfig): Promise<TPool> {
    const key = this.key(config);
    const existing = this.entries.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.pool;
    }

    const pending = this.pending.get(key);
    if (pending) return pending;

    const creation = this.options
      .create(config)
      .then((pool) => {
        this.entries.set(key, { pool, lastUsed: Date.now() });
        this.pending.delete(key);
        return pool;
      })
      .catch((err) => {
        this.pending.delete(key);
        throw err;
      });
    this.pending.set(key, creation);
    return creation;
  }

  /** Drop a broken pool from the cache so the next `get()` creates a fresh one. */
  async evict(config: ConnectionConfig): Promise<void> {
    const key = this.key(config);
    const existing = this.entries.get(key);
    if (existing) {
      this.entries.delete(key);
      await this.options.destroy(existing.pool).catch(() => {});
    }
  }

  async closeAll(): Promise<void> {
    clearInterval(this.sweepTimer);
    const pools = Array.from(this.entries.values()).map((e) => e.pool);
    this.entries.clear();
    await Promise.all(pools.map((pool) => this.options.destroy(pool).catch(() => {})));
  }

  private async sweepIdle(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now - entry.lastUsed > this.idleTimeoutMs) {
        this.entries.delete(key);
        await this.options.destroy(entry.pool).catch(() => {});
      }
    }
  }
}
