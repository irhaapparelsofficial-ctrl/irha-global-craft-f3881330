export type LeadPriorityBand = "A" | "B" | "C";

export type LeadPriorityCandidate = {
  verification_status: string;
  verification_score: number;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  buyer_type?: string | null;
  product_fit?: string[] | null;
  imported_lead_id?: string | null;
};

export type LeadPriorityResult = {
  band: LeadPriorityBand;
  score: number;
  title: string;
  nextAction: string;
  contactReady: boolean;
};

const terminalStatuses = new Set(["imported", "rejected", "duplicate"]);

function present(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function leadPriority(candidate: LeadPriorityCandidate): LeadPriorityResult {
  const status = candidate.imported_lead_id ? "imported" : candidate.verification_status;
  const hasWebsite = present(candidate.website);
  const hasEmail = present(candidate.email);
  const hasPhone = present(candidate.phone);
  const hasWhatsapp = present(candidate.whatsapp);
  const hasContact = hasEmail || hasPhone || hasWhatsapp;
  const hasBuyerFit = present(candidate.buyer_type) && Boolean(candidate.product_fit?.length);
  const contactReady = hasWebsite && hasEmail && hasBuyerFit && status === "verified";

  let score = Number.isFinite(candidate.verification_score) ? candidate.verification_score : 0;
  if (hasWebsite) score += 4;
  if (hasEmail) score += 8;
  if (hasWhatsapp) score += 5;
  else if (hasPhone) score += 3;
  if (hasBuyerFit) score += 5;
  if (status === "needs_review") score -= 12;
  if (status === "unverified") score -= 25;
  if (terminalStatuses.has(status)) score = 0;
  score = clamp(score);

  if (contactReady && score >= 90) {
    return {
      band: "A",
      score,
      title: "Best buyer opportunity",
      nextAction: "Validate strict readiness, activate to CRM, then prepare personalized outreach.",
      contactReady,
    };
  }

  if (!terminalStatuses.has(status) && hasWebsite && (hasContact || hasBuyerFit) && score >= 65) {
    return {
      band: "B",
      score,
      title: "Promising buyer",
      nextAction: hasEmail
        ? "Complete validation and buyer-fit review before CRM activation."
        : "Find and validate a business email before CRM activation.",
      contactReady,
    };
  }

  return {
    band: "C",
    score,
    title: "Research required",
    nextAction: "Verify company fit, public source and contact details before activation.",
    contactReady,
  };
}

const bandOrder: Record<LeadPriorityBand, number> = { A: 0, B: 1, C: 2 };

export function compareLeadPriority(a: LeadPriorityCandidate, b: LeadPriorityCandidate) {
  const priorityA = leadPriority(a);
  const priorityB = leadPriority(b);
  return bandOrder[priorityA.band] - bandOrder[priorityB.band]
    || priorityB.score - priorityA.score
    || b.verification_score - a.verification_score;
}
