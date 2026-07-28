/**
 * Versioned localStorage autosave for the inquiry wizard.
 * Version bump invalidates old drafts silently — never throws.
 */
export const DRAFT_KEY = "irha_inquiry_draft_v4";
export const DRAFT_VERSION = 4;

export type InquiryIntent = "rfq" | "sample" | "catalogue" | "reference" | "meeting";

export type UploadedFileRef = {
  path: string;         // storage path within inquiry-uploads
  name: string;         // original filename
  size: number;
  mime: string;
};

export type InquiryDraft = {
  v: number;
  step: number;
  intent: InquiryIntent;
  /** Stable reference generated once per draft — persisted for idempotent retries. */
  inquiryRef?: string;
  // Requirements
  buyerType?: string;
  company?: string;
  country?: string;
  quantity?: string;
  notes?: string;
  consent?: boolean;
  // Sample-specific
  sampleQty?: string;
  sampleSize?: string;
  sampleColor?: string;
  sampleBranding?: "plain" | "branded";
  // Catalogue-specific
  cataloguePreference?: "full" | "selected";
  catalogueCategories?: string[];
  // Reference-specific
  referenceNotes?: string;
  // Meeting-specific
  meetingTopic?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingTz?: string;
  // Files
  files: UploadedFileRef[];
  // Contact
  name?: string;
  email?: string;
  whatsapp?: string;
  // Product context (mirrors URL params, kept for resilience)
  productContext?: {
    productSlug?: string;
    productName?: string;
    productCode?: string;
    categorySlug?: string;
    shortlistSlugs?: string[];
    shortlistNames?: string[];
    compareSlugs?: string[];
    compareNames?: string[];
  };
  updatedAt: number;
};

export function loadDraft(): InquiryDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InquiryDraft;
    if (!parsed || parsed.v !== DRAFT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(d: Omit<InquiryDraft, "v" | "updatedAt">) {
  try {
    const payload: InquiryDraft = { ...d, v: DRAFT_VERSION, updatedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* quota — ignore */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
