import { describe, expect, it } from "vitest";
import {
  whatsappConversationNeedsAttention,
  whatsappSendBoundary,
  whatsappStatusTone,
} from "@/lib/whatsappInbox";

describe("WhatsApp Business inbox safety", () => {
  it("flags unread and unreviewed conversations for owner attention", () => {
    expect(whatsappConversationNeedsAttention({ unreadCount: 2, status: "open", qualificationStatus: "qualified" })).toBe(true);
    expect(whatsappConversationNeedsAttention({ unreadCount: 0, status: "open", qualificationStatus: "unreviewed" })).toBe(true);
    expect(whatsappConversationNeedsAttention({ unreadCount: 0, status: "closed", qualificationStatus: "qualified" })).toBe(false);
  });

  it("blocks outbound sends until Business Rules are approved", () => {
    const result = whatsappSendBoundary({
      rulesApproved: false,
      optInStatus: "inbound_contact",
      messageType: "text",
      lastInboundAt: "2026-07-12T10:00:00.000Z",
      customerServiceWindowHours: 24,
      commercialCommitment: false,
      now: new Date("2026-07-12T12:00:00.000Z").getTime(),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Business Rules");
  });

  it("blocks opted-out and commercially committing messages", () => {
    expect(whatsappSendBoundary({
      rulesApproved: true,
      optInStatus: "opted_out",
      messageType: "template",
      commercialCommitment: false,
    }).allowed).toBe(false);

    expect(whatsappSendBoundary({
      rulesApproved: true,
      optInStatus: "opted_in",
      messageType: "template",
      commercialCommitment: true,
    }).reason).toContain("Commercial commitment");
  });

  it("requires a template outside the configured service window", () => {
    const result = whatsappSendBoundary({
      rulesApproved: true,
      optInStatus: "inbound_contact",
      messageType: "text",
      lastInboundAt: "2026-07-10T10:00:00.000Z",
      customerServiceWindowHours: 24,
      commercialCommitment: false,
      now: new Date("2026-07-12T12:00:00.000Z").getTime(),
    });
    expect(result.allowed).toBe(false);
    expect(result.templateRequired).toBe(true);
  });

  it("allows a reviewed text only inside the service window", () => {
    const result = whatsappSendBoundary({
      rulesApproved: true,
      optInStatus: "inbound_contact",
      messageType: "text",
      lastInboundAt: "2026-07-12T10:00:00.000Z",
      customerServiceWindowHours: 24,
      commercialCommitment: false,
      now: new Date("2026-07-12T12:00:00.000Z").getTime(),
    });
    expect(result.allowed).toBe(true);
  });

  it("keeps failed, pending and delivered states visually distinct", () => {
    expect(whatsappStatusTone("failed")).toBe("error");
    expect(whatsappStatusTone("draft")).toBe("attention");
    expect(whatsappStatusTone("delivered")).toBe("ok");
  });
});
