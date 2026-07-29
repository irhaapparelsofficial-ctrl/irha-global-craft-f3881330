# IA-B2B-E002 — Capability evidence register

Execution: `IA-B2B-E002`  
Goal lock: `IRHA-B2B-BUYER-CONFIDENCE-01`

This register is the publication boundary for the buyer-information layer. The runtime source of truth is `src/data/buyerCapabilities.ts`.

## Sources reviewed

1. Current public website content: About, Manufacturing, Buyer Trust, Buyer Resources, Compliance, Factory Video Call, Privacy Policy, inquiry and product/category routes.
2. Current repository route, localization, RFQ, upload, privacy, sitemap and release implementations.
3. Approved Google Drive business summary describing the Sialkot base, OEM/ODM/private-label model, requirement-led quotation and live factory video-call option.
4. Current product scope covering cotton/jersey, fleece, performance, leather, suede, sportswear, streetwear, leisurewear and Trachten programmes.
5. Existing Cloudflare and GitHub exact-release controls.

No owner document authenticated current certification ownership, a universal courier, an exclusive port, a fixed delivery time, a fixed MOQ, employee count, factory size, production capacity, export volume, founding year or named international client.

## Publication classifications

| Proposed statement area | Classification | Publication rule |
|---|---|---|
| Sialkot, Pakistan manufacturing and sourcing base | Verified current capability | May be stated directly. |
| Private-label, OEM and ODM orientation | Verified current capability | May be stated directly. |
| Product-development support and buyer communication | Verified current capability | May be stated directly. |
| Scheduled live factory/workmanship video call | Verified current capability | May be stated as an appointment-based verification option. Do not expose another buyer's information. |
| Cotton, jersey, fleece, performance, leather and suede material directions | Commonly offered subject to sourcing | Present as typical directions. Final specification remains order-specific. |
| Exact composition, GSM, leather thickness, colour, finish, MOQ and lead time | Order-specific option | Confirm only during sampling and written quotation. |
| EXW, FOB and CIF | Order-specific option | Explain responsibility; name the place and scope in the written quotation. |
| DDP | Third-party-dependent option | State destination and shipment dependency. Never imply universal availability. |
| International courier, air cargo and sea freight | Third-party-dependent option | Select according to destination and shipment profile. Do not publish carrier logos or a fixed carrier promise. |
| Pakistani airport, dry-port or seaport routing; Karachi for applicable sea shipments | Order-specific / third-party-dependent | Describe as possible routing, not an exclusive port commitment. |
| NDA review and signing | Order-specific option | Available by written request before sensitive file sharing. Exact legal terms must be agreed in writing. |
| Organic cotton, recycled polyester, reduced-plastic packaging and lower-impact alternatives | Commonly offered subject to sourcing | Qualify availability, minimums, supply chain and documentation. |
| Material/product testing | Third-party-dependent option | Laboratory, scope, timing and cost require written agreement. |
| ISO, OEKO-TEX, SEDEX, WRAP, BSCI, GOTS and GRS requirements | Third-party-dependent option | May be named only as buyer-requested requirements for evaluation. |
| Current ownership of any named certificate | Unsupported and prohibited | Do not publish without authenticated, valid and applicable evidence. |
| Certification logos | Unsupported and prohibited | Do not display. |
| Founding year, employee count, factory size, capacity, export volume, awards or named clients | Unsupported and prohibited | Do not publish. |
| Fixed universal delivery time, customs outcome, courier, port, MOQ or material availability | Unsupported and prohibited | Do not publish. |

## Confidentiality and privacy alignment

Public confidentiality wording is limited to the operational process:

- buyer files are used for quotation, development and production handling;
- private designs are not intended for public catalogue use without permission;
- handling is limited to relevant commercial and production work;
- NDA review/signing can be requested before sensitive sharing;
- jurisdiction, retention and deletion obligations require written agreement;
- the buyer must be authorised to share uploaded material;
- website handling remains subject to the published privacy policy.

The website does not promise zero risk, universal legal protection, automatic ownership transfer or permanent deletion.

## Material-data contract

Every material entry must include:

- family;
- material name;
- typical composition direction;
- indicative GSM or thickness direction;
- structure;
- finish options;
- typical applications;
- decoration compatibility;
- sourcing qualification.

Every material view must carry this qualification:

> All ranges are practical starting points, not guaranteed final specifications. Final composition, GSM or leather thickness, colour, finish, availability, minimums and lead time are confirmed during sampling and quotation.

## Cost and mutation boundary

- Paid features enabled: none.
- Supabase schema, Storage, Edge Functions and billing: unchanged.
- Cloudflare plan, DNS and billing: unchanged.
- No stock assets, certification badges, legal templates, paid translation or monitoring products introduced.
- Rollback is the focused pull-request merge only.
