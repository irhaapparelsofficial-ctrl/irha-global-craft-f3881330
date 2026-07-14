# Irha Apparels OAuth and Protected Resources

Irha Apparels uses the owner-controlled Supabase project `pvzjiozismyxqrzmtfbi` for authenticated owner sessions, token issuance, JWT verification and row-level authorization.

## Authorization server

Issuer: `https://pvzjiozismyxqrzmtfbi.supabase.co/auth/v1`

Discovery aliases are published on the Irha Apparels domain at:

- `/.well-known/openid-configuration`
- `/.well-known/oauth-authorization-server`

Both aliases describe the live Supabase OAuth 2.1 and OpenID Connect endpoints. The signing-key endpoint currently publishes an asymmetric ES256 verification key.

## Protected resource

The protected resource is the owner Supabase backend at `https://pvzjiozismyxqrzmtfbi.supabase.co`. Its metadata is published at `/.well-known/oauth-protected-resource`.

A valid token does not by itself grant unrestricted access. Database row-level security, authenticated-user checks and owner/admin authorization continue to control every private operation.

## Public versus private surfaces

The public website, public discovery files and the read-only public MCP tools require no OAuth token. Buyer submissions remain rate-limited and require buyer confirmation. Admin, CRM, private media, outreach, social publishing and commercial approval operations require an authenticated and authorized owner session.

## Client registration and consent

No unrestricted autonomous client registration or blanket third-party access is offered by Irha Apparels. Approved integrations must use the authorization-code flow with PKCE, explicit user consent and the minimum necessary access. Client registration and access approval remain under owner control.
