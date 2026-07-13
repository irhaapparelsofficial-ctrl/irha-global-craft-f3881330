import { describe, expect, it } from "vitest";
import {
  canAdvanceShipmentStatus,
  dispatchReadiness,
  dispatchRisk,
  duplicateCartonNumbers,
  packageTotals,
  requiredDocumentTypes,
  safeTrackingUrl,
  volumetricWeightKg,
  type DispatchPackage,
  type ShipmentRecord,
} from "@/lib/productionShipping";

const packages: DispatchPackage[] = [{
  cartonNo: 1,
  itemCount: 40,
  netWeightKg: 18,
  grossWeightKg: 20,
  lengthCm: 60,
  widthCm: 40,
  heightCm: 40,
  packingStatus: "verified",
}];

const shipment: ShipmentRecord = {
  mode: "courier",
  status: "booked",
  courierName: "DHL",
  trackingNumber: "ABC123",
  trackingUrl: "https://example.com/track/ABC123",
  bookedAt: "2026-07-13T10:00:00Z",
};

describe("production shipping", () => {
  it("calculates carton totals and volumetric weight", () => {
    expect(volumetricWeightKg(packages[0])).toBe(19.2);
    expect(packageTotals(packages)).toEqual({
      cartons: 1,
      items: 40,
      netWeightKg: 18,
      grossWeightKg: 20,
      volumetricWeightKg: 19.2,
    });
  });

  it("detects duplicate carton numbers", () => {
    expect(duplicateCartonNumbers([...packages, { ...packages[0] }])).toEqual([1]);
  });

  it("requires mode-specific verified documents", () => {
    expect(requiredDocumentTypes({ shipment, requireCommercialInvoice: true, requireOriginCertificate: false }))
      .toEqual(["packing_list", "commercial_invoice", "courier_label"]);
  });

  it("allows dispatch only with QC release, verified cartons, documents and booking evidence", () => {
    const result = dispatchReadiness({
      qualityReleaseStatus: "approved",
      packages,
      shipment,
      documents: [
        { documentType: "packing_list", verificationStatus: "verified" },
        { documentType: "commercial_invoice", verificationStatus: "verified" },
        { documentType: "courier_label", verificationStatus: "verified" },
      ],
    });
    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
    expect(dispatchRisk({ qualityReleaseStatus: "approved", packages, shipment, documents: [
      { documentType: "packing_list", verificationStatus: "verified" },
      { documentType: "commercial_invoice", verificationStatus: "verified" },
      { documentType: "courier_label", verificationStatus: "verified" },
    ] })).toBe("clear");
  });

  it("blocks rejected documents, impossible weights and missing QC release", () => {
    const result = dispatchReadiness({
      qualityReleaseStatus: "not_ready",
      packages: [{ ...packages[0], grossWeightKg: 10 }],
      shipment,
      documents: [{ documentType: "packing_list", verificationStatus: "rejected" }],
    });
    expect(result.ready).toBe(false);
    expect(result.missing.join(" ")).toMatch(/QC release/i);
    expect(result.missing.join(" ")).toMatch(/gross weight/i);
    expect(dispatchRisk({ qualityReleaseStatus: "not_ready", packages, shipment, documents: [] })).toBe("blocked");
  });

  it("requires verified proof when a shipment is marked delivered", () => {
    const result = dispatchReadiness({
      qualityReleaseStatus: "approved",
      packages,
      shipment: { ...shipment, status: "delivered", deliveredAt: "2026-07-15T10:00:00Z" },
      documents: [
        { documentType: "packing_list", verificationStatus: "verified" },
        { documentType: "commercial_invoice", verificationStatus: "verified" },
        { documentType: "courier_label", verificationStatus: "verified" },
      ],
      deliveryEvidence: [],
    });
    expect(result.missing).toContain("verified delivery evidence");
  });

  it("prevents backwards or post-terminal shipment movement", () => {
    expect(canAdvanceShipmentStatus("booked", "collected")).toBe(true);
    expect(canAdvanceShipmentStatus("in_transit", "booked")).toBe(false);
    expect(canAdvanceShipmentStatus("delivered", "exception")).toBe(false);
  });

  it("accepts only HTTPS tracking URLs", () => {
    expect(safeTrackingUrl("https://carrier.example/track")).toContain("https://");
    expect(safeTrackingUrl("http://carrier.example/track")).toBeNull();
    expect(safeTrackingUrl("not-a-url")).toBeNull();
  });
});
