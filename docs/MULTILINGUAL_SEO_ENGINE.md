# Irha Multilingual SEO Engine v1

## Purpose

Build maximum international search coverage through useful localized B2B pages, not hidden keywords or mass doorway pages.

The engine separates:

1. global locale planning
2. internal semantic keyword research
3. localized page generation
4. AI quality review
5. native-language review
6. admin approval
7. a separate publish action
8. published-only hreflang and sitemap inclusion

## 52-locale registry

The database starts with 52 market/language variants covering priority European, Middle Eastern, South Asian, East Asian, Southeast Asian and selected African markets.

A registered locale is not automatically an indexed website language.

Locale states:

- `planned`: research/generation allowed, publishing blocked
- `active`: passing pages can be published
- `paused`: new publishing blocked
- `retired`: retained for history but not used for rollout

Initial active priority includes German variants for Germany/Austria/Switzerland, French (France), Spanish (Spain), Italian, Dutch and Arabic (UAE). The remaining locales are planned until useful content and competent review capacity exist.

## Keyword atlas

`seo_keyword_clusters` stores internal strategy data:

- commercial/transactional/informational/navigational intent
- market and product focus
- primary phrases
- supporting phrases
- buyer questions
- negative/consumer-intent phrases
- source notes

Keyword clusters are not rendered as hidden HTML and are not written to a deprecated meta-keywords tag.

Unless a verified external SEO data source is connected, the engine does not invent:

- search volume
- CPC
- keyword difficulty
- ranking position
- trend percentages

## Localized page workflow

### Draft generation

Admin supplies:

- locale
- existing English base route
- page type
- verified source title
- verified source/business facts
- product focus
- optional approved keyword clusters

The AI creates a noindex draft containing:

- SEO title and description
- H1 and introduction
- useful localized sections
- buyer FAQs
- quote/contact CTA
- internal links
- JSON-LD

### AI quality review

The review checks:

- language consistency
- natural B2B terminology
- market usefulness
- uniqueness
- title/description quality
- section/FAQ completeness
- keyword-stuffing risk
- unsupported business claims
- internal-link safety

A score of at least 80 and a passing report are required before approval.

AI review never publishes a page.

### Native review and approval

For locales marked `requires_native_review`, an admin must explicitly confirm that a competent reviewer checked the page.

Approval still keeps the page `noindex`.

### Publishing

Publishing is a separate irreversible search-visibility decision. It requires:

- active locale
- AI-reviewed page
- passing quality report
- quality score 80+
- native review approved or not required
- explicit admin approval

Only then does the page become:

- `status = published`
- `noindex = false`
- publicly readable
- eligible for hreflang and sitemap inclusion

## Public routes

Localized pages use:

`/intl/{locale}/{slug}`

Example:

`/intl/de-de/lederhosen-hersteller-fuer-grosshandel`

The route reads only published, indexable rows through public RLS.

The page renderer supports:

- locale-specific `<html lang>`
- RTL direction where required
- canonical URL
- reciprocal published hreflang variants
- English base-route alternate
- x-default to the English base route
- localized Open Graph locale
- localized FAQ/Service or Article JSON-LD

## Sitemap

The build script retains strict product/category sitemap requirements.

Localized SEO is optional during migration, but after the tables are available it fetches only rows where:

- `status = published`
- `noindex = false`

For every published language group, the sitemap emits reciprocal XHTML hreflang links for:

- English base route
- each published localized route
- x-default English base route

Draft, AI-reviewed, approved-but-noindex, rejected and archived pages never enter the sitemap.

## Business truth rules

Localized content may state:

- Irha Apparels is an experienced apparel manufacturer in Sialkot, Pakistan.
- Buyer verification should focus on the exact program, team and written scope.
- OEM, ODM, private-label and custom manufacturing are available.
- A live factory video call is available.
- A tailored quote follows requirement review.

It must not invent:

- public prices
- MOQ
- delivery dates
- certifications
- customer names/logos
- order counts
- reviews
- materials/specifications not present in verified source facts
- shipping/compliance promises

## Current boundary

This release provides architecture and controlled execution for many languages, but it does not claim 52 finished or indexed language sites. Search visibility grows only as useful pages are generated, reviewed and deliberately published per market.
