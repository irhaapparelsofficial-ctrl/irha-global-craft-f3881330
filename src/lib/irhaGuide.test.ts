import { describe, expect, it } from "vitest";
import {
  fallbackGuideReply,
  isGuideReplyDuplicate,
  isIncompleteGuideFragment,
  parseStoredGuideMessages,
  redactGuideMessageForSession,
  shouldSendGuideOnEnter,
} from "./irhaGuide";

describe("Irha Guide verified fallback", () => {
  it("returns distinct useful replies for private label and MOQ", () => {
    const privateLabel = fallbackGuideReply("Do you offer private label?");
    const moq = fallbackGuideReply("MOQ?");

    expect(privateLabel).toContain("Private-label");
    expect(privateLabel).toContain("custom labels");
    expect(moq).toContain("MOQ is confirmed");
    expect(privateLabel).not.toBe(moq);
  });

  it("asks visitors to complete accidental short fragments", () => {
    expect(isIncompleteGuideFragment("Hu")).toBe(true);
    expect(isIncompleteGuideFragment("Do")).toBe(true);
    expect(fallbackGuideReply("Hu")).toContain("complete your question");
  });

  it("mirrors German for a sampling question", () => {
    const reply = fallbackGuideReply("Wie funktioniert ein Muster?");
    expect(reply).toContain("Musterprozess");
    expect(reply).toContain("Tech-Pack");
  });

  it("keeps greeting and branding responses specific", () => {
    expect(fallbackGuideReply("Hello")).toContain("Which product are you reviewing?");
    expect(fallbackGuideReply("Can you add woven labels and embroidery?")).toContain("woven labels");
  });

  it("detects repeated assistant answers and changes the next fallback", () => {
    const first = fallbackGuideReply("How much will it cost?");
    expect(isGuideReplyDuplicate(first, [first])).toBe(true);

    const next = fallbackGuideReply("What about price?", [first]);
    expect(next).not.toBe(first);
    expect(next).toContain("next step");
  });
});

describe("Irha Guide input and session safety", () => {
  it("sends Enter on desktop but not on mobile", () => {
    expect(shouldSendGuideOnEnter({ key: "Enter", shiftKey: false, isMobile: false, text: "MOQ?" })).toBe(true);
    expect(shouldSendGuideOnEnter({ key: "Enter", shiftKey: false, isMobile: true, text: "MOQ?" })).toBe(false);
    expect(shouldSendGuideOnEnter({ key: "Enter", shiftKey: true, isMobile: false, text: "MOQ?" })).toBe(false);
  });

  it("redacts personal contact details before session persistence", () => {
    const redacted = redactGuideMessageForSession("Email buyer@example.com or call +92 300 1234567");
    expect(redacted).toContain("[email hidden]");
    expect(redacted).toContain("[phone hidden]");
    expect(redacted).not.toContain("buyer@example.com");
  });

  it("restores only valid bounded messages", () => {
    const restored = parseStoredGuideMessages(JSON.stringify([
      { id: "1", role: "assistant", content: "Hello", provider: "idle" },
      { id: "2", role: "user", content: "MOQ?" },
      { id: "3", role: "system", content: "invalid" },
      { id: "4", role: "assistant", content: "" },
    ]));

    expect(restored).toHaveLength(2);
    expect(restored.map((message) => message.role)).toEqual(["assistant", "user"]);
  });
});
