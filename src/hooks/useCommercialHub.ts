import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { referenceFor, type SalesSource } from "@/lib/salesPipeline";
import type {
  CommercialBuyerRef,
  CurrencyCode,
  MeetingStatus,
  MeetingType,
  QuotationStatus,
  SampleStatus,
} from "@/lib/commercialHub";

const db = supabase as any;

type InquiryRow = {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  country: string | null; category: string | null; quantity: string | null;
  lead_context: Record<string, unknown> | null;
};
type CatalogueRow = {
  id: string; name: string; email: string | null; whatsapp: string | null;
  company_name: string | null; country: string | null; category_interest: string | null;
};
type ProspectRow = {
  id: string; company_name: string; country: string | null; email: string | null;
  phone: string | null; apparel_segment: string | null;
};

export type MeetingRow = {
  id: string;
  source_type: SalesSource;
  source_id: string;
  meeting_reference: string;
  title: string;
  meeting_type: MeetingType;
  start_at: string;
  end_at: string;
  timezone: string;
  location_url: string | null;
  agenda: string | null;
  status: MeetingStatus;
  outcome_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SampleRow = {
  id: string;
  source_type: SalesSource;
  source_id: string;
  sample_reference: string;
  product: string;
  requirements: string;
  quantity: number;
  status: SampleStatus;
  currency: CurrencyCode;
  sample_cost: number;
  shipping_cost: number;
  tracking_number: string | null;
  courier: string | null;
  requested_at: string;
  approved_at: string | null;
  sent_at: string | null;
  feedback: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotationItemRow = {
  id: string;
  quotation_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  sort_order: number;
};

export type QuotationRow = {
  id: string;
  source_type: SalesSource;
  source_id: string;
  quotation_number: string;
  buyer_name: string;
  company: string | null;
  destination_country: string | null;
  buyer_email: string | null;
  currency: CurrencyCode;
  status: QuotationStatus;
  valid_until: string;
  incoterm: string;
  shipping_scope: string;
  payment_terms: string;
  notes: string | null;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  owner_approved_at: string | null;
  owner_approved_by: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

function contextText(value: Record<string, unknown> | null, key: string) {
  const result = value?.[key];
  return typeof result === "string" ? result : "";
}

export function commercialBuyerKey(source: SalesSource, id: string) {
  return `${source}:${id}`;
}

export function useCommercialHub() {
  const [buyers, setBuyers] = useState<CommercialBuyerRef[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuotationItemRow[]>([]);
  const [backendNotes, setBackendNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [inquiries, catalogues, prospects, meetingResult, sampleResult, quoteResult, itemResult] = await Promise.all([
      db.from("inquiries").select("id,name,email,phone,company,country,category,quantity,lead_context").order("created_at", { ascending: false }).limit(500),
      db.from("catalogue_leads").select("id,name,email,whatsapp,company_name,country,category_interest").order("created_at", { ascending: false }).limit(500),
      db.from("b2b_leads").select("id,company_name,country,email,phone,apparel_segment").order("created_at", { ascending: false }).limit(1000),
      db.from("crm_meetings").select("*").order("start_at", { ascending: true }).limit(1000),
      db.from("crm_samples").select("*").order("updated_at", { ascending: false }).limit(1000),
      db.from("crm_quotations").select("*").order("created_at", { ascending: false }).limit(1000),
      db.from("crm_quotation_items").select("*").order("sort_order", { ascending: true }).limit(5000),
    ]);

    const nextBuyers: CommercialBuyerRef[] = [
      ...((inquiries.data ?? []) as InquiryRow[]).map((row) => ({
        source: "inquiry" as const,
        sourceId: row.id,
        reference: referenceFor("inquiry", row.id),
        name: row.name,
        company: row.company || "",
        country: row.country || contextText(row.lead_context, "destination_country"),
        email: row.email || "",
        phone: row.phone || "",
        product: contextText(row.lead_context, "product_name") || row.category || "",
        quantity: row.quantity || "",
      })),
      ...((catalogues.data ?? []) as CatalogueRow[]).map((row) => ({
        source: "catalogue" as const,
        sourceId: row.id,
        reference: referenceFor("catalogue", row.id),
        name: row.name,
        company: row.company_name || "",
        country: row.country || "",
        email: row.email || "",
        phone: row.whatsapp || "",
        product: row.category_interest || "",
        quantity: "",
      })),
      ...((prospects.data ?? []) as ProspectRow[]).map((row) => ({
        source: "prospect" as const,
        sourceId: row.id,
        reference: referenceFor("prospect", row.id),
        name: row.company_name,
        company: row.company_name,
        country: row.country || "",
        email: row.email || "",
        phone: row.phone || "",
        product: row.apparel_segment || "",
        quantity: "",
      })),
    ];

    const notes: string[] = [];
    for (const [label, result] of [["Inquiries", inquiries], ["Catalogue leads", catalogues], ["Prospects", prospects]] as const) {
      if (result.error) notes.push(`${label}: ${result.error.message}`);
    }
    if (meetingResult.error || sampleResult.error || quoteResult.error || itemResult.error) {
      notes.push("Commercial Hub storage activates in the final one-time database migration.");
    }

    setBuyers(nextBuyers);
    setMeetings((meetingResult.data ?? []) as MeetingRow[]);
    setSamples((sampleResult.data ?? []) as SampleRow[]);
    setQuotations((quoteResult.data ?? []) as QuotationRow[]);
    setQuoteItems((itemResult.data ?? []) as QuotationItemRow[]);
    setBackendNotes(Array.from(new Set(notes)));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return {
    buyers,
    meetings,
    samples,
    quotations,
    quoteItems,
    backendNotes,
    loading,
    reload: load,
    setMeetings,
    setSamples,
    setQuotations,
    setQuoteItems,
  };
}
