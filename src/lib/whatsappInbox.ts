export type WhatsAppOptInStatus = "unknown" | "inbound_contact" | "opted_in" | "opted_out" | "blocked";
export type WhatsAppMessageType = "text" | "template";

export function whatsappConversationNeedsAttention(input: {
  unreadCount: number;
  status: string;
  qualificationStatus: string;
}) {
  return input.unreadCount > 0 || ["pending_review", "human_required"].includes(input.status) || ["unreviewed", "needs_information"].includes(input.qualificationStatus);
}

export function whatsappSendBoundary(input: {
  rulesApproved: boolean;
  optInStatus: WhatsAppOptInStatus;
  messageType: WhatsAppMessageType;
  lastInboundAt?: string | null;
  customerServiceWindowHours?: number | null;
  commercialCommitment: boolean;
  now?: number;
}) {
  if (!input.rulesApproved) return { allowed: false, reason: "Approved Business Rules are required", templateRequired: false };
  if (["opted_out", "blocked"].includes(input.optInStatus)) {
    return { allowed: false, reason: `Contact is ${input.optInStatus}`, templateRequired: false };
  }
  if (input.commercialCommitment) {
    return { allowed: false, reason: "Commercial commitment requires direct owner handling", templateRequired: false };
  }
  if (input.messageType === "template") return { allowed: true, reason: null, templateRequired: false };
  if (!input.customerServiceWindowHours || input.customerServiceWindowHours <= 0) {
    return { allowed: false, reason: "Customer-service window configuration is missing", templateRequired: false };
  }
  if (!input.lastInboundAt) {
    return { allowed: false, reason: "No inbound customer-service window evidence", templateRequired: true };
  }
  const inbound = new Date(input.lastInboundAt).getTime();
  const now = input.now ?? Date.now();
  if (Number.isNaN(inbound) || now - inbound > input.customerServiceWindowHours * 3_600_000) {
    return { allowed: false, reason: "Customer-service window is closed", templateRequired: true };
  }
  return { allowed: true, reason: null, templateRequired: false };
}

export function whatsappStatusTone(status: string) {
  if (["failed", "blocked"].includes(status)) return "error" as const;
  if (["draft", "approved", "queued", "pending_review", "human_required"].includes(status)) return "attention" as const;
  if (["sent", "delivered", "read", "received", "open"].includes(status)) return "ok" as const;
  return "neutral" as const;
}
