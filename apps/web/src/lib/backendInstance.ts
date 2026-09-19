import { selectBackend } from "./backend.ts";
import type { BackendPort } from "./types.ts";

let instance: BackendPort | null = null;

export function getBackend(): BackendPort {
  if (!instance) instance = selectBackend();
  return instance;
}
