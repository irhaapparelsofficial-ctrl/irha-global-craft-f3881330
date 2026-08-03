import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const visitors = readFileSync("src/pages/AdminVisitors.tsx", "utf8");
const chat = readFileSync("src/pages/AdminLiveChatPro.tsx", "utf8");
const alertTray = readFileSync("src/components/admin/AdminLiveChatNotification.tsx", "utf8");
const pushSetup = readFileSync("src/components/admin/AdminPushNotificationSetup.tsx", "utf8");
const visitorPulse = readFileSync("src/components/admin/AdminVisitorPulse.tsx", "utf8");
const chatLauncher = readFileSync("src/components/admin/AdminLiveChatLauncher.tsx", "utf8");

describe("mobile owner workspace contract", () => {
  it("keeps device health and missed visitor activity compact but persistent", () => {
    expect(pushSetup).toContain("Alerts on this device");
    expect(pushSetup).toContain('"ACTIVE"');
    expect(pushSetup).toContain('"INSTALL ADMIN TO HOME SCREEN"');
    expect(pushSetup).toContain("max-w-sm");
    expect(visitorPulse).toContain("if (!authorized || unreadCount === 0 || !latestUnread) return null");
    expect(visitorPulse).toContain("Visitor alerts");
    expect(visitorPulse).toContain("max-w-[calc(100vw-6rem)]");
    expect(chatLauncher).toContain("hidden min-h-12");
  });

  it("keeps the owner alert tray compact and off dedicated visitor/chat screens", () => {
    expect(alertTray).toContain("const dedicatedWorkspace = pathname.startsWith(\"/admin/live-chat\") || pathname.startsWith(\"/admin/visitors\")");
    expect(alertTray).toContain("setExpandedKey(null), 8_000");
    expect(alertTray).toContain("Owner inbox");
    expect(alertTray).not.toContain("Owner attention required");
  });

  it("renders visitor intelligence as compact mobile controls and a direct chat action", () => {
    expect(visitors).toContain("grid grid-cols-2 gap-2.5 xl:grid-cols-4");
    expect(visitors).toContain("Search country, page or source");
    expect(visitors).toContain("Open chat inbox");
    expect(visitors).toContain("pb-[calc(6.5rem+env(safe-area-inset-bottom))]");
  });

  it("uses a mobile master-detail chat inbox with realtime updates and owner actions", () => {
    expect(chat).toContain("type MobileView = \"list\" | \"conversation\"");
    expect(chat).toContain("setMobileView(\"conversation\")");
    expect(chat).toContain("setMobileView(\"list\")");
    expect(chat).toContain("admin-live-chat-console");
    expect(chat).toContain("table: \"chat_sessions\"");
    expect(chat).toContain("table: \"chat_messages\"");
    expect(chat).toContain("const QUICK_REPLIES");
    expect(chat).toContain("Take");
    expect(chat).toContain("hasUnread");
    expect(chat).toContain("markConversationSeen");
    expect(chat).toContain("Customer is typing · live preview");
  });
});
