import { beforeEach, describe, expect, it } from "vitest";
import { classifyBuyerInteraction } from "./GlobalInteractionTracker";

describe("buyer interaction classification", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/products/sportswear");
  });

  it("classifies WhatsApp without exposing the phone number", () => {
    document.body.innerHTML = '<a id="target" href="https://wa.me/923001234567?text=hello"><span>Chat</span></a>';
    const target = document.querySelector("span")!;
    const interaction = classifyBuyerInteraction(target);
    expect(interaction?.name).toBe("contact_whatsapp_click");
    expect(JSON.stringify(interaction)).not.toContain("923001234567");
  });

  it("classifies email and phone links without contact values", () => {
    document.body.innerHTML = '<a id="email" href="mailto:buyer@example.com">Email</a><a id="phone" href="tel:+44123456789">Call</a>';
    const email = classifyBuyerInteraction(document.querySelector("#email")!);
    const phone = classifyBuyerInteraction(document.querySelector("#phone")!);
    expect(email?.name).toBe("contact_email_click");
    expect(phone?.name).toBe("contact_phone_click");
    expect(JSON.stringify([email, phone])).not.toMatch(/buyer@example|44123456789/);
  });

  it("separates factory-call requests from general inquiries", () => {
    document.body.innerHTML = '<a id="meeting" href="/inquiry?intent=meeting">Meeting</a><a id="rfq" href="/inquiry?intent=rfq">Quote</a>';
    expect(classifyBuyerInteraction(document.querySelector("#meeting")!)?.name).toBe("begin_factory_call_request");
    expect(classifyBuyerInteraction(document.querySelector("#rfq")!)?.name).toBe("begin_inquiry");
  });

  it("tracks canonical catalogue and spec-sheet destinations", () => {
    document.body.innerHTML = '<a id="catalogue" href="/catalogue/sportswear">Catalogue</a><a id="spec" href="/products/sportswear/team-kit/spec-sheet">Spec</a>';
    const catalogue = classifyBuyerInteraction(document.querySelector("#catalogue")!);
    const spec = classifyBuyerInteraction(document.querySelector("#spec")!);
    expect(catalogue).toEqual({
      name: "select_catalogue_collection",
      parameters: { source_page: "/products/sportswear", destination_path: "/catalogue/sportswear" },
    });
    expect(spec?.name).toBe("view_spec_sheet");
  });

  it("prefers explicit data-track identifiers", () => {
    document.body.innerHTML = '<button data-track="product_compare_toggle"><span>Compare</span></button>';
    const interaction = classifyBuyerInteraction(document.querySelector("span")!);
    expect(interaction).toEqual({
      name: "product_compare_toggle",
      parameters: { source_page: "/products/sportswear", element_type: "button" },
    });
  });
});
