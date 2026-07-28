import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { createIrhaFetch } from "../../lib/inquiryTransportFetch";
import {
  OWNER_SUPABASE_PROJECT_ID,
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "./ownerRuntime";

// Runtime identity is sourced only from the immutable owner file. Lovable-managed
// VITE_SUPABASE_* values are deliberately ignored so an editor sync cannot reconnect
// production to a retired or unintended database.
export const supabaseProjectId = OWNER_SUPABASE_PROJECT_ID;
export const supabaseRuntimeUrl = OWNER_SUPABASE_URL;
export const supabasePublishableKey = OWNER_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(
  supabaseRuntimeUrl,
  supabasePublishableKey,
  {
    global: {
      fetch: createIrhaFetch(supabaseRuntimeUrl),
    },
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      experimental: { passkey: true },
    },
  },
);
