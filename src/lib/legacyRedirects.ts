// Legacy redirect resolver — PR #3.
//
// Two sources feed the resolver:
//   1. `STATIC_LEGACY_REDIRECTS` — hand-curated, high-confidence 301s.
//   2. `legacy_route_redirects` / public redirect RPC — DB-managed mappings
//      used by the buyer-ready redirect generator.
//
// Rules:
//   - No guessing: entries with `confidence !== 'auto'` require review.
//   - Every public SEO target must resolve to a currently-approved route.
//   - Loops, self-redirects and avoidable chains are rejected by tests/build.

export type LegacyRedirectConfidence = "auto" | "review";

export type LegacyRedirectRule = {
  from: string;
  to: string;
  confidence: LegacyRedirectConfidence;
  reason?: string;
};

/**
 * Curated 301 map. Keep aliases pointed directly at final authorities so the
 * browser router, static redirect file and generated DB-backed layer converge.
 */
export const STATIC_LEGACY_REDIRECTS: readonly LegacyRedirectRule[] = [
  { from: "/catalog", to: "/products", confidence: "auto", reason: "direct canonical catalogue entry" },
  { from: "/catalogs/master-catalogue-2026.pdf", to: "/products", confidence: "auto", reason: "retired PDF to current catalogue entry" },
  { from: "/privacy", to: "/privacy-policy", confidence: "auto" },
  { from: "/privacy/", to: "/privacy-policy", confidence: "auto" },
  { from: "/terms", to: "/terms-of-service", confidence: "auto" },
  { from: "/terms/", to: "/terms-of-service", confidence: "auto" },
  { from: "/terms-and-conditions", to: "/terms-of-service", confidence: "auto" },
  { from: "/buyer-trust-center", to: "/buyer-trust", confidence: "auto" },
  { from: "/buyer-trust-centre", to: "/buyer-trust", confidence: "auto" },
  { from: "/buyer-resources", to: "/resources", confidence: "auto" },
  { from: "/buyer-faq", to: "/faq", confidence: "auto" },
  { from: "/germany", to: "/markets/germany", confidence: "auto" },
  { from: "/austria", to: "/markets/austria", confidence: "auto" },
  { from: "/switzerland", to: "/markets/switzerland", confidence: "auto" },
  { from: "/netherlands", to: "/markets/netherlands", confidence: "auto" },
  { from: "/usa", to: "/markets/united-states", confidence: "auto" },
  { from: "/united-states", to: "/markets/united-states", confidence: "auto" },
  { from: "/uk", to: "/markets/united-kingdom", confidence: "auto" },
  { from: "/united-kingdom", to: "/markets/united-kingdom", confidence: "auto" },
  { from: "/canada", to: "/markets/canada", confidence: "auto" },
  { from: "/australia", to: "/markets/australia", confidence: "auto" },
  { from: "/new-zealand", to: "/markets/new-zealand", confidence: "auto" },
  { from: "/sportswear-manufacturer-pakistan", to: "/products/sportswear", confidence: "auto" },
  { from: "/sportswear-manufacturer-sialkot", to: "/products/sportswear", confidence: "auto", reason: "GP-4: consolidate overlapping broad sportswear manufacturer intent into the GP-3 authority" },
  { from: "/leatherwear-manufacturer-pakistan", to: "/products/premium-leather-apparel", confidence: "auto" },
  { from: "/lederhosen-manufacturer", to: "/products/bavarian-trachten-wear", confidence: "auto" },
  { from: "/trachten-manufacturer", to: "/products/bavarian-trachten-wear", confidence: "auto" },
  { from: "/streetwear-manufacturer-pakistan", to: "/products/streetwear-activewear", confidence: "auto" },
  { from: "/login", to: "/auth", confidence: "auto" },
  { from: "/signin", to: "/auth", confidence: "auto" },
  { from: "/sign-in", to: "/auth", confidence: "auto" },
  { from: "/log-in", to: "/auth", confidence: "auto" },
  { from: "/dashboard", to: "/admin", confidence: "auto" },
  { from: "/journal", to: "/blog", confidence: "auto" },
] as const;

export type ResolvedRedirect = { to: string; source: "static" | "db" };

export function resolveStaticRedirect(pathname: string): ResolvedRedirect | null {
  const rule = STATIC_LEGACY_REDIRECTS.find((r) => r.from === pathname);
  if (!rule) return null;
  return { to: rule.to, source: "static" };
}

export function hasLoopOrSelfRedirect(rules: readonly LegacyRedirectRule[]): boolean {
  const map = new Map(rules.map((r) => [r.from, r.to]));
  for (const [from] of map) {
    let cur: string | undefined = map.get(from);
    const seen = new Set<string>([from]);
    let hops = 0;
    while (cur && hops < 8) {
      if (seen.has(cur)) return true;
      seen.add(cur);
      const next = map.get(cur);
      if (!next) break;
      cur = next;
      hops += 1;
    }
  }
  return false;
}
