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

## Owner OAuth and OpenID Connect

Authenticated owner resources use the owner-controlled Supabase authorization server:

`https://pvzjiozismyxqrzmtfbi.supabase.co/auth/v1`

Live discovery aliases are available at:

- `/.well-known/openid-configuration`
- `/.well-known/oauth-authorization-server`
- `/.well-known/oauth-protected-resource`

The protected resource is the owner Supabase backend. OAuth or OpenID Connect tokens remain subject to database row-level security, authenticated-user checks and owner/admin authorization. A token never grants blanket access.

## Owner and admin resources

Admin, CRM, outreach, social publishing, analytics and private file resources require an authenticated owner session and server-side authorization checks. Their private operations are not included in the public API catalog and are not available to anonymous agents.

## Agent registration

No unrestricted autonomous public agent registration is offered by Irha Apparels. A third-party agent must not claim an Irha Apparels identity, publish content, send outreach, approve commercial terms or access owner data without a separately executed agreement, registered client and owner-controlled authorization.

Approved integrations must use authorization code with PKCE, explicit user consent and minimum-necessary access. See `/docs/oauth.md` for the resource boundary.

## Contact

For an approved integration, use the official inquiry page at `https://irhaapparels.com/inquiry` and describe the intended system, requested access and data-handling requirements.
