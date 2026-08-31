import { Injectable, Logger } from '@nestjs/common';

export interface NotificationJob<T = any> {
  id: string;
  type: string;
  payload: T;
  handler: (payload: T) => Promise<void>;
  attempts?: number;
  maxRetries?: number;
  createdAt: number;
}

@Injectable()
export class AsyncNotificationQueue {
  private readonly logger = new Logger(AsyncNotificationQueue.name);
  private queue: NotificationJob[] = [];
  private isProcessing = false;
  private concurrency = 5;
  private activeWorkers = 0;

  enqueue<T>(type: string, payload: T, handler: (payload: T) => Promise<void>): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: NotificationJob<T> = {
      id: jobId,
      type,
      payload,
      handler,
      attempts: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    };

    this.queue.push(job);
    this.logger.log(`Enqueued background notification job [${type}] (${jobId})`);

    // Non-blocking trigger on next tick — processNext() handles its own errors internally
    // and is intentionally not awaited here.
    setImmediate(() => void this.processNext());
    return jobId;
  }

  private async processNext(): Promise<void> {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeWorkers++;

    // Execute asynchronously — every error path below is caught internally, so this is
    // deliberately not awaited (fire-and-forget worker execution).
    void (async () => {
      try {
        job.attempts = (job.attempts || 0) + 1;
        await job.handler(job.payload);
        this.logger.log(`Successfully completed notification job [${job.type}] (${job.id})`);
      } catch (err: any) {
        this.logger.error(`Error processing notification job [${job.type}] (${job.id}): ${err.message}`, err.stack);
        if ((job.attempts || 0) < (job.maxRetries || 3)) {
          this.logger.warn(`Retrying job [${job.type}] (${job.id}) - Attempt ${job.attempts}`);
          this.queue.push(job);
        }
      } finally {
        this.activeWorkers--;
        // Process remaining queue items
        setImmediate(() => void this.processNext());
      }
    })();

    // Fill remaining concurrency slots
    if (this.activeWorkers < this.concurrency && this.queue.length > 0) {
      setImmediate(() => void this.processNext());
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getActiveWorkers(): number {
    return this.activeWorkers;
  }
}
