# Irha Apparels Public MCP Server

Endpoint: `https://irhaapparels.com/mcp`

Transport: Streamable HTTP

Protocol version: `2025-06-18`

The server is intentionally small, public and read-only. It exposes only buyer-safe information already available on the public website.

## Tools

### `list_b2b_collections`

Returns the current Irha Apparels manufacturing hubs and public collection links.

### `get_factory_verification_options`

Returns buyer-trust information, the live factory video-call page and the inquiry page. It does not book a meeting.

### `prepare_buyer_inquiry`

Builds a reviewable `/inquiry` URL from category, quantity, country and a short message. The tool never sends or stores buyer information. The buyer must open, review and submit the website form.

## Safety and commercial accuracy

- No admin, CRM, lead, private upload or automation data is exposed.
- No tool performs a purchase, sends an email, posts to social media or creates a commercial commitment.
- Product feasibility, materials, MOQ, pricing, production timing, shipping and documents remain subject to human review by Irha Apparels.
- The public MCP server does not require authentication because every advertised operation is read-only.

## Discovery

The server card is available at `/.well-known/mcp/server-card.json`, and the API catalog is available at `/.well-known/api-catalog`.
