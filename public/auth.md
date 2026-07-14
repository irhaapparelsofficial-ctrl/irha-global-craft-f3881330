# Irha Apparels Agent Authentication

## Public discovery and read-only tools

The following resources are public and require no credentials:

- `/.well-known/api-catalog`
- `/.well-known/agent-skills/index.json`
- `/.well-known/mcp/server-card.json`
- `/mcp`
- `/openapi/public-lead-gateway.json`
- `/llms.txt`
- `/llms-full.txt`

The public MCP server exposes read-only buyer information and prepares reviewable links. It does not submit buyer data or expose private records.

## Public lead submissions

The public lead gateway accepts rate-limited B2B inquiries, catalogue requests and signed upload-ticket requests. It does not require an OAuth token. Agents must obtain the buyer's explicit confirmation before sending any side-effecting submission.

## Owner and admin resources

Admin, CRM, outreach, social publishing, analytics and private file resources are not advertised for autonomous public use. They require the authenticated owner session and server-side authorization checks. Their internal authentication endpoints, scopes and implementation details are deliberately excluded from the public API catalog.

## Agent registration

No autonomous public agent registration is currently offered. A third-party agent must not claim an Irha Apparels identity, publish content, send outreach, approve commercial terms or access owner data without a separately executed agreement and owner-controlled authorization.

## Contact

For an approved integration, use the official inquiry page at `https://irhaapparels.com/inquiry` and describe the intended system, requested access and data-handling requirements.
