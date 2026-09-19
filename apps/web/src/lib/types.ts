import type {
  Job,
  TelemetryEvent,
  ClientSignals,
  AnswerMap,
  Detection,
  ReplayPackId,
} from "@anti-slop/scorer";

export type {
  Job,
  Field,
  Section,
  TelemetryEvent,
  ClientSignals,
  AnswerMap,
  Detection,
  ReplayPackId,
} from "@anti-slop/scorer";

export interface BackendPort {
  listJobs(): Job[];
  getJob(slug: string): Job | null;
  createSession(
    job_id: string,
    signals: ClientSignals,
    ip: string,
  ): Promise<{ session_id: string }>;
  ingestTelemetry(
    session_id: string,
    events: TelemetryEvent[],
  ): Promise<{ accepted: number }>;
  submitApplication(
    session_id: string,
    answers: AnswerMap,
    signals: ClientSignals,
  ): Promise<Detection>;
  listDetections(): Detection[];
  overrideLabel(id: string, label: 0 | 1): Promise<Detection>;
  replayPack(id: ReplayPackId): Promise<Detection>;
  subscribeDetections(cb: (d: Detection) => void): () => void;
}
