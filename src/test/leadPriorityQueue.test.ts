import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { compareLeadPriority, leadPriority, type LeadPriorityCandidate } from "@/lib/leadPriority";

const ownerHome = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/OwnerGrowthStart.tsx"), "utf8");
const reviewPage = fs.readFileSync(path.resolve(process.cwd(), "src/pages/AdminLeadReview.tsx"), "utf8");
const queue = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/LeadPriorityQueue.tsx"), "utf8");

const candidate = (overrides: Partial<LeadPriorityCandidate> = {}): LeadPriorityCandidate => ({
  verification_status: "verified",
  verification_score: 90,
  website: "https://buyer.example",
  email: "buying@buyer.example",
  phone: null,
  whatsapp: null,
  buyer_type: "Wholesaler",
  product_fit: ["Lederhosen"],
  imported_lead_id: null,
  ...overrides,
});

describe("owner buyer priority queue", () => {
  it("ranks a verified buyer with website, business email and product fit as A", () => {
    const result = leadPriority(candidate());
    expect(result.band).toBe("A");
    expect(result.contactReady).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("keeps promising buyers with missing business email in B", () => {
    const result = leadPriority(candidate({ email: null, verification_status: "needs_review", verification_score: 82 }));
    expect(result.band).toBe("B");
    expect(result.contactReady).toBe(false);
    expect(result.nextAction).toContain("business email");
  });

  it("keeps weak or incomplete candidates in C", () => {
    const result = leadPriority(candidate({ verification_status: "unverified", verification_score: 35, website: null, email: null, buyer_type: null, product_fit: [] }));
    expect(result.band).toBe("C");
    expect(result.nextAction).toContain("Verify company fit");
  });

  it("does not treat imported, rejected or duplicate records as active priority opportunities", () => {
    for (const status of ["imported", "rejected", "duplicate"]) {
      const result = leadPriority(candidate({ verification_status: status }));
      expect(result.band).toBe("C");
      expect(result.score).toBe(0);
    }
  });

  it("sorts A before B before C and then by score", () => {
    const rows = [
      candidate({ verification_status: "unverified", verification_score: 30 }),
      candidate({ email: null, verification_status: "needs_review", verification_score: 82 }),
      candidate({ verification_score: 96 }),
      candidate({ verification_score: 91 }),
    ].sort(compareLeadPriority);
    expect(rows.map((row) => leadPriority(row).band)).toEqual(["A", "A", "B", "C"]);
    expect(rows[0].verification_score).toBe(96);
  });

  it("opens the exact private review workspace from the owner home", () => {
    expect(ownerHome).toContain('title="Review Ready Leads"');
    expect(ownerHome).toContain('href="/admin/lead-review"');
    expect(reviewPage).toContain("<LeadPriorityQueue />");
    expect(reviewPage).toContain('id="lead-review-workspace"');
  });

  it("keeps priority ranking read-only and owner-approved", () => {
    expect(queue).toContain('.from("lead_candidates")');
    expect(queue).not.toContain('.insert(');
    expect(queue).not.toContain('.update(');
    expect(queue).not.toContain('action: "send"');
    expect(queue).toContain("CRM activation aur outreach owner approval ke baghair nahi hoti");
  });
});
