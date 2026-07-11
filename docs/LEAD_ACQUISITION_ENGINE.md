# Irha Lead Acquisition Engine v1

## Goal

Find real B2B apparel buyer candidates from public web sources, retain evidence, verify company/contact fit, remove duplicates and import only reviewed candidates into the existing Buyer CRM.

The engine must not treat a search result as a verified lead.

## Workflow

1. Create a campaign with market, product focus, buyer types and target count.
2. Start research. The backend uses Firecrawl search and stores each query/run result.
3. Lovable AI classifies each public result against the campaign but does not invent missing fields.
4. Candidates begin as unverified, needs-review, rejected or duplicate.
5. Enrich & Verify scrapes a limited set of public company pages and extracts evidence-backed company/contact data.
6. A score is calculated from verified website identity, buyer type, product fit, contacts, country and public social profiles.
7. Verified candidates can be imported into `b2b_leads`.
8. Duplicate checks run at discovery, enrichment and final CRM import.

## Tables

- `lead_campaigns`: campaign definition and counts
- `lead_search_runs`: exact search query/provider outcome
- `lead_candidates`: public evidence, contacts, fit, score, review status and import link

The migration also adds lead-source, campaign, social-profile and verification fields to `b2b_leads`.

## Verification policy

A candidate is not automatically verified from a search snippet.

Automatic verification requires:

- a valid company website/domain
- evidence that the company is a relevant B2B buyer type
- product-fit evidence
- at least one public business contact (email, phone or WhatsApp)
- verification score of 70 or higher

Admins can manually mark a candidate verified or rejected after reviewing stored evidence.

## Duplicate policy

The engine checks normalized website domains and lowercase email addresses against:

- candidates already stored in the research database
- existing imported `b2b_leads`
- the CRM again immediately before import

Campaign deletion removes research candidates and search runs, but does not delete already imported CRM leads.

## Runtime requirements

- Lead Engine database migration applied
- `LOVABLE_API_KEY` available to the Edge Function
- a Firecrawl-compatible backend runtime credential available as one of:
  - `FIRECRAWL_API_KEY`
  - `LOVABLE_FIRECRAWL_API_KEY`
  - `CONNECTOR_FIRECRAWL_API_KEY`

The workspace has a Firecrawl connection, but the UI reports the Edge Function runtime state separately. A workspace connection is not reported as operational until the Edge Function can see a compatible credential and the first API call succeeds.

## Safety and cost controls

- admin authentication and role check on every action
- maximum 8 search queries per run
- maximum 100 discovery target candidates per campaign run
- maximum 20 candidates per enrichment request
- maximum 100 candidates per CRM import request
- maximum 3 public website pages scraped per enrichment candidate
- no public prices or unsupported Irha Apparels claims added to outreach data
- exact provider errors are stored instead of fabricating results

## Current boundary

This release covers research, verification and CRM import.

It does not yet send outreach email, LinkedIn messages or WhatsApp messages. Those writes belong to the next approval-based Outreach Engine phase.
