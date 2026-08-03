import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const app = read("src/App.tsx");
const tracker = read("src/components/SiteVisitorTracker.tsx");
const visitorFunction = read("supabase/functions/site-visitor/index.ts");
const migration = read("supabase/migrations/20260717161000_realtime_site_visitor_alerts.sql");
const dashboard = read("src/pages/AdminVisitors.tsx");
const pulse = read("src/components/admin/AdminVisitorPulse.tsx");
const runtime = read("src/components/admin/AdminRuntime.tsx");
const pushSetup = read("src/components/admin/AdminPushNotificationSetup.tsx");
const pushWorker = read("public/irha-owner-sw.js");
const privacy = read("src/pages/PrivacyPolicy.tsx");
const config = read("supabase/config.toml");

describe("realtime website visitor country alerts", () => {
  it("mounts a buyer-safe tracker and a private admin visitor route", () => {
    expect(app).toContain("<SiteVisitorTracker />");
    expect(app).toContain('path="/admin/visitors"');
    expect(tracker).toContain('/api/visitor-context');
    expect(tracker).toContain('/functions/v1/site-visitor');
    expect(tracker).toContain('pathname.startsWith("/admin")');
    expect(tracker).toContain('action: "arrive"');
    expect(tracker).toContain('report("chat_open"');
  });

  it("uses coarse edge geography, suppresses bots and never persists a raw IP", () => {
    expect(visitorFunction).toContain('"cf-ipcountry"');
    expect(visitorFunction).toContain("isLikelyBot");
    expect(visitorFunction).toContain('geo_source');
    expect(visitorFunction).toContain('notification-dispatcher');
    expect(visitorFunction).not.toMatch(/(ip_address|raw_ip|visitor_ip)\s*:/);
    expect(migration).not.toMatch(/\b(ip_address|raw_ip|visitor_ip)\b/i);
  });

  it("stores admin-only realtime presence and queues one push per new session", () => {
    expect(migration).toContain("create table if not exists public.site_visitors");
    expect(migration).toContain("site_visitors_admin_read");
    expect(migration).toContain("alter publication supabase_realtime add table public.site_visitors");
    expect(migration).toContain("crm_notifications_site_visitor_outbox");
    expect(migration).toContain("'web_push'");
    expect(migration).toContain("'push:' || _event_key");
    expect(migration).not.toContain("'email-owner:' || _event_key");
    expect(migration).toContain("90 days");
  });

  it("ships a responsive country, source, page and device dashboard", () => {
    expect(dashboard).toContain("Website Visitors");
    expect(dashboard).toContain("Buyer geography");
    expect(dashboard).toContain("countryFlag");
    expect(dashboard).toContain("referrer_host");
    expect(dashboard).toContain("device_type");
    expect(dashboard).toContain('table: "site_visitors"');
    expect(dashboard).toContain("grid grid-cols-2");
    expect(runtime).toContain("<AdminVisitorPulse />");
  });

  it("uses the deduplicated CRM arrival record for admin-wide realtime and unread visibility", () => {
    expect(pulse).toContain('from("crm_notifications")');
    expect(pulse).toContain('channel: "site_visitor", event: "arrival"');
    expect(pulse).toContain('.eq("status", "unread")');
    expect(pulse).toContain('table: "crm_notifications"');
    expect(pulse).toContain("New website visitor");
    expect(pulse).toContain("Visitor alerts");
    expect(pulse).toContain("unreadCount");
    expect(pulse).toContain("ToastAction");
    expect(pulse).toContain('/admin/visitors?visitor=');
    expect(pulse).not.toContain('path.startsWith("/admin/visitors")');
    expect(pulse).not.toContain('path.startsWith("/admin/live-chat")');
  });

  it("verifies the exact current device before declaring background alerts active", () => {
    expect(pushSetup).toContain('from("owner_push_subscriptions")');
    expect(pushSetup).toContain('.eq("endpoint", localSubscription.endpoint)');
    expect(pushSetup).toContain('updateViaCache: "none"');
    expect(pushSetup).toContain('"ACTIVE"');
    expect(pushSetup).toContain('"NEEDS SETUP"');
    expect(pushSetup).toContain('"BLOCKED BY BROWSER"');
    expect(pushSetup).toContain('"INSTALL ADMIN TO HOME SCREEN"');
    expect(pushSetup).toContain("Reconnect alerts");
    expect(pushSetup).toContain("this exact device subscription");
  });

  it("reuses the production Web Push channel and keeps visitor pushes visibly presented", () => {
    expect(config).toContain("[functions.site-visitor]");
    expect(config).toMatch(/\[functions\.site-visitor\][\s\S]*?verify_jwt = false/);
    expect(pushSetup).toMatch(/visitor/i);
    expect(pushSetup).toContain('navigator.serviceWorker.register("/irha-owner-sw.js"');
    expect(pushSetup).toContain("Add to Home Screen");
    expect(pushWorker).toContain('self.addEventListener("push"');
    expect(pushWorker).toContain("showNotification");
    expect(pushWorker).toContain('payload.kind === "site_visitor"');
    expect(pushWorker).toContain('self.addEventListener("notificationclick"');
    expect(pushWorker).toContain("client.navigate(target)");
  });

  it("publishes an explicit privacy and accuracy disclosure", () => {
    expect(privacy).toContain("approximate country");
    expect(privacy).toContain("does not store your raw IP address");
    expect(privacy).toContain("VPN, proxy");
    expect(privacy).toContain("90 days");
  });
});
