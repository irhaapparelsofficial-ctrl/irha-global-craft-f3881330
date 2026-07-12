import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const OWNER_SUPABASE_PROJECT_ID = "pvzjiozismyxqrzmtfbi";
const configuredProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!configuredProjectId || !supabaseUrl || !supabasePublishableKey) {
  throw new Error("Supabase runtime configuration is incomplete.");
}

let urlProjectId = "";
try {
  urlProjectId = new URL(supabaseUrl).hostname.split(".")[0] ?? "";
} catch {
  throw new Error("Supabase runtime URL is invalid.");
}

if (configuredProjectId !== urlProjectId) {
  throw new Error("Supabase runtime identity mismatch: project ID and URL do not match.");
}

if (configuredProjectId !== OWNER_SUPABASE_PROJECT_ID) {
  throw new Error("Blocked non-owner Supabase runtime. Use the verified Irha Apparels owner project.");
}

export const supabaseProjectId = configuredProjectId;
export const supabaseRuntimeUrl = supabaseUrl;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    experimental: { passkey: true },
  },
});
