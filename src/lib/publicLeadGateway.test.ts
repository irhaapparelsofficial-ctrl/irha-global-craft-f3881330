import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  storageFrom: vi.fn(),
  uploadToSignedUrl: vi.fn(),
  directFrom: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    storage: { from: mocks.storageFrom },
    from: mocks.directFrom,
  },
}));

import {
  submitPublicCatalogueLead,
  submitPublicInquiry,
  uploadPublicLeadFile,
} from "@/lib/publicLeadGateway";

describe("public lead gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageFrom.mockReturnValue({ uploadToSignedUrl: mocks.uploadToSignedUrl });
    mocks.uploadToSignedUrl.mockResolvedValue({ error: null });
  });

  it("submits inquiries through the validated Edge Function with a stable corporate reference", async () => {
    mocks.invoke.mockResolvedValue({
      data: { ok: true, reference: "IRHA-2026-000123" },
      error: null,
    });

    const result = await submitPublicInquiry({
      name: "Buyer Test",
      email: "buyer@example.com",
      company: "Buyer Co",
      country: "Germany",
    });

    expect(result).toEqual({ reference: "IRHA-2026-000123" });
    expect(mocks.invoke).toHaveBeenCalledWith(
      "public-lead-gateway",
      expect.objectContaining({
        body: expect.objectContaining({
          action: "submit_inquiry",
          payload: expect.objectContaining({
            name: "Buyer Test",
            email: "buyer@example.com",
            inquiry_ref: expect.stringMatching(/^IRHA-[0-9]{4}-[0-9]{6}$/),
          }),
        }),
      }),
    );
    expect(mocks.directFrom).not.toHaveBeenCalled();
  });

  it("fails honestly instead of attempting an anonymous direct insert when the gateway is missing", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: { message: "Function was not found", context: { status: 404 } },
    });

    await expect(submitPublicInquiry({
      name: "Buyer Test",
      email: "buyer@example.com",
      company: "Buyer Co",
      country: "Germany",
    })).rejects.toThrow("Secure inquiry service is temporarily unavailable");

    expect(mocks.directFrom).not.toHaveBeenCalled();
  });

  it("submits catalogue requests through the same protected gateway", async () => {
    mocks.invoke.mockResolvedValue({
      data: { ok: true, reference: "catalogue-lead-id" },
      error: null,
    });

    const result = await submitPublicCatalogueLead({
      name: "Catalogue Buyer",
      email: "catalogue@example.com",
    });

    expect(result).toEqual({ reference: "catalogue-lead-id" });
    expect(mocks.invoke).toHaveBeenCalledWith(
      "public-lead-gateway",
      {
        body: {
          action: "submit_catalogue",
          payload: {
            name: "Catalogue Buyer",
            email: "catalogue@example.com",
          },
        },
      },
    );
    expect(mocks.directFrom).not.toHaveBeenCalled();
  });

  it("uses a signed private tech-pack upload ticket and returns only safe file metadata", async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        ok: true,
        bucket: "tech_packs",
        path: "requests/tech-pack/2026-07/test.pdf",
        token: "signed-upload-token",
        content_type: "application/pdf",
      },
      error: null,
    });

    const file = new File(["pdf"], "specification.pdf", { type: "application/pdf" });
    const result = await uploadPublicLeadFile(file, "inquiry", 123456);

    expect(mocks.invoke).toHaveBeenCalledWith(
      "public-lead-gateway",
      {
        body: {
          action: "create_upload",
          payload: {
            filename: "specification.pdf",
            mime: "application/pdf",
            size: file.size,
            purpose: "tech-pack",
            form_started_at: 123456,
            website: "",
          },
        },
      },
    );
    expect(mocks.storageFrom).toHaveBeenCalledWith("tech_packs");
    expect(mocks.uploadToSignedUrl).toHaveBeenCalledWith(
      "requests/tech-pack/2026-07/test.pdf",
      "signed-upload-token",
      file,
      { contentType: "application/pdf", upsert: false },
    );
    expect(result).toEqual({
      path: "requests/tech-pack/2026-07/test.pdf",
      name: "specification.pdf",
      size: file.size,
      mime: "application/pdf",
    });
  });
});
