import { describe, expect, it } from "vitest";
import {
  dispatchReadiness,
  packageVolumeM3,
  safeTrackingUrl,
  shipmentRisk,
  shipmentTotals,
  volumetricWeightKg,
} from "@/lib/productionShipping";

const packages = [{ status: "sealed" as const, units: 50, grossWeightKg: 22, lengthCm: 60, widthCm: 40, heightCm: 35, sealNumber: "S-1" }];
const documents = [
  { documentType: "commercial_invoice" as const, verificationStatus: "verified" as const, required: true, fileName: "invoice.pdf" },
  { documentType: "packing_list" as const, verificationStatus: "verified" as const, required: true, fileName: "packing-list.pdf" },
];

describe("production shipping controls", () => {
  it("calculates volume, volumetric weight and totals deterministically", () => {
    expect(packageVolumeM3(packages[0])).toBeCloseTo(0.084);
    expect(volumetricWeightKg(packages[0])).toBeCloseTo(16.8);
    expect(shipmentTotals(packages)).toEqual({ packages: 1, units: 50, grossWeightKg: 22, volumeM3: 0.084 });
  });

  it("requires QC release, sealed packages and verified required documents", () => {
    const ready = dispatchReadiness({
      qcReleasedAt: "2026-07-13T10:00:00Z",
      destinationCountry: "Germany",
      destinationAddress: "Munich warehouse",
      consigneeName: "Buyer GmbH",
      consigneePhone: "+49 000",
      courierName: "DHL",
      serviceLevel: "Express",
      packages,
      documents,
    });
    expect(ready.ready).toBe(true);

    const blocked = dispatchReadiness({
      qcReleasedAt: null,
      destinationCountry: "Germany",
      destinationAddress: "",
      consigneeName: "Buyer GmbH",
      consigneePhone: "+49 000",
      courierName: "DHL",
      serviceLevel: "Express",
      packages: [{ ...packages[0], status: "packed" }],
      documents: [{ ...documents[0], verificationStatus: "pending" }],
    });
    expect(blocked.ready).toBe(false);
    expect(blocked.missing).toContain("Owner-approved QC release");
    expect(blocked.missing).toContain("All packages sealed");
    expect(blocked.missing).toContain("All required shipping documents verified");
  });

  it("blocks damaged, rejected and exception evidence", () => {
    expect(shipmentRisk({ status: "in_transit", dispatchApprovedAt: "2026-07-13", packages: [{ ...packages[0], status: "damaged" }], documents })).toBe("blocked");
    expect(shipmentRisk({ status: "exception", dispatchApprovedAt: "2026-07-13", packages, documents })).toBe("blocked");
  });

  it("marks missed dispatch dates as attention", () => {
    expect(shipmentRisk({
      status: "packing",
      expectedDispatchAt: "2026-07-10T00:00:00Z",
      packages,
      documents,
    }, new Date("2026-07-13T00:00:00Z").getTime())).toBe("attention");
  });

  it("allows only HTTPS tracking links", () => {
    expect(safeTrackingUrl("https://carrier.example/track/123")).toContain("https://");
    expect(safeTrackingUrl("http://carrier.example/123")).toBeNull();
    expect(safeTrackingUrl("not-a-url")).toBeNull();
  });
});
