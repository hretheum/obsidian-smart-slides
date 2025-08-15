export type ProgressPhase =
  | 'idle'
  | 'analysis'
  | 'layout'
  | 'style'
  | 'compose'
  | 'quality'
  | 'finalize';

export interface ProgressUpdate {
  readonly percent: number; // 0..100
  readonly phase: ProgressPhase;
  readonly message: string;
  readonly etaMs?: number;
}

export type ProgressListener = (update: ProgressUpdate) => void;

/**
 * ProgressController centralizes progress reporting, ETA estimation and cancellation.
 */
export class ProgressController {
  private listeners: Set<ProgressListener> = new Set();
  private startTimeMs: number | null = null;
  private lastPercent = 0;
  private cancelledFlag = false;

  start(): void {
    this.startTimeMs = Date.now();
    this.lastPercent = 0;
    this.cancelledFlag = false;
    this.emit({ percent: 0, phase: 'idle', message: 'Starting…' });
  }

  cancel(): void {
    this.cancelledFlag = true;
    this.emit({ percent: this.lastPercent, phase: 'finalize', message: 'Cancelling…' });
  }

  get cancelled(): boolean {
    return this.cancelledFlag;
  }

  on(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(partial: Omit<ProgressUpdate, 'etaMs'>): void {
    const etaMs = this.estimateEtaMs(partial.percent);
    this.lastPercent = Math.max(0, Math.min(100, partial.percent));
    this.emit({ ...partial, etaMs, percent: this.lastPercent });
  }

  private estimateEtaMs(percent: number): number | undefined {
    if (this.startTimeMs == null) return undefined;
    const clamped = Math.max(0.0001, Math.min(99.9999, percent));
    const elapsed = Date.now() - this.startTimeMs;
    const totalEstimate = (elapsed / clamped) * 100;
    const remaining = Math.max(0, totalEstimate - elapsed);
    return Number.isFinite(remaining) ? Math.round(remaining) : undefined;
  }

  private emit(update: ProgressUpdate): void {
    for (const listener of this.listeners) {
      try {
        listener(update);
      } catch {
        // Ignore listener errors to keep UI resilient
      }
    }
  }
}
