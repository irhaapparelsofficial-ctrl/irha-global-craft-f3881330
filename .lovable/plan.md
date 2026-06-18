## Goal

Teen SEO upgrades:
1. **Google Business Profile-grade structured data** — current `LocalBusiness` schema ko richer banana taake GBP / local pack me strongly match ho.
2. **Auto-ping** — har deploy ke baad Google + Bing ko sitemap update ka signal jaye, plus daily cron jo Google ko remind karta rahe.
3. **Hreflang tags** — Germany, UK, USA, Austria audiences ke liye locale signals.

---

## 1. Google Business Profile structured data

`index.html` me existing `LocalBusiness` ko richer schema se replace:

- `@type` ko `"LocalBusiness"` se `["LocalBusiness", "ClothingStore", "Manufacturer"]` multi-type karna (Google ko local + manufacturer dono context milta hai)
- `logo` field add (favicon ki jagah proper logo URL — preview image se)
- `foundingDate`, `numberOfEmployees`, `slogan` add
- `contactPoint` array — sales/support ke alag entries with `availableLanguage: ["English","Urdu","German"]`
- `hasOfferCatalog` — 6 product categories (Bavarian, Sportswear, Leatherwear, Streetwear, Leisurewear, Nightwear) as `OfferCatalog` with `Offer` items linking to `/products/<slug>`
- `aggregateRating` skip (fake ratings = manual penalty); leave for real reviews later
- `paymentAccepted`, `currenciesAccepted: "USD, EUR, GBP, AED"`
- `knowsAbout` — keywords like "OEM apparel manufacturing", "Lederhosen production", etc.

Naya separate `Organization` schema bhi rakhenge with `sameAs` for social profiles (already partially present) — yeh `LocalBusiness` ke side me crawlers ko entity disambiguation deta hai.

---

## 2. Sitemap auto-ping

Do layers:

**A. Build-time ping** — `scripts/ping-search-engines.mjs` create karenge. `postbuild` script me add karenge taake har production build ke baad Google + Bing + IndexNow ko sitemap ka notification jaye:

```text
GET https://www.google.com/ping?sitemap=https://www.irhaapparels.com/sitemap.xml
GET https://www.bing.com/ping?sitemap=https://www.irhaapparels.com/sitemap.xml
POST https://api.indexnow.org/indexnow  (Bing/Yandex modern protocol)
```

IndexNow ke liye 32-char key file `public/<key>.txt` me daal denge.

**B. Daily Search Console refresh** — Supabase edge function `sitemap-ping` create karenge jo:
- Lovable AI gateway ke connector se GSC ke `sitemaps.submit` endpoint ko call kare
- `lastmod` refresh karne ke liye sitemap fetch + re-submit kare

Phir `pg_cron` + `pg_net` enable karke daily 03:00 UTC pe trigger hoga via `supabase--insert` SQL.

> Note: Google ne `/ping` endpoint June 2023 me deprecate kar diya tha; isliye primary mechanism GSC API resubmit hai (jo already verified hai), aur `/ping` sirf belt-and-suspenders ke taur pe.

---

## 3. Hreflang tags

`src/components/SEO.tsx` me hreflang block add karenge. Site single-language (English) hai lekin geo-targeting alag-alag markets ke liye chahiye — so we'll emit:

```html
<link rel="alternate" hreflang="en" href="https://www.irhaapparels.com{path}" />
<link rel="alternate" hreflang="en-US" href="…" />
<link rel="alternate" hreflang="en-GB" href="…" />
<link rel="alternate" hreflang="en-AU" href="…" />
<link rel="alternate" hreflang="en-CA" href="…" />
<link rel="alternate" hreflang="en-AE" href="…" />
<link rel="alternate" hreflang="de-DE" href="…" />
<link rel="alternate" hreflang="de-AT" href="…" />
<link rel="alternate" hreflang="x-default" href="…" />
```

Sab same canonical URL pe point karenge (because content English hai for all markets). Yeh Google ko batata hai ki yeh page in sab regions ke liye relevant hai bina duplicate-content penalty ke. Hreflang har route pe auto-inject hoga because every page uses the `<SEO>` component.

---

## Files to change

| File | Change |
|---|---|
| `index.html` | Expand LocalBusiness schema (multi-type, contactPoint, hasOfferCatalog, knowsAbout) |
| `src/components/SEO.tsx` | Inject hreflang `<link>` tags for en/en-US/en-GB/en-AU/en-CA/en-AE/de-DE/de-AT/x-default |
| `scripts/ping-search-engines.mjs` (new) | Post-build ping: Google, Bing, IndexNow |
| `package.json` | Update `postbuild` to also run ping script |
| `public/<indexnow-key>.txt` (new) | IndexNow verification file |
| `supabase/functions/sitemap-ping/index.ts` (new) | Daily GSC sitemap re-submit via connector gateway |
| Cron SQL (run via `supabase--insert`) | `pg_cron` + `pg_net` enable + daily schedule for `sitemap-ping` |

---

## What user should do after deploy

1. **Publish** karna hoga taake hreflang + expanded schema live ho jaye
2. **Google Business Profile** ([business.google.com](https://business.google.com)) par jakar manually claim karna hoga `Irha Apparels` Sialkot location — structured data sirf signal hai, profile khud user banata hai
3. Cron daily Google ko ping karega — koi manual kaam nahi

---

## Out of scope

- Real translation of pages into German (would need full content migration; current site is English)
- Real customer reviews / `aggregateRating` (fake = penalty risk)
- Per-country pricing pages
