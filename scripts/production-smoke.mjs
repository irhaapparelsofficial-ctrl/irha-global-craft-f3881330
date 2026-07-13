// Backward-compatible entrypoint.
//
// The production contract now lives in production-smoke-v2.mjs. Keeping a
// single implementation prevents stale release IDs, canonical-host assumptions
// and duplicated network logic from drifting apart.
console.warn("production-smoke.mjs is deprecated; delegating to production-smoke-v2.mjs");
await import("./production-smoke-v2.mjs");
