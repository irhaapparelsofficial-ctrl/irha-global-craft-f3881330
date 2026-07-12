import type { SalesCard, SalesSource } from "@/lib/salesPipeline";

export type DuplicateSignal = "email" | "phone" | "domain" | "company_country";

export type DuplicateSuggestion = {
  key: string;
  left: SalesCard;
  right: SalesCard;
  score: number;
  signals: DuplicateSignal[];
  reason: string;
};

export type BuyerContact = {
  id: string;
  source_type: SalesSource;
  source_id: string;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin_url: string | null;
  is_primary: boolean;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type BuyerNote = {
  id: string;
  source_type: SalesSource;
  source_id: string;
  body: string;
  pinned: boolean;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
};

export type BuyerFile = {
  id: string;
  source_type: SalesSource;
  source_id: string;
  bucket: string;
  object_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  category: "reference" | "tech_pack" | "quotation" | "sample" | "compliance" | "shipping" | "other";
  description: string | null;
  created_at: string;
};

export type RecordLink = {
  id: string;
  left_source_type: SalesSource;
  left_source_id: string;
  right_source_type: SalesSource;
  right_source_id: string;
  link_type: "same_buyer" | "duplicate" | "related";
  status: "proposed" | "confirmed" | "rejected";
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return "";
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

export function normalizeCompany(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(gmbh|ltd|limited|llc|inc|corp|corporation|ag|kg|ohg|sarl|srl|spa|bv|nv|co|company)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function websiteDomain(value: string) {
  if (!value.trim()) return "";
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function emailDomain(value: string) {
  const normalized = normalizeEmail(value);
  const index = normalized.lastIndexOf("@");
  return index > 0 ? normalized.slice(index + 1) : "";
}

const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "icloud.com", "aol.com", "proton.me", "protonmail.com",
]);

function businessDomain(card: SalesCard) {
  const site = websiteDomain(card.website);
  if (site) return site;
  const mail = emailDomain(card.email);
  return mail && !PUBLIC_EMAIL_DOMAINS.has(mail) ? mail : "";
}

export function compareBuyerIdentity(left: SalesCard, right: SalesCard): DuplicateSuggestion | null {
  if (left.key === right.key) return null;
  const signals: DuplicateSignal[] = [];
  let score = 0;

  const leftEmail = normalizeEmail(left.email);
  const rightEmail = normalizeEmail(right.email);
  if (leftEmail && rightEmail && leftEmail === rightEmail) {
    signals.push("email");
    score += 70;
  }

  const leftPhone = normalizePhone(left.phone);
  const rightPhone = normalizePhone(right.phone);
  if (leftPhone && rightPhone && leftPhone === rightPhone) {
    signals.push("phone");
    score += 65;
  }

  const leftDomain = businessDomain(left);
  const rightDomain = businessDomain(right);
  if (leftDomain && rightDomain && leftDomain === rightDomain) {
    signals.push("domain");
    score += 45;
  }

  const leftCompany = normalizeCompany(left.company);
  const rightCompany = normalizeCompany(right.company);
  const sameCountry = left.country.trim() && right.country.trim() && left.country.trim().toLowerCase() === right.country.trim().toLowerCase();
  if (leftCompany.length >= 3 && leftCompany === rightCompany && sameCountry) {
    signals.push("company_country");
    score += 35;
  }

  score = Math.min(score, 100);
  if (score < 45) return null;
  const ordered = [left, right].sort((a, b) => a.key.localeCompare(b.key));
  const reason = signals.map((signal) => signal === "company_country" ? "same normalized company and country" : `same ${signal}`).join(" + ");
  return {
    key: `${ordered[0].key}|${ordered[1].key}`,
    left: ordered[0],
    right: ordered[1],
    score,
    signals,
    reason,
  };
}

export function findDuplicateSuggestions(cards: SalesCard[]) {
  const suggestions: DuplicateSuggestion[] = [];
  for (let leftIndex = 0; leftIndex < cards.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cards.length; rightIndex += 1) {
      const suggestion = compareBuyerIdentity(cards[leftIndex], cards[rightIndex]);
      if (suggestion) suggestions.push(suggestion);
    }
  }
  return suggestions.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

export function linkPairKey(leftSource: SalesSource, leftId: string, rightSource: SalesSource, rightId: string) {
  const members = [`${leftSource}:${leftId}`, `${rightSource}:${rightId}`].sort();
  return members.join("|");
}

export function fileSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
