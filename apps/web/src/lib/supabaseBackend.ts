import type { BackendPort } from "./types.ts";

export const supabaseBackend: BackendPort = {
  listJobs: () => [],
  getJob: () => null,
  createSession: async () => ({ session_id: "" }),
  ingestTelemetry: async () => ({ accepted: 0 }),
  submitApplication: async () => {
    throw new Error("not implemented");
  },
  listDetections: () => [],
  overrideLabel: async () => {
    throw new Error("not implemented");
  },
  replayPack: async () => {
    throw new Error("not implemented");
  },
  subscribeDetections: () => () => {},
};
