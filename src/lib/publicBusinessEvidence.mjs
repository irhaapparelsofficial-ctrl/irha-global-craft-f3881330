export const SCCI_BUSINESS_REFERENCE = Object.freeze({
  issuer: "Sialkot Chamber of Commerce & Industry",
  shortIssuer: "SCCI",
  membershipNumber: "A-101267",
  officialDirectoryUrl: "https://scci.com.pk/members-directory/",
  evidenceLabel: "SCCI member-directory reference",
  verificationNote: "The current official SCCI member directory associates IRHA APPARELS with reference/member identifier A-101267. This directory reference does not establish certificate status, issue or renewal dates, pending-committee status, legal structure, product certification, production capacity or export history.",
  sourceNote: "Verified against the public Sialkot Chamber of Commerce & Industry member directory. Only the company identity and directory/member identifier are presented as public evidence.",
  // Compatibility properties are intentionally non-credential assertions. They
  // prevent older shared generators from manufacturing unsupported status/date
  // details while Phase 1 routes converge on the directory-reference wording.
  documentType: "SCCI member-directory reference",
  statusLabel: "SCCI directory reference",
  issuedDateLabel: "not asserted",
  status: "Directory reference only",
  qualification: "No certificate issue date, renewal date or committee status is asserted without separate current evidence.",
});

export const SCCI_PROVISIONAL_MEMBERSHIP = SCCI_BUSINESS_REFERENCE;
