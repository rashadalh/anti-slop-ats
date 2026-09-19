import type { BackendPort } from "./types.ts";
import { localBackend } from "./localBackend.ts";
import { supabaseBackend } from "./supabaseBackend.ts";

export function isCloudBackend(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL ?? "";
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
  return Boolean(url && key);
}

export function selectBackend(): BackendPort {
  if (isCloudBackend()) return supabaseBackend;
  return localBackend;
}

export { localBackend } from "./localBackend.ts";
