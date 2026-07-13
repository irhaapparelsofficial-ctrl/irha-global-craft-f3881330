export type ShipmentStatus = "draft" | "packing" | "ready_for_dispatch" | "booked" | "in_transit" | "delivered" | "exception" | "cancelled";
export type PackageStatus = "planned" | "packed" | "sealed" | "loaded" | "delivered" | "damaged";
export type ShippingDocumentType = "commercial_invoice" | "packing_list" | "certificate_of_origin" | "air_waybill" | "bill_of_lading" | "courier_label" | "customs_declaration" | "insurance" | "inspection_report" | "other";
export type TrackingEventType = "booking_created" | "picked_up" | "departed" | "arrived_hub" | "customs_hold" | "customs_cleared" | "out_for_delivery" | "delivered" | "exception" | "returned";

export interface ShippingPackageEvidence {
  status: PackageStatus;
  units: number;
  grossWeightKg: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  sealNumber?: string | null;
}

export interface ShippingDocumentEvidence {
  documentType: ShippingDocumentType;
  verificationStatus: "pending" | "verified" | "rejected";
  required: boolean;
  fileName?: string | null;
}

export interface DispatchReadinessInput {
  qcReleasedAt?: string | null;
  destinationCountry?: string | null;
  destinationAddress?: string | null;
  consigneeName?: string | null;
  consigneePhone?: string | null;
  courierName?: string | null;
  serviceLevel?: string | null;
  packages: ShippingPackageEvidence[];
  documents: ShippingDocumentEvidence[];
}

export function packageVolumeM3(pkg: Pick<ShippingPackageEvidence, "lengthCm" | "widthCm" | "heightCm">): number | null {
  const values = [pkg.lengthCm, pkg.widthCm, pkg.heightCm].map((value) => Number(value ?? 0));
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return null;
  return values.reduce((product, value) => product * value, 1) / 1_000_000;
}

export function volumetricWeightKg(pkg: Pick<ShippingPackageEvidence, "lengthCm" | "widthCm" | "heightCm">, divisor = 5000): number | null {
  const values = [pkg.lengthCm, pkg.widthCm, pkg.heightCm].map((value) => Number(value ?? 0));
  if (values.some((value) => !Number.isFinite(value) || value <= 0) || divisor <= 0) return null;
  return values.reduce((product, value) => product * value, 1) / divisor;
}

export function shipmentTotals(packages: ShippingPackageEvidence[]) {
  return packages.reduce((totals, pkg) => {
    totals.packages += 1;
    totals.units += Math.max(0, Number(pkg.units) || 0);
    totals.grossWeightKg += Math.max(0, Number(pkg.grossWeightKg) || 0);
    const volume = packageVolumeM3(pkg);
    if (volume !== null) totals.volumeM3 += volume;
    return totals;
  }, { packages: 0, units: 0, grossWeightKg: 0, volumeM3: 0 });
}

export function dispatchReadiness(input: DispatchReadinessInput): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!input.qcReleasedAt) missing.push("Owner-approved QC release");
  if (!input.destinationCountry?.trim()) missing.push("Destination country");
  if (!input.destinationAddress?.trim()) missing.push("Destination address");
  if (!input.consigneeName?.trim()) missing.push("Consignee name");
  if (!input.consigneePhone?.trim()) missing.push("Consignee phone");
  if (!input.courierName?.trim()) missing.push("Courier or freight forwarder");
  if (!input.serviceLevel?.trim()) missing.push("Shipping service level");
  if (input.packages.length === 0) missing.push("At least one package");
  if (input.packages.some((pkg) => pkg.units <= 0 || pkg.grossWeightKg <= 0)) missing.push("Valid package units and gross weight");
  if (input.packages.some((pkg) => !["sealed", "loaded", "delivered"].includes(pkg.status))) missing.push("All packages sealed");
  const requiredDocuments = input.documents.filter((doc) => doc.required);
  if (requiredDocuments.length === 0) missing.push("Required shipping document checklist");
  if (requiredDocuments.some((doc) => doc.verificationStatus !== "verified" || !doc.fileName?.trim())) missing.push("All required shipping documents verified");
  return { ready: missing.length === 0, missing: [...new Set(missing)] };
}

export function shipmentRisk(input: {
  status: ShipmentStatus;
  dispatchApprovedAt?: string | null;
  expectedDispatchAt?: string | null;
  expectedDeliveryAt?: string | null;
  packages: ShippingPackageEvidence[];
  documents: ShippingDocumentEvidence[];
  latestTrackingEvent?: TrackingEventType | null;
}, now = Date.now()): "clear" | "attention" | "blocked" {
  if (input.status === "exception" || input.latestTrackingEvent === "exception" || input.latestTrackingEvent === "returned") return "blocked";
  if (input.packages.some((pkg) => pkg.status === "damaged")) return "blocked";
  if (input.documents.some((doc) => doc.required && doc.verificationStatus === "rejected")) return "blocked";
  if (["ready_for_dispatch", "booked", "in_transit"].includes(input.status) && !input.dispatchApprovedAt) return "blocked";
  const dispatchTime = input.expectedDispatchAt ? new Date(input.expectedDispatchAt).getTime() : null;
  const deliveryTime = input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt).getTime() : null;
  if (dispatchTime && dispatchTime < now && ["draft", "packing", "ready_for_dispatch"].includes(input.status)) return "attention";
  if (deliveryTime && deliveryTime < now && !["delivered", "cancelled"].includes(input.status)) return "attention";
  if (input.documents.some((doc) => doc.required && doc.verificationStatus !== "verified")) return "attention";
  return "clear";
}

export function trackingEventLabel(event: TrackingEventType): string {
  return event.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function safeTrackingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
