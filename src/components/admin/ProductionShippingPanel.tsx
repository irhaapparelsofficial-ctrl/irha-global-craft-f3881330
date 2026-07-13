import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
  UploadCloud,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  dispatchReadiness,
  safeTrackingUrl,
  shipmentRisk,
  shipmentTotals,
  trackingEventLabel,
  type PackageStatus,
  type ShippingDocumentType,
  type ShipmentStatus,
  type TrackingEventType,
} from "@/lib/productionShipping";

const db = supabase as any;
const BUCKET = "production-evidence";
const MIGRATION = "supabase/migrations/20260713233000_production_shipping_dispatch.sql";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const FIELD = "min-h-11 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold";

interface SummaryRow {
  shipment_id: string;
  production_job_id: string;
  job_number: string;
  job_type: "sample" | "order";
  buyer_name: string;
  company_name: string | null;
  product_name: string;
  quantity_text: string;
  stage: string;
  qc_status: string;
  qc_released_at: string | null;
  shipment_number: string;
  status: ShipmentStatus;
  shipping_mode: string;
  incoterm: string | null;
  destination_country: string | null;
  destination_city: string | null;
  consignee_name: string | null;
  courier_name: string | null;
  service_level: string | null;
  booking_reference: string | null;
  master_tracking_number: string | null;
  tracking_url: string | null;
  expected_dispatch_at: string | null;
  expected_delivery_at: string | null;
  dispatch_approved_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  package_count: number;
  packed_units: number;
  gross_weight_kg: number;
  unsealed_packages: number;
  required_documents: number;
  verified_required_documents: number;
  tracking_event_count: number;
  latest_tracking_at: string | null;
  latest_tracking_event: TrackingEventType | null;
  verified_delivery_evidence_count: number;
  risk_level: "clear" | "attention" | "blocked";
  updated_at: string;
}

interface JobRow {
  id: string;
  job_number: string;
  job_type: "sample" | "order";
  buyer_name: string;
  company_name: string | null;
  product_name: string;
  quantity_text: string;
  stage: string;
  qc_released_at: string | null;
}

interface ShipmentRow {
  id: string;
  production_job_id: string;
  shipment_number: string;
  status: ShipmentStatus;
  shipping_mode: string;
  incoterm: string | null;
  destination_country: string | null;
  destination_city: string | null;
  destination_address: string | null;
  consignee_name: string | null;
  consignee_company: string | null;
  consignee_phone: string | null;
  consignee_email: string | null;
  courier_name: string | null;
  service_level: string | null;
  booking_reference: string | null;
  master_tracking_number: string | null;
  tracking_url: string | null;
  expected_dispatch_at: string | null;
  expected_delivery_at: string | null;
  declared_value: number | null;
  currency: string;
  export_reason: string | null;
  customs_reference: string | null;
  notes: string | null;
  dispatch_approved_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
}

interface PackageRow {
  id: string;
  shipment_id: string;
  production_job_id: string;
  package_number: string;
  package_type: string;
  status: PackageStatus;
  unit_count: number;
  net_weight_kg: number | null;
  gross_weight_kg: number;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  seal_number: string | null;
  contents_summary: string | null;
  damage_note: string | null;
}

interface DocumentRow {
  id: string;
  shipment_id: string;
  production_job_id: string;
  document_type: ShippingDocumentType;
  required: boolean;
  document_number: string | null;
  bucket: string;
  object_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  sha256: string | null;
  verification_status: "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
}

interface TrackingRow {
  id: number;
  shipment_id: string;
  event_type: TrackingEventType;
  occurred_at: string;
  location_text: string | null;
  carrier_status: string | null;
  tracking_number: string | null;
  source: string;
  notes: string | null;
}

interface DeliveryRow {
  id: string;
  shipment_id: string;
  delivered_at: string;
  recipient_name: string;
  recipient_role: string | null;
  delivery_location: string | null;
  evidence_type: string;
  bucket: string;
  object_path: string | null;
  file_name: string | null;
  verification_status: "pending" | "verified" | "rejected";
  notes: string | null;
}

type ProfileDraft = {
  mode: string;
  incoterm: string;
  country: string;
  city: string;
  address: string;
  consignee: string;
  company: string;
  phone: string;
  email: string;
  courier: string;
  service: string;
  dispatchAt: string;
  deliveryAt: string;
  declaredValue: string;
  currency: string;
  exportReason: string;
  customsReference: string;
  notes: string;
};

const EMPTY_PROFILE: ProfileDraft = { mode: "courier", incoterm: "DAP", country: "", city: "", address: "", consignee: "", company: "", phone: "", email: "", courier: "", service: "", dispatchAt: "", deliveryAt: "", declaredValue: "", currency: "USD", exportReason: "commercial_goods", customsReference: "", notes: "" };
const EMPTY_PACKAGE = { number: "", type: "carton", units: "", net: "", gross: "", length: "", width: "", height: "", seal: "", contents: "" };
const EMPTY_TRACKING = { event: "booking_created" as TrackingEventType, at: "", location: "", carrierStatus: "", trackingNumber: "", notes: "" };
const EMPTY_DELIVERY = { deliveredAt: "", recipient: "", role: "", location: "", type: "carrier_pod", notes: "" };

export default function ProductionShippingPanel() {
  const documentInput = useRef<HTMLInputElement | null>(null);
  const deliveryInput = useRef<HTMLInputElement | null>(null);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [shipment, setShipment] = useState<ShipmentRow | null>(null);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [tracking, setTracking] = useState<TrackingRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [profile, setProfile] = useState<ProfileDraft>(EMPTY_PROFILE);
  const [packageDraft, setPackageDraft] = useState(EMPTY_PACKAGE);
  const [documentType, setDocumentType] = useState<ShippingDocumentType>("commercial_invoice");
  const [documentRequired, setDocumentRequired] = useState(true);
  const [documentNumber, setDocumentNumber] = useState("");
  const [trackingDraft, setTrackingDraft] = useState(EMPTY_TRACKING);
  const [deliveryDraft, setDeliveryDraft] = useState(EMPTY_DELIVERY);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [serverReadiness, setServerReadiness] = useState<{ ready: boolean; missing: string[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [summaryResult, jobsResult] = await Promise.all([
      db.from("production_shipping_summary").select("*").order("updated_at", { ascending: false }).limit(500),
      db.from("production_jobs").select("id,job_number,job_type,buyer_name,company_name,product_name,quantity_text,stage,qc_released_at").order("updated_at", { ascending: false }).limit(500),
    ]);
    if (summaryResult.error) {
      setBackendError(summaryResult.error.message || "Shipping backend unavailable");
      setSummaries([]);
    } else {
      setBackendError(null);
      const rows = (summaryResult.data || []) as SummaryRow[];
      setSummaries(rows);
      setSelectedShipmentId((current) => current && rows.some((row) => row.shipment_id === current) ? current : rows[0]?.shipment_id || "");
    }
    setJobs((jobsResult.data || []) as JobRow[]);
    setLoading(false);
  }, []);

  const loadDetails = useCallback(async (shipmentId: string) => {
    if (!shipmentId) {
      setShipment(null); setPackages([]); setDocuments([]); setTracking([]); setDeliveries([]); return;
    }
    setDetailsLoading(true);
    const [shipmentResult, packageResult, documentResult, trackingResult, deliveryResult] = await Promise.all([
      db.from("production_shipments").select("*").eq("id", shipmentId).single(),
      db.from("production_packages").select("*").eq("shipment_id", shipmentId).order("package_number"),
      db.from("production_shipping_documents").select("*").eq("shipment_id", shipmentId).order("required", { ascending: false }).order("created_at", { ascending: false }),
      db.from("production_tracking_events").select("*").eq("shipment_id", shipmentId).order("occurred_at", { ascending: false }),
      db.from("production_delivery_evidence").select("*").eq("shipment_id", shipmentId).order("delivered_at", { ascending: false }),
    ]);
    const error = shipmentResult.error || packageResult.error || documentResult.error || trackingResult.error || deliveryResult.error;
    if (error) {
      toast({ title: "Shipping details could not load", description: error.message, variant: "destructive" });
      setDetailsLoading(false); return;
    }
    const next = shipmentResult.data as ShipmentRow;
    setShipment(next);
    setPackages((packageResult.data || []) as PackageRow[]);
    setDocuments((documentResult.data || []) as DocumentRow[]);
    setTracking((trackingResult.data || []) as TrackingRow[]);
    setDeliveries((deliveryResult.data || []) as DeliveryRow[]);
    setProfile({
      mode: next.shipping_mode || "courier", incoterm: next.incoterm || "DAP", country: next.destination_country || "", city: next.destination_city || "", address: next.destination_address || "",
      consignee: next.consignee_name || "", company: next.consignee_company || "", phone: next.consignee_phone || "", email: next.consignee_email || "", courier: next.courier_name || "", service: next.service_level || "",
      dispatchAt: toLocal(next.expected_dispatch_at), deliveryAt: toLocal(next.expected_delivery_at), declaredValue: next.declared_value === null ? "" : String(next.declared_value), currency: next.currency || "USD",
      exportReason: next.export_reason || "commercial_goods", customsReference: next.customs_reference || "", notes: next.notes || "",
    });
    setServerReadiness(null);
    setDetailsLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadDetails(selectedShipmentId); }, [loadDetails, selectedShipmentId]);

  const selectedSummary = useMemo(() => summaries.find((row) => row.shipment_id === selectedShipmentId) || null, [selectedShipmentId, summaries]);
  const totals = useMemo(() => shipmentTotals(packages.map((pkg) => ({ status: pkg.status, units: Number(pkg.unit_count), grossWeightKg: Number(pkg.gross_weight_kg), lengthCm: pkg.length_cm, widthCm: pkg.width_cm, heightCm: pkg.height_cm, sealNumber: pkg.seal_number }))), [packages]);
  const clientReadiness = useMemo(() => dispatchReadiness({
    qcReleasedAt: selectedSummary?.qc_released_at,
    destinationCountry: profile.country,
    destinationAddress: profile.address,
    consigneeName: profile.consignee,
    consigneePhone: profile.phone,
    courierName: profile.courier,
    serviceLevel: profile.service,
    packages: packages.map((pkg) => ({ status: pkg.status, units: Number(pkg.unit_count), grossWeightKg: Number(pkg.gross_weight_kg) })),
    documents: documents.map((doc) => ({ documentType: doc.document_type, required: doc.required, verificationStatus: doc.verification_status, fileName: doc.file_name })),
  }), [documents, packages, profile, selectedSummary?.qc_released_at]);
  const risk = useMemo(() => shipment ? shipmentRisk({
    status: shipment.status,
    dispatchApprovedAt: shipment.dispatch_approved_at,
    expectedDispatchAt: shipment.expected_dispatch_at,
    expectedDeliveryAt: shipment.expected_delivery_at,
    packages: packages.map((pkg) => ({ status: pkg.status, units: pkg.unit_count, grossWeightKg: pkg.gross_weight_kg })),
    documents: documents.map((doc) => ({ documentType: doc.document_type, required: doc.required, verificationStatus: doc.verification_status, fileName: doc.file_name })),
    latestTrackingEvent: tracking[0]?.event_type || null,
  }) : "attention", [documents, packages, shipment, tracking]);
  const stats = useMemo(() => ({
    active: summaries.filter((row) => !["delivered", "cancelled"].includes(row.status)).length,
    dispatchReady: summaries.filter((row) => row.status === "ready_for_dispatch").length,
    inTransit: summaries.filter((row) => row.status === "in_transit").length,
    exceptions: summaries.filter((row) => row.risk_level === "blocked" || row.status === "exception").length,
  }), [summaries]);

  const refreshAll = async () => { await load(); await loadDetails(selectedShipmentId); };

  const createShipment = async () => {
    const job = jobs.find((row) => row.id === selectedJobId);
    if (!job) return;
    setBusy("create");
    const shipmentNumber = `SHP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await db.from("production_shipments").insert({ production_job_id: job.id, shipment_number: shipmentNumber, status: "draft", created_by: auth.user?.id || null }).select("*").single();
    setBusy(null);
    if (error) { toast({ title: "Shipment creation failed", description: error.message, variant: "destructive" }); return; }
    await db.from("production_job_events").insert({ production_job_id: job.id, event_type: "shipment_created", to_value: "draft", note: "Internal shipment record created. No courier booking or buyer notification.", evidence: { shipment_id: data.id, shipment_number: shipmentNumber, courier_booking_created: false, buyer_notification_sent: false } });
    toast({ title: `${shipmentNumber} created`, description: "Internal shipment only; no external booking was made." });
    setSelectedJobId("");
    await load();
    setSelectedShipmentId(data.id);
  };

  const saveProfile = async () => {
    if (!shipment) return;
    setBusy("profile");
    const { error } = await db.from("production_shipments").update({
      shipping_mode: profile.mode, incoterm: profile.incoterm || null, destination_country: profile.country.trim() || null, destination_city: profile.city.trim() || null,
      destination_address: profile.address.trim() || null, consignee_name: profile.consignee.trim() || null, consignee_company: profile.company.trim() || null,
      consignee_phone: profile.phone.trim() || null, consignee_email: profile.email.trim() || null, courier_name: profile.courier.trim() || null, service_level: profile.service.trim() || null,
      expected_dispatch_at: profile.dispatchAt ? new Date(profile.dispatchAt).toISOString() : null, expected_delivery_at: profile.deliveryAt ? new Date(profile.deliveryAt).toISOString() : null,
      declared_value: profile.declaredValue ? Number(profile.declaredValue) : null, currency: profile.currency.toUpperCase(), export_reason: profile.exportReason.trim() || null,
      customs_reference: profile.customsReference.trim() || null, notes: profile.notes.trim() || null, status: shipment.status === "draft" ? "packing" : shipment.status,
      dispatch_approved_at: null, dispatch_approved_by: null, owner_approval_required: true,
    }).eq("id", shipment.id);
    setBusy(null);
    if (error) { toast({ title: "Shipping profile update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Shipping profile saved", description: "Previous dispatch approval was cleared for fresh owner review." });
    await refreshAll();
  };

  const addPackage = async () => {
    if (!shipment || !packageDraft.number.trim() || Number(packageDraft.units) <= 0 || Number(packageDraft.gross) <= 0) {
      toast({ title: "Package number, units and gross weight are required", variant: "destructive" }); return;
    }
    setBusy("package");
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("production_packages").insert({
      shipment_id: shipment.id, production_job_id: shipment.production_job_id, package_number: packageDraft.number.trim(), package_type: packageDraft.type,
      status: packageDraft.seal.trim() ? "sealed" : "packed", unit_count: Number(packageDraft.units), net_weight_kg: packageDraft.net ? Number(packageDraft.net) : null,
      gross_weight_kg: Number(packageDraft.gross), length_cm: packageDraft.length ? Number(packageDraft.length) : null, width_cm: packageDraft.width ? Number(packageDraft.width) : null,
      height_cm: packageDraft.height ? Number(packageDraft.height) : null, seal_number: packageDraft.seal.trim() || null, contents_summary: packageDraft.contents.trim() || null, created_by: auth.user?.id || null,
    });
    setBusy(null);
    if (error) { toast({ title: "Package was not added", description: error.message, variant: "destructive" }); return; }
    setPackageDraft(EMPTY_PACKAGE);
    toast({ title: "Package added" });
    await refreshAll();
  };

  const setPackageStatus = async (pkg: PackageRow, status: PackageStatus) => {
    const updates: Record<string, unknown> = { status, damage_note: status === "damaged" ? (window.prompt("Damage note") || "Damage recorded") : null };
    if (status === "sealed") updates.sealed_at = new Date().toISOString();
    const { error } = await db.from("production_packages").update(updates).eq("id", pkg.id);
    if (error) { toast({ title: "Package update failed", description: error.message, variant: "destructive" }); return; }
    await refreshAll();
  };

  const uploadShippingDocument = async (file: File) => {
    if (!shipment) return;
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) { toast({ title: "Unsupported or oversized file", description: "Use image, PDF, DOCX, XLSX, CSV or text up to 20 MB.", variant: "destructive" }); return; }
    setBusy("document");
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
    const objectPath = `${shipment.production_job_id}/shipping/${shipment.id}/${crypto.randomUUID()}-${safeName}`;
    const sha256 = await hashFile(file);
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
    if (uploadError) { setBusy(null); toast({ title: "Private shipping storage is not active yet", description: "The migration is prepared for final activation.", variant: "destructive" }); return; }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("production_shipping_documents").insert({
      shipment_id: shipment.id, production_job_id: shipment.production_job_id, document_type: documentType, required: documentRequired, document_number: documentNumber.trim() || null,
      bucket: BUCKET, object_path: objectPath, file_name: file.name, mime_type: file.type, size_bytes: file.size, sha256, verification_status: "pending", created_by: auth.user?.id || null,
    });
    if (error) { await supabase.storage.from(BUCKET).remove([objectPath]); setBusy(null); toast({ title: "Document metadata failed", description: error.message, variant: "destructive" }); return; }
    setBusy(null); setDocumentNumber("");
    toast({ title: "Private shipping document uploaded", description: "Verify it before dispatch readiness." });
    await refreshAll();
  };

  const verifyDocument = async (doc: DocumentRow, status: "verified" | "rejected") => {
    const { data: auth } = await supabase.auth.getUser();
    const reason = status === "rejected" ? window.prompt("Rejection reason") : null;
    if (status === "rejected" && !reason?.trim()) return;
    const { error } = await db.from("production_shipping_documents").update({ verification_status: status, verified_by: auth.user?.id || null, verified_at: new Date().toISOString(), rejection_reason: reason?.trim() || null }).eq("id", doc.id);
    if (error) { toast({ title: "Document review failed", description: error.message, variant: "destructive" }); return; }
    await refreshAll();
  };

  const openPrivateFile = async (bucket: string, objectPath: string | null) => {
    if (!objectPath) return;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 300);
    if (error || !data?.signedUrl) { toast({ title: "Private file access failed", description: error?.message || "Signed URL unavailable", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const addTracking = async () => {
    if (!shipment || !trackingDraft.at) { toast({ title: "Tracking event time is required", variant: "destructive" }); return; }
    setBusy("tracking");
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("production_tracking_events").insert({
      shipment_id: shipment.id, production_job_id: shipment.production_job_id, event_type: trackingDraft.event, occurred_at: new Date(trackingDraft.at).toISOString(),
      location_text: trackingDraft.location.trim() || null, carrier_status: trackingDraft.carrierStatus.trim() || null, tracking_number: trackingDraft.trackingNumber.trim() || shipment.master_tracking_number || null,
      source: "manual_verified", evidence: { entered_from: "admin", buyer_notification_sent: false }, notes: trackingDraft.notes.trim() || null, recorded_by: auth.user?.id || null,
    });
    setBusy(null);
    if (error) { toast({ title: "Tracking event failed", description: error.message, variant: "destructive" }); return; }
    if (trackingDraft.event === "exception") await db.from("production_shipments").update({ status: "exception" }).eq("id", shipment.id);
    setTrackingDraft(EMPTY_TRACKING); toast({ title: "Tracking evidence recorded" }); await refreshAll();
  };

  const checkReadiness = async () => {
    if (!shipment) return;
    setBusy("readiness");
    const { data, error } = await db.rpc("production_shipping_readiness", { _shipment_id: shipment.id });
    setBusy(null);
    if (error) { toast({ title: "Server readiness check failed", description: error.message, variant: "destructive" }); return; }
    setServerReadiness({ ready: Boolean(data?.ready), missing: Array.isArray(data?.missing) ? data.missing : [] });
  };

  const approveDispatch = async () => {
    if (!shipment || !window.confirm("Approve internal dispatch readiness? This will not book a courier or notify the buyer.")) return;
    setBusy("approve");
    const { error } = await db.rpc("production_approve_dispatch", { _shipment_id: shipment.id });
    setBusy(null);
    if (error) { toast({ title: "Dispatch approval blocked", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Internal dispatch approved", description: "No courier booking or buyer notification was sent." }); await refreshAll();
  };

  const recordDispatch = async () => {
    if (!shipment) return;
    const booking = window.prompt("Exact courier/freight booking reference");
    if (!booking?.trim()) return;
    const trackingNumber = window.prompt("Exact tracking / AWB / BL number");
    if (!trackingNumber?.trim()) return;
    const trackingUrlInput = window.prompt("HTTPS tracking URL (optional)") || "";
    const trackingUrl = trackingUrlInput ? safeTrackingUrl(trackingUrlInput) : null;
    if (trackingUrlInput && !trackingUrl) { toast({ title: "Use a valid HTTPS tracking URL", variant: "destructive" }); return; }
    setBusy("dispatch");
    const { error } = await db.rpc("production_record_dispatch", { _shipment_id: shipment.id, _booking_reference: booking.trim(), _tracking_number: trackingNumber.trim(), _tracking_url: trackingUrl });
    setBusy(null);
    if (error) { toast({ title: "Dispatch evidence was not recorded", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Shipment marked in transit", description: "Recorded from booking evidence; no buyer message was sent." }); await refreshAll();
  };

  const uploadDeliveryEvidence = async (file: File | null) => {
    if (!shipment || !deliveryDraft.deliveredAt || !deliveryDraft.recipient.trim()) { toast({ title: "Delivery time and recipient are required", variant: "destructive" }); return; }
    if (file && (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_BYTES)) { toast({ title: "Unsupported or oversized file", variant: "destructive" }); return; }
    setBusy("delivery");
    let objectPath: string | null = null;
    let sha256: string | null = null;
    if (file) {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-") || "delivery-evidence";
      objectPath = `${shipment.production_job_id}/delivery/${shipment.id}/${crypto.randomUUID()}-${safeName}`;
      sha256 = await hashFile(file);
      const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, { upsert: false, contentType: file.type });
      if (error) { setBusy(null); toast({ title: "Delivery evidence upload failed", description: error.message, variant: "destructive" }); return; }
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("production_delivery_evidence").insert({
      shipment_id: shipment.id, production_job_id: shipment.production_job_id, delivered_at: new Date(deliveryDraft.deliveredAt).toISOString(), recipient_name: deliveryDraft.recipient.trim(),
      recipient_role: deliveryDraft.role.trim() || null, delivery_location: deliveryDraft.location.trim() || null, evidence_type: deliveryDraft.type, bucket: BUCKET,
      object_path: objectPath, file_name: file?.name || null, mime_type: file?.type || null, size_bytes: file?.size || null, sha256, verification_status: "pending", notes: deliveryDraft.notes.trim() || null, created_by: auth.user?.id || null,
    });
    if (error) { if (objectPath) await supabase.storage.from(BUCKET).remove([objectPath]); setBusy(null); toast({ title: "Delivery evidence save failed", description: error.message, variant: "destructive" }); return; }
    setBusy(null); setDeliveryDraft(EMPTY_DELIVERY); toast({ title: "Delivery evidence recorded", description: "Verify it before confirming delivery." }); await refreshAll();
  };

  const verifyDelivery = async (row: DeliveryRow) => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("production_delivery_evidence").update({ verification_status: "verified", verified_by: auth.user?.id || null, verified_at: new Date().toISOString() }).eq("id", row.id);
    if (error) { toast({ title: "Delivery evidence verification failed", description: error.message, variant: "destructive" }); return; }
    await refreshAll();
  };

  const confirmDelivery = async (row: DeliveryRow) => {
    if (!shipment || row.verification_status !== "verified" || !window.confirm("Confirm delivery from this verified evidence? Commercial completion remains separate.")) return;
    setBusy("confirm-delivery");
    const { error } = await db.rpc("production_confirm_delivery", { _shipment_id: shipment.id, _delivery_evidence_id: row.id });
    setBusy(null);
    if (error) { toast({ title: "Delivery confirmation failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Delivery confirmed from verified evidence" }); await refreshAll();
  };

  if (loading && summaries.length === 0 && !backendError) return <div className="py-10 text-center text-sm text-muted-foreground">Loading shipping control…</div>;
  if (backendError) return <section className="border border-amber-500/35 bg-amber-500/[0.05] p-6"><div className="flex items-start gap-3"><AlertTriangle size={20} className="text-amber-300 mt-1 shrink-0" /><div><p className="eyebrow">Phase 6.3</p><h2 className="font-display text-2xl mt-2">Shipping backend activation pending</h2><p className="text-sm text-foreground/65 mt-2">Frontend and migration source are prepared. Activate them during the final one-time database migration.</p><code className="block text-xs text-amber-200 mt-3 break-all">{MIGRATION}</code><p className="text-[10px] text-foreground/45 mt-2 break-all">Runtime evidence: {backendError}</p></div></div></section>;

  return <section className="border border-gold/40 bg-card/20">
    <header className="p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
      <div className="flex items-start gap-3"><Truck size={23} className="text-gold mt-1 shrink-0" /><div><p className="eyebrow mb-2">Phase 6.3 · Dispatch</p><h2 className="font-display text-2xl md:text-4xl">Packing & Shipping Control</h2><p className="text-sm text-foreground/65 mt-3 max-w-4xl">Prepare cartons, private export documents, dispatch approval, exact tracking events and delivery evidence. Internal targets never become buyer promises and this panel never books a courier automatically.</p></div></div>
      <button type="button" onClick={() => void refreshAll()} disabled={loading || busy !== null} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
    </header>

    <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border/60"><Metric label="Active shipments" value={stats.active} /><Metric label="Ready to dispatch" value={stats.dispatchReady} /><Metric label="In transit" value={stats.inTransit} /><Metric label="Exceptions" value={stats.exceptions} attention={stats.exceptions > 0} /></div>

    <div className="p-4 md:p-5 border-b border-border/60 grid md:grid-cols-[1fr_auto] gap-3">
      <select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)} className={FIELD}><option value="">Create shipment for production job…</option>{jobs.filter((job) => !summaries.some((row) => row.production_job_id === job.id)).map((job) => <option key={job.id} value={job.id}>{job.job_number} · {job.product_name} · {job.company_name || job.buyer_name}</option>)}</select>
      <button type="button" onClick={() => void createShipment()} disabled={!selectedJobId || busy !== null} className="min-h-11 inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 text-[10px] uppercase tracking-[0.15em] disabled:opacity-50"><Plus size={13} /> {busy === "create" ? "Creating…" : "Create internal shipment"}</button>
    </div>

    <div className="grid xl:grid-cols-[320px_minmax(0,1fr)] min-h-[500px]">
      <aside className="border-r border-border/60 max-h-[78vh] overflow-y-auto">{summaries.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No shipment records yet.</p> : summaries.map((row) => <button key={row.shipment_id} type="button" onClick={() => setSelectedShipmentId(row.shipment_id)} className={`w-full text-left p-4 border-b border-border/50 ${selectedShipmentId === row.shipment_id ? "bg-gold/5 border-l-2 border-l-gold" : "border-l-2 border-l-transparent hover:bg-muted/20"}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{row.shipment_number} · {row.status.replaceAll("_", " ")}</p><p className="font-display text-lg truncate mt-1">{row.product_name}</p><p className="text-xs text-muted-foreground truncate mt-1">{row.company_name || row.buyer_name} · {row.destination_country || "Destination pending"}</p></div><RiskBadge risk={row.risk_level} /></div><div className="grid grid-cols-3 gap-1 mt-3 text-[9px] text-muted-foreground"><span>{row.package_count} pkg</span><span>{row.verified_required_documents}/{row.required_documents} docs</span><span>{row.tracking_event_count} events</span></div></button>)}</aside>

      {!shipment || !selectedSummary ? <div className="p-12 text-center"><Route size={32} className="mx-auto text-gold" /><p className="font-display text-2xl mt-4">Select or create a shipment</p></div> : <main className="p-4 md:p-5 space-y-5 min-w-0">
        <section className="border border-border/60 bg-background/25 p-4 md:p-5"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{shipment.shipment_number} · {selectedSummary.job_number}</p><h3 className="font-display text-2xl mt-1">{selectedSummary.product_name}</h3><p className="text-xs text-muted-foreground mt-1">{selectedSummary.company_name || selectedSummary.buyer_name} · {selectedSummary.quantity_text}</p></div><div className="flex flex-wrap gap-2"><Badge text={shipment.status.replaceAll("_", " ")} /><RiskBadge risk={risk} /><Badge text={shipment.dispatch_approved_at ? "owner dispatch approved" : "approval pending"} good={Boolean(shipment.dispatch_approved_at)} /></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4"><Mini label="Packages" value={totals.packages} /><Mini label="Units" value={totals.units} /><Mini label="Gross kg" value={totals.grossWeightKg.toFixed(2)} /><Mini label="Volume m³" value={totals.volumeM3.toFixed(3)} /></div></section>

        {detailsLoading ? <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-gold" /></div> : <>
          <details open className="border border-border/60"><summary className="cursor-pointer p-4 font-display text-xl">1. Shipment profile & consignee</summary><div className="p-4 pt-0 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <Select label="Mode" value={profile.mode} options={["courier","air_freight","sea_freight","road_freight","hand_carry","other"]} onChange={(value) => setProfile((current) => ({ ...current, mode: value }))} />
            <Select label="Incoterm" value={profile.incoterm} options={["EXW","FCA","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP","OTHER"]} onChange={(value) => setProfile((current) => ({ ...current, incoterm: value }))} />
            <Input label="Destination country *" value={profile.country} onChange={(value) => setProfile((current) => ({ ...current, country: value }))} />
            <Input label="Destination city" value={profile.city} onChange={(value) => setProfile((current) => ({ ...current, city: value }))} />
            <div className="sm:col-span-2"><Input label="Destination address *" value={profile.address} onChange={(value) => setProfile((current) => ({ ...current, address: value }))} /></div>
            <Input label="Consignee name *" value={profile.consignee} onChange={(value) => setProfile((current) => ({ ...current, consignee: value }))} />
            <Input label="Consignee company" value={profile.company} onChange={(value) => setProfile((current) => ({ ...current, company: value }))} />
            <Input label="Consignee phone *" value={profile.phone} onChange={(value) => setProfile((current) => ({ ...current, phone: value }))} />
            <Input label="Consignee email" type="email" value={profile.email} onChange={(value) => setProfile((current) => ({ ...current, email: value }))} />
            <Input label="Courier / forwarder *" value={profile.courier} onChange={(value) => setProfile((current) => ({ ...current, courier: value }))} />
            <Input label="Service level *" value={profile.service} onChange={(value) => setProfile((current) => ({ ...current, service: value }))} />
            <Input label="Internal expected dispatch" type="datetime-local" value={profile.dispatchAt} onChange={(value) => setProfile((current) => ({ ...current, dispatchAt: value }))} />
            <Input label="Internal expected delivery" type="datetime-local" value={profile.deliveryAt} onChange={(value) => setProfile((current) => ({ ...current, deliveryAt: value }))} />
            <Input label="Declared value" type="number" value={profile.declaredValue} onChange={(value) => setProfile((current) => ({ ...current, declaredValue: value }))} />
            <Input label="Currency" value={profile.currency} onChange={(value) => setProfile((current) => ({ ...current, currency: value.toUpperCase().slice(0,3) }))} />
            <Input label="Customs reference" value={profile.customsReference} onChange={(value) => setProfile((current) => ({ ...current, customsReference: value }))} />
            <Input label="Export reason" value={profile.exportReason} onChange={(value) => setProfile((current) => ({ ...current, exportReason: value }))} />
            <div className="sm:col-span-2 xl:col-span-4"><Input label="Internal notes" value={profile.notes} onChange={(value) => setProfile((current) => ({ ...current, notes: value }))} /></div>
            <button type="button" onClick={() => void saveProfile()} disabled={busy !== null} className="min-h-11 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50">{busy === "profile" ? "Saving…" : "Save profile"}</button>
          </div></details>

          <details open className="border border-border/60"><summary className="cursor-pointer p-4 font-display text-xl">2. Packages & cartons</summary><div className="p-4 pt-0 space-y-4"><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><Input label="Package no. *" value={packageDraft.number} onChange={(value) => setPackageDraft((current) => ({ ...current, number: value }))} /><Select label="Type" value={packageDraft.type} options={["carton","polybag","crate","pallet","garment_bag","other"]} onChange={(value) => setPackageDraft((current) => ({ ...current, type: value }))} /><Input label="Units *" type="number" value={packageDraft.units} onChange={(value) => setPackageDraft((current) => ({ ...current, units: value }))} /><Input label="Net kg" type="number" value={packageDraft.net} onChange={(value) => setPackageDraft((current) => ({ ...current, net: value }))} /><Input label="Gross kg *" type="number" value={packageDraft.gross} onChange={(value) => setPackageDraft((current) => ({ ...current, gross: value }))} /><Input label="Length cm" type="number" value={packageDraft.length} onChange={(value) => setPackageDraft((current) => ({ ...current, length: value }))} /><Input label="Width cm" type="number" value={packageDraft.width} onChange={(value) => setPackageDraft((current) => ({ ...current, width: value }))} /><Input label="Height cm" type="number" value={packageDraft.height} onChange={(value) => setPackageDraft((current) => ({ ...current, height: value }))} /><Input label="Seal number" value={packageDraft.seal} onChange={(value) => setPackageDraft((current) => ({ ...current, seal: value }))} /><Input label="Contents" value={packageDraft.contents} onChange={(value) => setPackageDraft((current) => ({ ...current, contents: value }))} /></div><button type="button" onClick={() => void addPackage()} disabled={busy !== null} className="min-h-11 inline-flex items-center gap-2 border border-gold/60 text-gold px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"><Plus size={13} /> Add package</button><div className="grid md:grid-cols-2 gap-2">{packages.map((pkg) => <article key={pkg.id} className="border border-border/60 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-lg">{pkg.package_number}</p><p className="text-xs text-muted-foreground mt-1">{pkg.package_type} · {pkg.unit_count} units · {pkg.gross_weight_kg} kg</p></div><Badge text={pkg.status} good={["sealed","loaded","delivered"].includes(pkg.status)} /></div><div className="mt-3 flex gap-2"><select value={pkg.status} onChange={(event) => void setPackageStatus(pkg, event.target.value as PackageStatus)} className="min-h-10 flex-1 bg-background border border-border/60 px-2 text-xs">{["planned","packed","sealed","loaded","delivered","damaged"].map((value) => <option key={value}>{value}</option>)}</select>{pkg.seal_number && <span className="border border-border/60 px-3 py-2 text-xs">Seal {pkg.seal_number}</span>}</div>{pkg.damage_note && <p className="text-xs text-red-300 mt-2">{pkg.damage_note}</p>}</article>)}</div></div></details>

          <details open className="border border-border/60"><summary className="cursor-pointer p-4 font-display text-xl">3. Private shipping documents</summary><div className="p-4 pt-0 space-y-4"><div className="grid sm:grid-cols-3 gap-3"><Select label="Document type" value={documentType} options={["commercial_invoice","packing_list","certificate_of_origin","air_waybill","bill_of_lading","courier_label","customs_declaration","insurance","inspection_report","other"]} onChange={(value) => setDocumentType(value as ShippingDocumentType)} /><Input label="Document number" value={documentNumber} onChange={setDocumentNumber} /><label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" checked={documentRequired} onChange={(event) => setDocumentRequired(event.target.checked)} /> Required for dispatch</label></div><button type="button" onClick={() => documentInput.current?.click()} disabled={busy !== null} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"><UploadCloud size={14} /> {busy === "document" ? "Uploading…" : "Upload private document"}</button><input ref={documentInput} className="hidden" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadShippingDocument(file); event.target.value = ""; }} />
            <div className="space-y-2">{documents.map((doc) => <article key={doc.id} className="border border-border/60 p-3 flex flex-col lg:flex-row lg:items-center gap-3"><FileText size={18} className="text-gold shrink-0" /><div className="flex-1 min-w-0"><p className="truncate">{doc.file_name || doc.document_type.replaceAll("_"," ")}</p><p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">{doc.document_type.replaceAll("_"," ")} · {doc.required ? "required" : "optional"} · {doc.verification_status}</p>{doc.sha256 && <p className="text-[9px] text-foreground/35 truncate mt-1">SHA-256 {doc.sha256}</p>}</div><div className="flex gap-2"><button type="button" onClick={() => void openPrivateFile(doc.bucket, doc.object_path)} className="min-h-10 border border-border/60 px-3 text-xs inline-flex items-center gap-1"><Download size={12} /> Open</button><button type="button" onClick={() => void verifyDocument(doc,"verified")} className="min-h-10 border border-emerald-500/40 text-emerald-300 px-3 text-xs">Verify</button><button type="button" onClick={() => void verifyDocument(doc,"rejected")} className="min-h-10 border border-red-500/40 text-red-300 px-3 text-xs">Reject</button></div></article>)}</div>
          </div></details>

          <details className="border border-border/60"><summary className="cursor-pointer p-4 font-display text-xl">4. Dispatch approval & tracking</summary><div className="p-4 pt-0 space-y-4"><div className={`border p-4 ${clientReadiness.ready ? "border-emerald-500/35 bg-emerald-500/[0.04]" : "border-amber-500/35 bg-amber-500/[0.04]"}`}><div className="flex items-start gap-3">{clientReadiness.ready ? <CheckCircle2 size={19} className="text-emerald-300" /> : <AlertTriangle size={19} className="text-amber-300" />}<div><p className="font-display text-xl">Client evidence check: {clientReadiness.ready ? "Ready" : "Blocked"}</p>{!clientReadiness.ready && <p className="text-xs text-foreground/60 mt-2">{clientReadiness.missing.join(" · ")}</p>}</div></div>{serverReadiness && <p className={`text-xs mt-3 ${serverReadiness.ready ? "text-emerald-300" : "text-amber-300"}`}>Server check: {serverReadiness.ready ? "ready" : serverReadiness.missing.join(" · ")}</p>}<div className="flex flex-wrap gap-2 mt-4"><button type="button" onClick={() => void checkReadiness()} disabled={busy !== null} className="min-h-10 border border-border/60 px-3 text-[9px] uppercase tracking-[0.13em]">Run server check</button><button type="button" onClick={() => void approveDispatch()} disabled={busy !== null || !clientReadiness.ready} className="min-h-10 border border-gold/60 text-gold px-3 text-[9px] uppercase tracking-[0.13em] disabled:opacity-40"><ShieldCheck size={12} className="inline mr-1" /> Owner approve dispatch</button><button type="button" onClick={() => void recordDispatch()} disabled={busy !== null || !shipment.dispatch_approved_at || Boolean(shipment.dispatched_at)} className="min-h-10 bg-gradient-gold text-primary-foreground px-3 text-[9px] uppercase tracking-[0.13em] disabled:opacity-40"><Truck size={12} className="inline mr-1" /> Record actual dispatch</button></div></div>
            <div className="grid sm:grid-cols-3 gap-3"><Select label="Event" value={trackingDraft.event} options={["booking_created","picked_up","departed","arrived_hub","customs_hold","customs_cleared","out_for_delivery","delivered","exception","returned"]} onChange={(value) => setTrackingDraft((current) => ({ ...current, event: value as TrackingEventType }))} /><Input label="Occurred at *" type="datetime-local" value={trackingDraft.at} onChange={(value) => setTrackingDraft((current) => ({ ...current, at: value }))} /><Input label="Location" value={trackingDraft.location} onChange={(value) => setTrackingDraft((current) => ({ ...current, location: value }))} /><Input label="Carrier status" value={trackingDraft.carrierStatus} onChange={(value) => setTrackingDraft((current) => ({ ...current, carrierStatus: value }))} /><Input label="Tracking no." value={trackingDraft.trackingNumber} onChange={(value) => setTrackingDraft((current) => ({ ...current, trackingNumber: value }))} /><Input label="Notes" value={trackingDraft.notes} onChange={(value) => setTrackingDraft((current) => ({ ...current, notes: value }))} /></div><button type="button" onClick={() => void addTracking()} disabled={busy !== null} className="min-h-11 border border-gold/60 text-gold px-4 text-[10px] uppercase tracking-[0.14em]">Add verified event</button>
            <div className="space-y-0">{tracking.map((event,index) => <div key={event.id} className="grid grid-cols-[22px_1fr] gap-3"><div className="flex flex-col items-center"><span className="w-2.5 h-2.5 rounded-full bg-gold mt-1" />{index<tracking.length-1 && <span className="w-px flex-1 min-h-10 bg-border" />}</div><div className="pb-4"><p className="text-[9px] uppercase tracking-[0.13em] text-gold">{trackingEventLabel(event.event_type)}</p><p className="text-sm mt-1">{event.location_text || "Location not recorded"}{event.carrier_status ? ` · ${event.carrier_status}` : ""}</p><p className="text-xs text-muted-foreground mt-1">{new Date(event.occurred_at).toLocaleString()} · {event.source}</p></div></div>)}</div>
          </div></details>

          <details className="border border-border/60"><summary className="cursor-pointer p-4 font-display text-xl">5. Delivery evidence</summary><div className="p-4 pt-0 space-y-4"><div className="grid sm:grid-cols-3 gap-3"><Input label="Delivered at *" type="datetime-local" value={deliveryDraft.deliveredAt} onChange={(value) => setDeliveryDraft((current) => ({ ...current, deliveredAt: value }))} /><Input label="Recipient *" value={deliveryDraft.recipient} onChange={(value) => setDeliveryDraft((current) => ({ ...current, recipient: value }))} /><Input label="Recipient role" value={deliveryDraft.role} onChange={(value) => setDeliveryDraft((current) => ({ ...current, role: value }))} /><Input label="Delivery location" value={deliveryDraft.location} onChange={(value) => setDeliveryDraft((current) => ({ ...current, location: value }))} /><Select label="Evidence type" value={deliveryDraft.type} options={["carrier_pod","buyer_confirmation","signed_document","delivery_photo","other"]} onChange={(value) => setDeliveryDraft((current) => ({ ...current, type: value }))} /><Input label="Notes" value={deliveryDraft.notes} onChange={(value) => setDeliveryDraft((current) => ({ ...current, notes: value }))} /></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void uploadDeliveryEvidence(null)} disabled={busy !== null} className="min-h-11 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em]">Save evidence without file</button><button type="button" onClick={() => deliveryInput.current?.click()} disabled={busy !== null} className="min-h-11 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.14em]"><UploadCloud size={13} className="inline mr-1" /> Upload POD/evidence</button><input ref={deliveryInput} className="hidden" type="file" onChange={(event) => { const file=event.target.files?.[0]||null; if(file) void uploadDeliveryEvidence(file); event.target.value=""; }} /></div>
            <div className="space-y-2">{deliveries.map((row) => <article key={row.id} className="border border-border/60 p-3 flex flex-col lg:flex-row lg:items-center gap-3"><PackageCheck size={18} className="text-gold" /><div className="flex-1"><p>{row.recipient_name} · {new Date(row.delivered_at).toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">{row.evidence_type.replaceAll("_"," ")} · {row.verification_status} · {row.delivery_location || "location missing"}</p></div><div className="flex gap-2">{row.object_path && <button type="button" onClick={() => void openPrivateFile(row.bucket,row.object_path)} className="min-h-10 border border-border/60 px-3 text-xs">Open</button>}<button type="button" onClick={() => void verifyDelivery(row)} disabled={row.verification_status === "verified"} className="min-h-10 border border-emerald-500/40 text-emerald-300 px-3 text-xs disabled:opacity-40">Verify</button><button type="button" onClick={() => void confirmDelivery(row)} disabled={row.verification_status !== "verified" || Boolean(shipment.delivered_at)} className="min-h-10 border border-gold/60 text-gold px-3 text-xs disabled:opacity-40">Confirm delivered</button></div></article>)}</div>
          </div></details>
        </>}
      </main>}
    </div>
  </section>;
}

function Metric({ label, value, attention=false }: { label:string; value:number; attention?:boolean }) { return <div className="p-4 border-r border-border/60 last:border-r-0"><p className={`font-display text-2xl ${attention?"text-red-300":""}`}>{value}</p><p className="text-[8px] uppercase tracking-[0.13em] text-muted-foreground mt-1">{label}</p></div>; }
function Mini({ label, value }: { label:string; value:string|number }) { return <div className="border border-border/50 p-2"><p className="text-[8px] uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="text-sm mt-1">{value}</p></div>; }
function Badge({ text, good=false }: { text:string; good?:boolean }) { return <span className={`border px-2 py-1 text-[8px] uppercase tracking-[0.11em] ${good?"border-emerald-500/40 text-emerald-300":"border-border/60 text-muted-foreground"}`}>{text}</span>; }
function RiskBadge({ risk }: { risk:"clear"|"attention"|"blocked" }) { return <span className={`border px-2 py-1 text-[8px] uppercase tracking-[0.11em] ${risk==="clear"?"border-emerald-500/40 text-emerald-300":risk==="blocked"?"border-red-500/40 text-red-300":"border-amber-500/40 text-amber-300"}`}>{risk}</span>; }
function Input({ label, value, onChange, type="text" }: { label:string; value:string; onChange:(value:string)=>void; type?:string }) { return <label className="block"><span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><input type={type} value={value} onChange={(event)=>onChange(event.target.value)} className={`${FIELD} mt-1`} /></label>; }
function Select({ label, value, options, onChange }: { label:string; value:string; options:readonly string[]; onChange:(value:string)=>void }) { return <label className="block"><span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><select value={value} onChange={(event)=>onChange(event.target.value)} className={`${FIELD} mt-1`}>{options.map((option)=><option key={option} value={option}>{option.replaceAll("_"," ")}</option>)}</select></label>; }
function toLocal(value:string|null) { if(!value) return ""; const date=new Date(value); const offset=date.getTimezoneOffset()*60000; return new Date(date.getTime()-offset).toISOString().slice(0,16); }
async function hashFile(file:File) { if(!globalThis.crypto?.subtle) return null; const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer()); return Array.from(new Uint8Array(digest)).map((byte)=>byte.toString(16).padStart(2,"0")).join(""); }
