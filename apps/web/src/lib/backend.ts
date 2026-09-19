import type { BackendPort } from "./types.ts";
import { localBackend } from "./localBackend.ts";
import { supabaseBackend } from "./supabaseBackend.ts";

export function selectBackend(): BackendPort {
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const key = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  if (url && key) return supabaseBackend;
  return localBackend;
}

export { localBackend } from "./localBackend.ts";
