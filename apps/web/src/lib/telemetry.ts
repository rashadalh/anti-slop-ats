import { TELEMETRY_FLUSH_MS } from "@anti-slop/scorer";
import type { TelemetryEvent } from "./types.ts";

export class TelemetryCollector {
  private readonly started = performance.now();
  private events: TelemetryEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private onFlush: ((events: TelemetryEvent[]) => Promise<void>) | null = null;

  tMs(): number {
    return Math.max(0, Math.round(performance.now() - this.started));
  }

  startFlush(onFlush: (events: TelemetryEvent[]) => Promise<void>): void {
    this.onFlush = onFlush;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, TELEMETRY_FLUSH_MS);
  }

  stop(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
  }

  private push(partial: Omit<TelemetryEvent, "t_ms">): void {
    this.events.push({ ...partial, t_ms: this.tMs() });
  }

  recordFocus(field: string): void {
    this.push({ type: "focus", field, section: null, input_len: null, paste_len: null });
  }

  recordBlur(field: string, inputLen: number): void {
    this.push({
      type: "blur",
      field,
      section: null,
      input_len: inputLen,
      paste_len: null,
    });
  }

  recordInput(field: string, inputLen: number): void {
    this.push({
      type: "input",
      field,
      section: null,
      input_len: inputLen,
      paste_len: null,
    });
  }

  recordPaste(field: string, pasteLen: number, inputLen: number): void {
    this.push({
      type: "paste",
      field,
      section: null,
      input_len: inputLen,
      paste_len: pasteLen,
    });
  }

  recordSectionChange(section: string): void {
    this.push({
      type: "section_change",
      field: null,
      section,
      input_len: null,
      paste_len: null,
    });
  }

  recordSubmit(): void {
    this.push({
      type: "submit",
      field: null,
      section: null,
      input_len: null,
      paste_len: null,
    });
  }

  drain(): TelemetryEvent[] {
    const copy = [...this.events];
    this.events = [];
    return copy;
  }

  async flush(): Promise<void> {
    if (!this.onFlush || this.events.length === 0) return;
    const batch = this.drain();
    await this.onFlush(batch);
  }

  async flushFinal(): Promise<TelemetryEvent[]> {
    this.recordSubmit();
    const batch = this.drain();
    if (this.onFlush && batch.length) await this.onFlush(batch);
    return batch;
  }
}
