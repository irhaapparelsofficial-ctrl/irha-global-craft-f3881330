import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  Truck,
  UploadCloud,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  dispatchReadiness,
  dispatchRisk,
  packageTotals,
  safeTrackingUrl,
  type DispatchDocument,
  type DispatchDocumentType,
  type DispatchPackage,
  type ShipmentMode,
  type ShipmentRecord,
  type ShipmentStatus,
} from "@/lib/productionShipping";

const db = supabase as any;
const MIGRATION = "supabase/migrations/20260713234000_production_shipping_dispatch.sql";
const BUCKET = "production-shipping-documents";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const FIELD = "min-h-11 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold";
const DOCUMENT_TYPES: DispatchDocumentType[] = [
  "packing_list", "commercial_invoice", "proforma_invoice", "certificate_of_origin",
  "customs_declaration", "airway_bill", "bill_of_lading", "courier_label",
  "delivery_note", "insurance", "other",
];
const SHIPMENT_STATUSES: ShipmentStatus[] = ["draft", "quoted", "booked", "collected", "in_transit", "customs_hold", "out_for_delivery", "delivered", "exception", "cancelled"];
const MODES: ShipmentMode[] = ["courier", "air", "sea", "road", "pickup"];
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

type SummaryRow = {
  production_job_id: string;
  job_number: string;
  job_type: "sample" | "order";
  buyer_name: string;
  company_name: string | null;
  product_name: string;
  quantity_text: string;
  quality_release_status: string;
  dispatch_status: string;
  dispatch_risk: "clear" | "attention" | "blocked";
  dispatch_release_status: string;
  dispatch_released_at: string | null;
  package_count: number;
  total_items: number;
  net_weight_kg: number;
  gross_weight_kg: number;
  verified_documents: number;
  rejected_documents: number;
  shipment_id: string | null;
  shipment_mode: ShipmentMode | null;
  shipment_status: ShipmentStatus | null;
  courier_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  booked_at: string | null;
  collected_at: string | null;
  delivered_at: string | null;
  open_exceptions: number;
  verified_delivery_evidence: number;
  updated_at: string;
};

type PackageRow = {
  id: string;
  production_job_id: string;
  carton_no: number;
  package_type: string;
  item_count: number;
  net_weight_kg: number;
  gross_weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  packing_status: DispatchPackage["packingStatus"];
  contents: string | null;
  seal_reference: string | null;
  notes: string | null;
};

type DocumentRow = {
  id: string;
  production_job_id: string;
  shipment_id: string | null;
  document_type: DispatchDocumentType;
  document_reference: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  verification_status: "pending" | "verified" | "rejected";
  verification_note: string | null;
  created_at: string;
};

type ShipmentRow = {
  id: string;
  production_job_id: string;
  shipment_number: string;
  mode: ShipmentMode;
  status: ShipmentStatus;
  courier_name: string;
  service_level: string | null;
  booking_reference: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  origin_text: string | null;
  destination_text: string;
  incoterm: string | null;
  planned_dispatch_at: string | null;
  booked_at: string | null;
  collected_at: string | null;
  delivered_at: string | null;
  exception_note: string | null;
};

type TrackingRow = {
  id: string;
  shipment_id: string;
  event_status: string;
  event_time: string;
  location_text: string | null;
  description: string;
  source: string;
  evidence_reference: string | null;
};

type DeliveryRow = {
  id: string;
  shipment_id: string;
  evidence_type: "pickup" | "handover" | "tracking" | "delivery" | "exception";
  reference: string;
  recipient_name: string | null;
  delivered_at: string | null;
  verification_status: "pending" | "verified" | "rejected";
  created_at: string;
};

type PackageDraft = { cartonNo: string; packageType: string; itemCount: string; netWeight: string; grossWeight: string; length: string; width: string; height: string; contents: string; seal: string };
type ShipmentDraft = { mode: ShipmentMode; courier: string; service: string; booking: string; tracking: string; trackingUrl: string; origin: string; destination: string; incoterm: string; plannedDispatch: string };
type TrackingDraft = { status: string; eventTime: string; location: string; description: string; reference: string };
type DeliveryDraft = { type: DeliveryRow["evidence_type"]; reference: string; recipient: string; deliveredAt: string };

const EMPTY_PACKAGE: PackageDraft = { cartonNo: "1", packageType: "carton", itemCount: "", netWeight: "", grossWeight: "", length: "", width: "", height: "", contents: "", seal: "" };
const EMPTY_SHIPMENT: ShipmentDraft = { mode: "courier", courier: "", service: "", booking: "", tracking: "", trackingUrl: "", origin: "Sialkot, Pakistan", destination: "", incoterm: "", plannedDispatch: "" };
const EMPTY_TRACKING: TrackingDraft = { status: "booked", eventTime: new Date().toISOString().slice(0, 16), location: "", description: "", reference: "" };
const EMPTY_DELIVERY: DeliveryDraft = { type: "delivery", reference: "", recipient: "", deliveredAt: "" };

export default function ProductionShippingPanel() {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [jobs, setJobs] = useState<SummaryRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [shipment, setShipment] = useState<ShipmentRow | null>(null);
  const [tracking, setTracking] = useState<TrackingRow[]>([]);
  const [delivery, setDelivery] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [packageDraft, setPackageDraft] = useState<PackageDraft>(EMPTY_PACKAGE);
  const [shipmentDraft, setShipmentDraft] = useState<ShipmentDraft>(EMPTY_SHIPMENT);
  const [trackingDraft, setTrackingDraft] = useState<TrackingDraft>(EMPTY_TRACKING);
  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryDraft>(EMPTY_DELIVERY);
  const [documentType, setDocumentType] = useState<DispatchDocumentType>("packing_list");
  const [documentReference, setDocumentReference] = useState("");
  const [requireOriginCertificate, setRequireOriginCertificate] = useState(false);
  const [serverReadiness, setServerReadiness] = useState<{ ready: boolean; missing: string[]; warnings?: string[] } | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("production_dispatch_summary").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) {
      setBackendError(error.message || "Dispatch backend unavailable");
      setJobs([]);
    } else {
      const next = (data || []) as SummaryRow[];
      setBackendError(null);
      setJobs(next);
      setSelectedId((current) => current && next.some((row) => row.production_job_id === current) ? current : next[0]?.production_job_id || "");
    }
    setLoading(false);
  }, []);

  const loadDetails = useCallback(async (jobId: string) => {
    if (!jobId) return;
    setDetailsLoading(true);
    const [packageResult, documentResult, shipmentResult] = await Promise.all([
      db.from("production_packages").select("*").eq("production_job_id", jobId).order("carton_no"),
      db.from("production_shipping_documents").select("*").eq("production_job_id", jobId).order("created_at", { ascending: false }),
      db.from("production_shipments").select("*").eq("production_job_id", jobId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const error = packageResult.error || documentResult.error || shipmentResult.error;
    if (error) {
      toast({ title: "Dispatch details could not load", description: error.message, variant: "destructive" });
      setDetailsLoading(false);
      return;
    }
    const shipmentRow = (shipmentResult.data || null) as ShipmentRow | null;
    setPackages((packageResult.data || []) as PackageRow[]);
    setDocuments((documentResult.data || []) as DocumentRow[]);
    setShipment(shipmentRow);
    if (shipmentRow) {
      const [trackingResult, deliveryResult] = await Promise.all([
        db.from("production_tracking_events").select("*").eq("shipment_id", shipmentRow.id).order("event_time", { ascending: false }),
        db.from("production_delivery_evidence").select("*").eq("shipment_id", shipmentRow.id).order("created_at", { ascending: false }),
      ]);
      setTracking((trackingResult.data || []) as TrackingRow[]);
      setDelivery((deliveryResult.data || []) as DeliveryRow[]);
    } else {
      setTracking([]);
      setDelivery([]);
    }
    setServerReadiness(null);
    setDetailsLoading(false);
  }, []);

  useEffect(() => { void loadJobs(); }, [loadJobs]);
  useEffect(() => { void loadDetails(selectedId); }, [loadDetails, selectedId]);

  const selected = useMemo(() => jobs.find((row) => row.production_job_id === selectedId) || null, [jobs, selectedId]);
  const clientPackages = useMemo<DispatchPackage[]>(() => packages.map((row) => ({ cartonNo: Number(row.carton_no), itemCount: Number(row.item_count), netWeightKg: Number(row.net_weight_kg), grossWeightKg: Number(row.gross_weight_kg), lengthCm: Number(row.length_cm), widthCm: Number(row.width_cm), heightCm: Number(row.height_cm), packingStatus: row.packing_status })), [packages]);
  const clientDocuments = useMemo<DispatchDocument[]>(() => documents.map((row) => ({ documentType: row.document_type, verificationStatus: row.verification_status, fileName: row.file_name, reference: row.document_reference })), [documents]);
  const clientShipment = useMemo<ShipmentRecord | null>(() => shipment ? ({ mode: shipment.mode, status: shipment.status, courierName: shipment.courier_name, trackingNumber: shipment.tracking_number, trackingUrl: shipment.tracking_url, bookedAt: shipment.booked_at, collectedAt: shipment.collected_at, deliveredAt: shipment.delivered_at }) : null, [shipment]);
  const clientDelivery = useMemo(() => delivery.map((row) => ({ evidenceType: row.evidence_type, verificationStatus: row.verification_status, reference: row.reference })), [delivery]);
  const readiness = useMemo(() => dispatchReadiness({ qualityReleaseStatus: selected?.quality_release_status, packages: clientPackages, documents: clientDocuments, shipment: clientShipment, deliveryEvidence: clientDelivery, requireCommercialInvoice: true, requireOriginCertificate }), [clientDelivery, clientDocuments, clientPackages, clientShipment, requireOriginCertificate, selected?.quality_release_status]);
  const risk = useMemo(() => dispatchRisk({ qualityReleaseStatus: selected?.quality_release_status, packages: clientPackages, documents: clientDocuments, shipment: clientShipment, deliveryEvidence: clientDelivery, requireCommercialInvoice: true, requireOriginCertificate }), [clientDelivery, clientDocuments, clientPackages, clientShipment, requireOriginCertificate, selected?.quality_release_status]);
  const totals = useMemo(() => packageTotals(clientPackages), [clientPackages]);
  const stats = useMemo(() => ({ active: jobs.filter((row) => !["delivered", "cancelled"].includes(row.shipment_status || "draft")).length, blocked: jobs.filter((row) => row.dispatch_risk === "blocked").length, ready: jobs.filter((row) => row.dispatch_release_status === "ready_for_owner_review").length, inTransit: jobs.filter((row) => ["collected", "in_transit", "customs_hold", "out_for_delivery"].includes(row.shipment_status || "")).length }), [jobs]);

  const refresh = async () => { await loadJobs(); await loadDetails(selectedId); };

  const addPackage = async () => {
    if (!selected || Number(packageDraft.cartonNo) <= 0 || Number(packageDraft.itemCount) <= 0) {
      toast({ title: "Carton number and item count are required", variant: "destructive" });
      return;
    }
    setBusy("package:add");
    const { error } = await db.from("production_packages").insert({
      production_job_id: selected.production_job_id,
      carton_no: Number(packageDraft.cartonNo), package_type: packageDraft.packageType.trim() || "carton",
      item_count: Number(packageDraft.itemCount), net_weight_kg: Number(packageDraft.netWeight), gross_weight_kg: Number(packageDraft.grossWeight),
      length_cm: Number(packageDraft.length), width_cm: Number(packageDraft.width), height_cm: Number(packageDraft.height),
      contents: packageDraft.contents.trim() || null, seal_reference: packageDraft.seal.trim() || null, packing_status: "packed",
    });
    setBusy(null);
    if (error) { toast({ title: "Package was not added", description: error.message, variant: "destructive" }); return; }
    setPackageDraft({ ...EMPTY_PACKAGE, cartonNo: String(Math.max(0, ...packages.map((row) => row.carton_no)) + 1) });
    toast({ title: "Package added", description: "Verify carton details before dispatch release." });
    await refresh();
  };

  const verifyPackage = async (row: PackageRow) => {
    setBusy(`package:${row.id}`);
    const { error } = await db.from("production_packages").update({ packing_status: "verified", verified_at: new Date().toISOString() }).eq("id", row.id);
    setBusy(null);
    if (error) { toast({ title: "Package verification failed", description: error.message, variant: "destructive" }); return; }
    await refresh();
  };

  const createShipment = async () => {
    if (!selected || !shipmentDraft.courier.trim() || !shipmentDraft.destination.trim()) {
      toast({ title: "Carrier and destination are required", variant: "destructive" });
      return;
    }
    const trackingUrl = shipmentDraft.trackingUrl.trim() ? safeTrackingUrl(shipmentDraft.trackingUrl) : null;
    if (shipmentDraft.trackingUrl.trim() && !trackingUrl) {
      toast({ title: "Tracking URL must use HTTPS", variant: "destructive" });
      return;
    }
    setBusy("shipment:create");
    const { error } = await db.rpc("production_create_shipment", {
      _job_id: selected.production_job_id, _mode: shipmentDraft.mode, _courier_name: shipmentDraft.courier.trim(),
      _service_level: shipmentDraft.service.trim() || null, _booking_reference: shipmentDraft.booking.trim() || null,
      _tracking_number: shipmentDraft.tracking.trim() || null, _tracking_url: trackingUrl,
      _origin_text: shipmentDraft.origin.trim() || null, _destination_text: shipmentDraft.destination.trim(),
      _incoterm: shipmentDraft.incoterm.trim() || null, _planned_dispatch_at: shipmentDraft.plannedDispatch || null,
    });
    setBusy(null);
    if (error) { toast({ title: "Shipment record was not created", description: error.message, variant: "destructive" }); return; }
    setShipmentDraft(EMPTY_SHIPMENT);
    toast({ title: "Shipment record created", description: "No courier booking was executed externally." });
    await refresh();
  };

  const updateShipmentStatus = async (status: ShipmentStatus) => {
    if (!shipment) return;
    if (!window.confirm(`Record shipment status as ${status.replaceAll("_", " ")}? This records internal evidence only and does not call the carrier.`)) return;
    setBusy("shipment:status");
    const { error } = await db.rpc("production_set_shipment_status", { _shipment_id: shipment.id, _status: status, _note: "Admin-recorded shipment status. Carrier API not called." });
    setBusy(null);
    if (error) { toast({ title: "Shipment status failed", description: error.message, variant: "destructive" }); return; }
    await refresh();
  };

  const uploadDocument = async (file: File) => {
    if (!selected) return;
    if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_BYTES) {
      toast({ title: "Unsupported shipment document", description: "Use PDF, JPG, PNG, WebP, CSV or XLSX up to 20 MB.", variant: "destructive" });
      return;
    }
    setBusy("document:upload");
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
    const objectPath = `${selected.production_job_id}/${crypto.randomUUID()}-${safeName}`;
    let checksum: string | null = null;
    try {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      checksum = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
    } catch { checksum = null; }
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
    if (uploadError) { setBusy(null); toast({ title: "Private document storage is not active yet", description: uploadError.message, variant: "destructive" }); return; }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("production_shipping_documents").insert({
      production_job_id: selected.production_job_id, shipment_id: shipment?.id || null, document_type: documentType,
      document_reference: documentReference.trim() || null, storage_bucket: BUCKET, storage_path: objectPath,
      file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum_sha256: checksum, uploaded_by: auth.user?.id || null,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([objectPath]);
      setBusy(null);
      toast({ title: "Document metadata failed", description: error.message, variant: "destructive" });
      return;
    }
    setDocumentReference("");
    setBusy(null);
    toast({ title: "Private shipment document uploaded", description: "Verification is still required." });
    await refresh();
  };

  const verifyDocument = async (row: DocumentRow, status: "verified" | "rejected") => {
    setBusy(`document:${row.id}`);
    const { error } = await db.rpc("production_verify_shipping_document", { _document_id: row.id, _status: status, _note: status === "verified" ? "Owner/admin verified document evidence." : "Document rejected for replacement." });
    setBusy(null);
    if (error) { toast({ title: "Document review failed", description: error.message, variant: "destructive" }); return; }
    await refresh();
  };

  const openDocument = async (row: DocumentRow) => {
    const { data, error } = await supabase.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 300);
    if (error || !data?.signedUrl) { toast({ title: "Document access failed", description: error?.message || "Signed URL unavailable", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const addTracking = async () => {
    if (!shipment || trackingDraft.description.trim().length < 3) return;
    setBusy("tracking:add");
    const { error } = await db.rpc("production_record_tracking_event", {
      _shipment_id: shipment.id, _event_status: trackingDraft.status, _event_time: new Date(trackingDraft.eventTime).toISOString(),
      _location_text: trackingDraft.location.trim() || null, _description: trackingDraft.description.trim(),
      _source: "manual_verified", _evidence_reference: trackingDraft.reference.trim() || null,
    });
    setBusy(null);
    if (error) { toast({ title: "Tracking event failed", description: error.message, variant: "destructive" }); return; }
    setTrackingDraft({ ...EMPTY_TRACKING, eventTime: new Date().toISOString().slice(0, 16) });
    await refresh();
  };

  const addDeliveryEvidence = async () => {
    if (!shipment || deliveryDraft.reference.trim().length < 3) return;
    setBusy("delivery:add");
    const { error } = await db.rpc("production_record_delivery_evidence", {
      _shipment_id: shipment.id, _evidence_type: deliveryDraft.type, _reference: deliveryDraft.reference.trim(),
      _recipient_name: deliveryDraft.recipient.trim() || null, _delivered_at: deliveryDraft.deliveredAt ? new Date(deliveryDraft.deliveredAt).toISOString() : null,
    });
    setBusy(null);
    if (error) { toast({ title: "Delivery evidence failed", description: error.message, variant: "destructive" }); return; }
    setDeliveryDraft(EMPTY_DELIVERY);
    await refresh();
  };

  const verifyDelivery = async (row: DeliveryRow, status: "verified" | "rejected") => {
    setBusy(`delivery:${row.id}`);
    const { error } = await db.rpc("production_verify_delivery_evidence", { _evidence_id: row.id, _status: status });
    setBusy(null);
    if (error) { toast({ title: "Delivery evidence review failed", description: error.message, variant: "destructive" }); return; }
    await refresh();
  };

  const checkServerReadiness = async () => {
    if (!selected) return;
    setBusy("readiness");
    const { data, error } = await db.rpc("production_dispatch_readiness", { _job_id: selected.production_job_id, _require_origin_certificate: requireOriginCertificate });
    setBusy(null);
    if (error) { toast({ title: "Server readiness failed", description: error.message, variant: "destructive" }); return; }
    setServerReadiness(data as { ready: boolean; missing: string[]; warnings?: string[] });
  };

  const ownerRelease = async () => {
    if (!selected || !serverReadiness?.ready) return;
    if (!window.confirm("Owner approve internal dispatch release? This does not book a courier, send a buyer message or mark the shipment delivered.")) return;
    setBusy("release");
    const { error } = await db.rpc("production_owner_release_dispatch", { _job_id: selected.production_job_id, _require_origin_certificate: requireOriginCertificate });
    setBusy(null);
    if (error) { toast({ title: "Dispatch release blocked", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Internal dispatch release approved", description: "No external carrier or buyer action was executed." });
    await refresh();
  };

  if (loading && jobs.length === 0) return <div className="py-12 text-center text-sm text-muted-foreground">Loading dispatch control…</div>;
  if (backendError) return <section className="border border-amber-500/35 bg-amber-500/[0.05] p-6"><div className="flex gap-3"><AlertTriangle className="text-amber-300 shrink-0" /><div><p className="eyebrow mb-2">Phase 6.3</p><h2 className="font-display text-3xl">Dispatch backend activation pending</h2><p className="text-sm text-foreground/60 mt-3">Frontend code and migration are prepared. Apply the migration only during the final one-time backend activation.</p><code className="block text-xs text-amber-200 mt-3 break-all">{MIGRATION}</code><p className="text-xs text-foreground/45 mt-2 break-all">Runtime evidence: {backendError}</p></div></div></section>;

  return <section className="border border-gold/40 bg-card/20">
    <div className="p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
      <div className="flex gap-3"><Truck className="text-gold shrink-0 mt-1" /><div><p className="eyebrow mb-2">Phase 6.3</p><h2 className="font-display text-3xl md:text-4xl">Packing & Dispatch Control</h2><p className="text-sm text-foreground/60 mt-3 max-w-4xl">Verify cartons, private shipping documents, internal shipment records, tracking evidence and delivery proof. Carrier bookings and buyer messages remain separate owner-approved actions.</p></div></div>
      <button type="button" onClick={() => void refresh()} disabled={loading || busy !== null} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border/60"><Metric label="Active" value={stats.active} /><Metric label="Blocked" value={stats.blocked} attention={stats.blocked > 0} /><Metric label="Owner review" value={stats.ready} /><Metric label="In transit" value={stats.inTransit} /></div>
    <div className="grid xl:grid-cols-[320px_minmax(0,1fr)] gap-0">
      <aside className="border-r border-border/60 p-4"><p className="eyebrow mb-3">Production jobs</p><div className="space-y-2 max-h-[70vh] overflow-y-auto">{jobs.map((row) => <button key={row.production_job_id} type="button" onClick={() => setSelectedId(row.production_job_id)} className={`w-full text-left border p-3 ${selectedId === row.production_job_id ? "border-gold bg-gold/5" : "border-border/60"}`}><p className="text-[9px] uppercase tracking-[0.13em] text-gold">{row.job_number} · {row.job_type}</p><p className="font-display text-lg mt-1 truncate">{row.product_name}</p><p className="text-xs text-muted-foreground mt-1 truncate">{row.company_name || row.buyer_name}</p><div className="flex gap-2 mt-2"><Badge text={row.dispatch_risk} tone={row.dispatch_risk === "blocked" ? "bad" : row.dispatch_risk === "clear" ? "good" : "warn"} /><Badge text={row.shipment_status || "no shipment"} /></div></button>)}</div></aside>
      {!selected ? <div className="p-12 text-center"><Boxes size={28} className="mx-auto text-gold" /><p className="font-display text-2xl mt-3">Select a production job</p></div> : <main className="p-4 md:p-5 space-y-5 min-w-0">
        <div className="border border-border/60 p-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">{selected.job_number} · {selected.quality_release_status}</p><h3 className="font-display text-2xl mt-1">{selected.product_name}</h3><p className="text-xs text-muted-foreground mt-1">{selected.company_name || selected.buyer_name} · {selected.quantity_text}</p></div><div className="flex flex-wrap gap-2"><Badge text={`Risk: ${risk}`} tone={risk === "blocked" ? "bad" : risk === "clear" ? "good" : "warn"} /><Badge text={`Release: ${selected.dispatch_release_status}`} /><Badge text={`${totals.cartons} cartons`} /><Badge text={`${totals.grossWeightKg.toFixed(2)} kg gross`} /></div></div>

        <details open className="border border-border/60"><summary className="cursor-pointer p-4 text-[10px] uppercase tracking-[0.15em] text-gold"><PackageCheck size={14} className="inline mr-2" /> Cartons & packing</summary><div className="border-t border-border/60 p-4 space-y-4"><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><Field label="Carton no" value={packageDraft.cartonNo} onChange={(value) => setPackageDraft((current) => ({ ...current, cartonNo: value }))} type="number" /><Field label="Package type" value={packageDraft.packageType} onChange={(value) => setPackageDraft((current) => ({ ...current, packageType: value }))} /><Field label="Item count" value={packageDraft.itemCount} onChange={(value) => setPackageDraft((current) => ({ ...current, itemCount: value }))} type="number" /><Field label="Net kg" value={packageDraft.netWeight} onChange={(value) => setPackageDraft((current) => ({ ...current, netWeight: value }))} type="number" /><Field label="Gross kg" value={packageDraft.grossWeight} onChange={(value) => setPackageDraft((current) => ({ ...current, grossWeight: value }))} type="number" /><Field label="Length cm" value={packageDraft.length} onChange={(value) => setPackageDraft((current) => ({ ...current, length: value }))} type="number" /><Field label="Width cm" value={packageDraft.width} onChange={(value) => setPackageDraft((current) => ({ ...current, width: value }))} type="number" /><Field label="Height cm" value={packageDraft.height} onChange={(value) => setPackageDraft((current) => ({ ...current, height: value }))} type="number" /><Field label="Contents" value={packageDraft.contents} onChange={(value) => setPackageDraft((current) => ({ ...current, contents: value }))} /><Field label="Seal reference" value={packageDraft.seal} onChange={(value) => setPackageDraft((current) => ({ ...current, seal: value }))} /></div><button type="button" onClick={() => void addPackage()} disabled={busy !== null} className="min-h-11 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"><Plus size={13} className="inline mr-2" /> Add package</button><div className="space-y-2">{packages.length === 0 ? <Empty text="No cartons recorded." /> : packages.map((row) => <article key={row.id} className="border border-border/60 p-3 flex flex-col lg:flex-row lg:items-center gap-3"><div className="flex-1"><p className="font-display text-lg">Carton {row.carton_no} · {row.item_count} items</p><p className="text-xs text-muted-foreground mt-1">{row.net_weight_kg} kg net · {row.gross_weight_kg} kg gross · {row.length_cm}×{row.width_cm}×{row.height_cm} cm</p></div><Badge text={row.packing_status} tone={row.packing_status === "verified" ? "good" : "warn"} />{row.packing_status !== "verified" && <button type="button" onClick={() => void verifyPackage(row)} disabled={busy !== null} className="min-h-10 border border-emerald-500/40 text-emerald-300 px-3 text-[9px] uppercase">Verify</button>}</article>)}</div></div></details>

        <details open className="border border-border/60"><summary className="cursor-pointer p-4 text-[10px] uppercase tracking-[0.15em] text-gold"><Truck size={14} className="inline mr-2" /> Shipment record</summary><div className="border-t border-border/60 p-4">{!shipment ? <><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><Select label="Mode" value={shipmentDraft.mode} options={MODES} onChange={(value) => setShipmentDraft((current) => ({ ...current, mode: value as ShipmentMode }))} /><Field label="Carrier/courier *" value={shipmentDraft.courier} onChange={(value) => setShipmentDraft((current) => ({ ...current, courier: value }))} /><Field label="Service level" value={shipmentDraft.service} onChange={(value) => setShipmentDraft((current) => ({ ...current, service: value }))} /><Field label="Booking reference" value={shipmentDraft.booking} onChange={(value) => setShipmentDraft((current) => ({ ...current, booking: value }))} /><Field label="Tracking number" value={shipmentDraft.tracking} onChange={(value) => setShipmentDraft((current) => ({ ...current, tracking: value }))} /><Field label="HTTPS tracking URL" value={shipmentDraft.trackingUrl} onChange={(value) => setShipmentDraft((current) => ({ ...current, trackingUrl: value }))} /><Field label="Origin" value={shipmentDraft.origin} onChange={(value) => setShipmentDraft((current) => ({ ...current, origin: value }))} /><Field label="Destination *" value={shipmentDraft.destination} onChange={(value) => setShipmentDraft((current) => ({ ...current, destination: value }))} /><Field label="Incoterm" value={shipmentDraft.incoterm} onChange={(value) => setShipmentDraft((current) => ({ ...current, incoterm: value }))} /><Field label="Planned dispatch" value={shipmentDraft.plannedDispatch} onChange={(value) => setShipmentDraft((current) => ({ ...current, plannedDispatch: value }))} type="datetime-local" /></div><button type="button" onClick={() => void createShipment()} disabled={busy !== null} className="mt-3 min-h-11 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.14em]">Create internal shipment</button></> : <div className="space-y-4"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p className="font-display text-2xl">{shipment.shipment_number}</p><p className="text-sm text-muted-foreground mt-1">{shipment.courier_name} · {shipment.mode} · {shipment.destination_text}</p><p className="text-xs text-muted-foreground mt-1">Tracking: {shipment.tracking_number || "pending"}</p></div><div className="flex gap-2 flex-wrap"><Badge text={shipment.status} tone={shipment.status === "delivered" ? "good" : shipment.status === "exception" ? "bad" : "warn"} />{shipment.tracking_url && <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-xs"><ExternalLink size={12} /> Tracking</a>}</div></div><Select label="Record next shipment status" value={shipment.status} options={SHIPMENT_STATUSES} onChange={(value) => void updateShipmentStatus(value as ShipmentStatus)} disabled={busy !== null} /></div>}</div></details>

        <details open className="border border-border/60"><summary className="cursor-pointer p-4 text-[10px] uppercase tracking-[0.15em] text-gold"><FileText size={14} className="inline mr-2" /> Private shipping documents</summary><div className="border-t border-border/60 p-4 space-y-4"><div className="grid sm:grid-cols-3 gap-3"><Select label="Document type" value={documentType} options={DOCUMENT_TYPES} onChange={(value) => setDocumentType(value as DispatchDocumentType)} /><Field label="Document reference" value={documentReference} onChange={setDocumentReference} /><div className="self-end"><button type="button" onClick={() => fileInput.current?.click()} disabled={busy !== null} className="min-h-11 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase"><UploadCloud size={13} /> Upload private document</button><input ref={fileInput} type="file" className="hidden" accept="application/pdf,image/jpeg,image/png,image/webp,.csv,.xlsx" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadDocument(file); event.target.value = ""; }} /></div></div><div className="space-y-2">{documents.length === 0 ? <Empty text="No private shipping documents." /> : documents.map((row) => <article key={row.id} className="border border-border/60 p-3 flex flex-col lg:flex-row lg:items-center gap-3"><FileText size={18} className="text-gold" /><div className="flex-1 min-w-0"><p className="truncate">{row.file_name}</p><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">{row.document_type.replaceAll("_", " ")} · {(row.size_bytes / 1024).toFixed(1)} KB · {row.checksum_sha256 ? "SHA-256" : "checksum unavailable"}</p></div><Badge text={row.verification_status} tone={row.verification_status === "verified" ? "good" : row.verification_status === "rejected" ? "bad" : "warn"} /><button type="button" onClick={() => void openDocument(row)} className="min-h-10 border border-border/60 px-3 text-xs">Open 5 min</button>{row.verification_status === "pending" && <><button type="button" onClick={() => void verifyDocument(row, "verified")} className="min-h-10 border border-emerald-500/40 text-emerald-300 px-3 text-xs">Verify</button><button type="button" onClick={() => void verifyDocument(row, "rejected")} className="min-h-10 border border-red-500/40 text-red-300 px-3 text-xs">Reject</button></>}</article>)}</div></div></details>

        {shipment && <details className="border border-border/60"><summary className="cursor-pointer p-4 text-[10px] uppercase tracking-[0.15em] text-gold"><Clock3 size={14} className="inline mr-2" /> Tracking & delivery evidence</summary><div className="border-t border-border/60 p-4 grid xl:grid-cols-2 gap-5"><div><p className="eyebrow mb-3">Tracking event</p><div className="grid sm:grid-cols-2 gap-3"><Select label="Status" value={trackingDraft.status} options={SHIPMENT_STATUSES} onChange={(value) => setTrackingDraft((current) => ({ ...current, status: value }))} /><Field label="Event time" value={trackingDraft.eventTime} onChange={(value) => setTrackingDraft((current) => ({ ...current, eventTime: value }))} type="datetime-local" /><Field label="Location" value={trackingDraft.location} onChange={(value) => setTrackingDraft((current) => ({ ...current, location: value }))} /><Field label="Evidence reference" value={trackingDraft.reference} onChange={(value) => setTrackingDraft((current) => ({ ...current, reference: value }))} /><div className="sm:col-span-2"><Field label="Description *" value={trackingDraft.description} onChange={(value) => setTrackingDraft((current) => ({ ...current, description: value }))} /></div></div><button type="button" onClick={() => void addTracking()} disabled={busy !== null} className="mt-3 min-h-11 border border-gold/60 text-gold px-4 text-[10px] uppercase">Add tracking evidence</button><div className="space-y-2 mt-4">{tracking.map((row) => <article key={row.id} className="border border-border/60 p-3"><p className="text-[9px] uppercase tracking-[0.12em] text-gold">{row.event_status.replaceAll("_", " ")} · {new Date(row.event_time).toLocaleString()}</p><p className="text-sm mt-1">{row.description}</p><p className="text-xs text-muted-foreground mt-1"><MapPin size={11} className="inline mr-1" />{row.location_text || "Location not recorded"} · {row.source}</p></article>)}</div></div><div><p className="eyebrow mb-3">Delivery/pickup evidence</p><div className="grid sm:grid-cols-2 gap-3"><Select label="Evidence type" value={deliveryDraft.type} options={["pickup", "handover", "tracking", "delivery", "exception"]} onChange={(value) => setDeliveryDraft((current) => ({ ...current, type: value as DeliveryRow["evidence_type"] }))} /><Field label="Reference *" value={deliveryDraft.reference} onChange={(value) => setDeliveryDraft((current) => ({ ...current, reference: value }))} /><Field label="Recipient" value={deliveryDraft.recipient} onChange={(value) => setDeliveryDraft((current) => ({ ...current, recipient: value }))} /><Field label="Delivered at" value={deliveryDraft.deliveredAt} onChange={(value) => setDeliveryDraft((current) => ({ ...current, deliveredAt: value }))} type="datetime-local" /></div><button type="button" onClick={() => void addDeliveryEvidence()} disabled={busy !== null} className="mt-3 min-h-11 border border-gold/60 text-gold px-4 text-[10px] uppercase">Add evidence</button><div className="space-y-2 mt-4">{delivery.map((row) => <article key={row.id} className="border border-border/60 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.12em] text-gold">{row.evidence_type}</p><p className="text-sm mt-1">{row.reference}</p><p className="text-xs text-muted-foreground mt-1">{row.recipient_name || "Recipient not recorded"}</p></div><Badge text={row.verification_status} tone={row.verification_status === "verified" ? "good" : row.verification_status === "rejected" ? "bad" : "warn"} /></div>{row.verification_status === "pending" && <div className="flex gap-2 mt-3"><button type="button" onClick={() => void verifyDelivery(row, "verified")} className="min-h-9 border border-emerald-500/40 text-emerald-300 px-3 text-xs">Verify</button><button type="button" onClick={() => void verifyDelivery(row, "rejected")} className="min-h-9 border border-red-500/40 text-red-300 px-3 text-xs">Reject</button></div>}</article>)}</div></div></div></details>}

        <div className={`border p-4 ${readiness.ready ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}><div className="flex items-start gap-3">{readiness.ready ? <CheckCircle2 className="text-emerald-300 shrink-0" /> : <ShieldCheck className="text-amber-300 shrink-0" />}<div className="flex-1"><h3 className="font-display text-2xl">Dispatch readiness</h3><p className="text-sm text-foreground/60 mt-2">Client check: {readiness.ready ? "ready for server verification" : `${readiness.missing.length} blocker(s)`}</p>{readiness.missing.length > 0 && <ul className="list-disc pl-5 mt-3 text-xs text-amber-200 space-y-1">{readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul>}{readiness.warnings.length > 0 && <ul className="list-disc pl-5 mt-3 text-xs text-foreground/60 space-y-1">{readiness.warnings.map((item) => <li key={item}>{item}</li>)}</ul>}<label className="mt-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={requireOriginCertificate} onChange={(event) => setRequireOriginCertificate(event.target.checked)} /> Require verified certificate of origin</label>{serverReadiness && <div className="mt-3 border border-border/60 p-3 text-xs"><p>Server: {serverReadiness.ready ? "ready" : "blocked"}</p>{serverReadiness.missing?.length > 0 && <p className="text-amber-200 mt-1">{serverReadiness.missing.join(" · ")}</p>}</div>}<div className="flex flex-wrap gap-2 mt-4"><button type="button" onClick={() => void checkServerReadiness()} disabled={busy !== null} className="min-h-11 border border-gold/60 text-gold px-4 text-[10px] uppercase">{busy === "readiness" ? <Loader2 size={13} className="inline animate-spin mr-2" /> : null}Server readiness</button><button type="button" onClick={() => void ownerRelease()} disabled={busy !== null || !serverReadiness?.ready} className="min-h-11 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase disabled:opacity-40">Owner approve dispatch</button></div></div></div></div>
      </main>}
    </div>
  </section>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${FIELD} mt-1`} /></label>; }
function Select({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; disabled?: boolean }) { return <label className="block"><span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={`${FIELD} mt-1 disabled:opacity-50`}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>; }
function Metric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) { return <div className="p-4 border-r border-border/60 last:border-r-0"><p className={`font-display text-2xl ${attention ? "text-amber-300" : ""}`}>{value}</p><p className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground mt-1">{label}</p></div>; }
function Badge({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "good" | "warn" | "bad" }) { return <span className={`inline-flex border px-2 py-1 text-[8px] uppercase tracking-[0.1em] ${tone === "good" ? "border-emerald-500/40 text-emerald-300" : tone === "warn" ? "border-amber-500/40 text-amber-300" : tone === "bad" ? "border-red-500/40 text-red-300" : "border-border/60 text-muted-foreground"}`}>{text.replaceAll("_", " ")}</span>; }
function Empty({ text }: { text: string }) { return <div className="border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">{text}</div>; }
