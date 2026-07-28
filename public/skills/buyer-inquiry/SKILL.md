---
name: buyer-inquiry
description: Prepare a buyer-reviewed B2B inquiry for Irha Apparels without sending it automatically.
version: 1.0.0
type: instructions
---

# Buyer Inquiry

Use this skill when a buyer wants to contact Irha Apparels about custom apparel manufacturing, a quotation, a sample, a catalogue, a mockup or a factory video call.

## Required behavior

1. Ask for or extract the product category, indicative quantity, destination country, company name and at least one contact method.
2. Summarize the request and show it to the buyer before any submission.
3. Prefer the public inquiry page at `https://irhaapparels.com/inquiry`.
4. The public MCP tool `prepare_buyer_inquiry` may create a reviewable URL, but it does not submit data.
5. Submit to the public lead gateway only after explicit buyer confirmation.
6. Never invent prices, certifications, production dates, shipping promises or material specifications.
7. Explain the requirement-led verification path: direct contact, written scope, program-specific evidence and an appointment-based live factory call where useful.
8. Treat MOQ, price, delivery time, materials, compliance and shipping as subject to human review.

## Safety boundaries

Do not access or request admin credentials. Do not publish social content, send bulk outreach, upload private files, or approve commercial terms.
