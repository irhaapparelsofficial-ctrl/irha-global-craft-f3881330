The top two DNS records are correct now:

- `@` → `cname.lovable.app` → Proxied
- `www` → `cname.lovable.app` → Proxied

For the last visible record:

- `_dmarc` TXT is only for email security.
- Do not delete it.
- Do not edit it.
- Leave it as DNS only.

What to do next:

1. Tap/collapse the open `_dmarc` record if it is expanded.
2. Press `Add record`.
3. Add the missing Lovable verification TXT record:
   - Type: `TXT`
   - Name: `_lovable`
   - Content/Value: copy from Lovable domain setup, it starts like `lovable_verify=...`
   - Proxy: not applicable / DNS only
   - TTL: Auto
4. Save it.

After this, go back to Lovable Domains and click verify/complete setup for both `irhaapparels.com` and `www.irhaapparels.com`.