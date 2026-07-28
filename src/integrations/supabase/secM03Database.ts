import type { Database as GeneratedDatabase } from "./types";

// Generated from the live pvzjiozismyxqrzmtfbi public schema after
// 20260728110000 and 20260728171500. The private limiter tables remain
// intentionally absent from browser-facing application types.
type SecM03Functions = {
  cleanup_edge_rate_limit_state: {
    Args: { p_max_rows?: number };
    Returns: {
      metric_rows_deleted: number;
      state_rows_deleted: number;
    }[];
  };
  consume_edge_rate_limit: {
    Args: {
      p_cost?: number;
      p_duplicate_hash?: string;
      p_now?: string;
      p_policy_key: string;
      p_resource_hash: string;
      p_subject_hash: string;
    };
    Returns: {
      blocked_until: string;
      burst_count: number;
      burst_limit: number;
      decision: string;
      duplicate_suppressed: boolean;
      policy_key: string;
      privacy_sample: boolean;
      remaining: number;
      retry_after_seconds: number;
      sustained_count: number;
      sustained_limit: number;
    }[];
  };
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Functions"> & {
    Functions: GeneratedDatabase["public"]["Functions"] & SecM03Functions;
  };
};
