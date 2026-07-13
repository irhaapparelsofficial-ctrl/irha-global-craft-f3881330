export type DispatchDocumentType =
  | "packing_list"
  | "commercial_invoice"
  | "proforma_invoice"
  | "certificate_of_origin"
  | "customs_declaration"
  | "airway_bill"
  | "bill_of_lading"
  | "courier_label"
  | "delivery_note"
  | "insurance"
  | "other";

export type ShipmentMode = "courier" | "air" | "sea" | "road" | "pickup";
export type ShipmentStatus = "draft" | "quoted" | "booked" | "collected" | "in_transit" | "customs_hold" | "out_for_delivery" | "delivered" | "exception" | "cancelled";
export type DispatchRisk = "clear" | "attention" | "blocked";

export interface DispatchPackage {
  cartonNo: number;
  itemCount: number;
  netWeightKg: number;
  grossWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packingStatus: "planned" | "packed" | "sealed" | "verified";
}

export interface DispatchDocument {
  documentType: DispatchDocumentType;
  verificationStatus: "pending" | "verified" | "rejected";
  fileName?: string | null;
  reference?: string | null;
}

export interface ShipmentEvidence {
  evidenceType: "pickup" | "handover" | "tracking" | "delivery" | "exception";
  verificationStatus: "pending" | "verified" | "rejected";
  reference?: string | null;
}

export interface ShipmentRecord {
  mode: ShipmentMode;
  status: ShipmentStatus;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  bookedAt?: string | null;
  collectedAt?: string | null;
  deliveredAt?: string | null;
}

export interface DispatchReadinessInput {
  qualityReleaseStatus?: string | null;
  packages: DispatchPackage[];
  documents: DispatchDocument[];
  shipment?: ShipmentRecord | null;
  deliveryEvidence?: ShipmentEvidence[];
  requireCommercialInvoice?: boolean;
  requireOriginCertificate?: boolean;
}

export interface DispatchReadiness {
  ready: boolean;
  missing: string[];
  warnings: string[];
}

const safeNumber = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;

export function volumetricWeightKg(pkg: Pick<DispatchPackage, "lengthCm" | "widthCm" | "heightCm">, divisor = 5000): number {
  if (!Number.isFinite(divisor) || divisor <= 0) return 0;
  const volume = safeNumber(pkg.lengthCm) * safeNumber(pkg.widthCm) * safeNumber(pkg.heightCm);
  return Number((volume / divisor).toFixed(2));
}

export function packageTotals(packages: DispatchPackage[]) {
  return packages.reduce((totals, pkg) => {
    totals.cartons += 1;
    totals.items += Math.max(0, Math.floor(pkg.itemCount || 0));
    totals.netWeightKg += safeNumber(pkg.netWeightKg);
    totals.grossWeightKg += safeNumber(pkg.grossWeightKg);
    totals.volumetricWeightKg += volumetricWeightKg(pkg);
    return totals;
  }, { cartons: 0, items: 0, netWeightKg: 0, grossWeightKg: 0, volumetricWeightKg: 0 });
}

export function duplicateCartonNumbers(packages: DispatchPackage[]): number[] {
  const counts = new Map<number, number>();
  for (const pkg of packages) counts.set(pkg.cartonNo, (counts.get(pkg.cartonNo) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([carton]) => carton).sort((a, b) => a - b);
}

export function requiredDocumentTypes(input: Pick<DispatchReadinessInput, "shipment" | "requireCommercialInvoice" | "requireOriginCertificate">): DispatchDocumentType[] {
  const required: DispatchDocumentType[] = ["packing_list"];
  if (input.requireCommercialInvoice !== false) required.push("commercial_invoice");
  if (input.requireOriginCertificate) required.push("certificate_of_origin");
  if (input.shipment?.mode === "courier") required.push("courier_label");
  if (input.shipment?.mode === "air") required.push("airway_bill");
  if (input.shipment?.mode === "sea") required.push("bill_of_lading");
  return [...new Set(required)];
}

export function dispatchReadiness(input: DispatchReadinessInput): DispatchReadiness {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (input.qualityReleaseStatus !== "approved") missing.push("owner-approved QC release");
  if (input.packages.length === 0) missing.push("at least one package/carton");

  const duplicateCartons = duplicateCartonNumbers(input.packages);
  if (duplicateCartons.length) missing.push(`unique carton numbers (${duplicateCartons.join(", ")} duplicated)`);

  for (const pkg of input.packages) {
    if (pkg.cartonNo <= 0) missing.push("valid carton number");
    if (pkg.itemCount <= 0) missing.push(`carton ${pkg.cartonNo}: item count`);
    if (pkg.netWeightKg <= 0) missing.push(`carton ${pkg.cartonNo}: net weight`);
    if (pkg.grossWeightKg < pkg.netWeightKg || pkg.grossWeightKg <= 0) missing.push(`carton ${pkg.cartonNo}: gross weight must be at least net weight`);
    if (pkg.lengthCm <= 0 || pkg.widthCm <= 0 || pkg.heightCm <= 0) missing.push(`carton ${pkg.cartonNo}: dimensions`);
    if (pkg.packingStatus !== "verified") missing.push(`carton ${pkg.cartonNo}: packing verification`);
  }

  const verified = new Set(input.documents.filter((doc) => doc.verificationStatus === "verified").map((doc) => doc.documentType));
  for (const type of requiredDocumentTypes(input)) {
    if (!verified.has(type)) missing.push(`verified ${type.replaceAll("_", " ")}`);
  }
  if (input.documents.some((doc) => doc.verificationStatus === "rejected")) missing.push("replace rejected shipment documents");

  const shipment = input.shipment;
  if (!shipment) missing.push("shipment booking record");
  else {
    if (["cancelled", "exception"].includes(shipment.status)) missing.push(`shipment status: ${shipment.status}`);
    if (!shipment.courierName?.trim()) missing.push("carrier/courier name");
    if (!shipment.trackingNumber?.trim()) missing.push("tracking or booking number");
    if (shipment.trackingUrl && !/^https:\/\//i.test(shipment.trackingUrl)) missing.push("HTTPS tracking URL");
    if (["draft", "quoted"].includes(shipment.status)) missing.push("confirmed shipment booking");
  }

  const totals = packageTotals(input.packages);
  if (totals.grossWeightKg > 0 && totals.volumetricWeightKg > totals.grossWeightKg * 1.5) {
    warnings.push("volumetric weight is materially higher than gross weight; verify carrier billing weight");
  }
  if (input.packages.some((pkg) => pkg.grossWeightKg - pkg.netWeightKg > Math.max(5, pkg.netWeightKg * 0.3))) {
    warnings.push("one or more cartons have unusually high packaging weight");
  }
  if (shipment?.status === "delivered" && !input.deliveryEvidence?.some((event) => event.evidenceType === "delivery" && event.verificationStatus === "verified")) {
    missing.push("verified delivery evidence");
  }

  return { ready: missing.length === 0, missing: [...new Set(missing)], warnings: [...new Set(warnings)] };
}

export function dispatchRisk(input: DispatchReadinessInput): DispatchRisk {
  const readiness = dispatchReadiness(input);
  if (readiness.missing.some((item) => /QC release|rejected|exception|cancelled|delivery evidence|gross weight|dimensions|unique carton/i.test(item))) return "blocked";
  if (!readiness.ready || readiness.warnings.length) return "attention";
  return "clear";
}

export function trackingEventOrder(status: string): number {
  const order = ["booked", "collected", "in_transit", "customs_hold", "out_for_delivery", "delivered", "exception", "cancelled"];
  const index = order.indexOf(status);
  return index < 0 ? -1 : index;
}

export function canAdvanceShipmentStatus(current: ShipmentStatus, next: ShipmentStatus): boolean {
  if (current === next) return true;
  if (["cancelled", "delivered"].includes(current)) return false;
  if (["exception", "customs_hold"].includes(next)) return true;
  const currentOrder = trackingEventOrder(current);
  const nextOrder = trackingEventOrder(next);
  return currentOrder >= 0 && nextOrder >= currentOrder;
}

export function safeTrackingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
