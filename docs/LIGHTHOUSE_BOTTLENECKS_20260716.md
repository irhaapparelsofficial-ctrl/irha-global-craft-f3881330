# Mobile Lighthouse bottleneck diagnostics — 2026-07-16

## home — 77/100

- **largest-contentful-paint**: 2.8 s
- **first-contentful-paint**: 2.2 s
- **speed-index**: 4.8 s
- **total-blocking-time**: 520 ms
- **cumulative-layout-shift**: 0
- **mainthread-work-breakdown**: 3.2 s
- **bootup-time**: 1.4 s
- **unused-javascript**: Est savings of 81 KiB (saving 540 ms, saving 81 KiB)
- **unused-css-rules**: Est savings of 20 KiB (saving 150 ms, saving 20 KiB)
- **render-blocking-resources**: Est savings of 0 ms (saving 0 ms)
- **uses-responsive-images**:  (saving 0 ms, saving 0 KiB)
- **uses-optimized-images**:  (saving 0 ms, saving 0 KiB)
- **modern-image-formats**:  (saving 0 ms, saving 0 KiB)
- **offscreen-images**:  (saving 0 ms, saving 0 KiB)
- **network-requests**: Network Requests
- **largest-contentful-paint-element**: 2,830 ms
  - LCP element: `<img alt="Custom Bavarian and Trachten apparel manufacturing" width="1000" height="1250" class="h-full w-full object-contain p-3 transition-transform duration-700 group-h…" src="/thumbnails/product-media/distressed-brown-short-lederhosen/01-hero-front.…" srcset="/responsive/360/product-media/distres`
- **lcp-lazy-loaded**: Largest Contentful Paint image was not lazily loaded
- **prioritize-lcp-image**:  (saving 0 ms)
- **third-party-summary**: Third-party code blocked the main thread for 50 ms
- **dom-size**: 151 elements

Largest transferred resources:
- 77 KiB — https://irhaapparels.com/assets/index-Bn_oSQEw.js
- 52 KiB — https://irhaapparels.com/assets/client-CkAV-PUJ.js
- 45 KiB — https://irhaapparels.com/assets/dist-Z1EN_Xdd.js
- 23 KiB — https://irhaapparels.com/assets/index-C2MTY5Bn.css
- 21 KiB — https://irhaapparels.com/favicon.ico
- 15 KiB — https://irhaapparels.com/thumbnails/product-media/distressed-brown-short-lederhosen/01-hero-front.webp.webp
- 11 KiB — https://static.cloudflareinsights.com/beacon.min.js/v4513226cdae34746b4dedf0b4dfa099e1781791509496
- 9 KiB — https://irhaapparels.com/assets/og-sportswear-0ZYvt3lp.webp

Largest JS execution costs:
- 1507 ms total / 744 ms scripting — Unattributable
- 735 ms total / 24 ms scripting — https://irhaapparels.com/?lh_diag=30583
- 609 ms total / 377 ms scripting — https://irhaapparels.com/assets/dist-Z1EN_Xdd.js
- 229 ms total / 179 ms scripting — https://static.cloudflareinsights.com/beacon.min.js/v4513226cdae34746b4dedf0b4dfa099e1781791509496
- 59 ms total / 0 ms scripting — https://irhaapparels.com/assets/index-C2MTY5Bn.css
- 57 ms total / 29 ms scripting — https://irhaapparels.com/assets/index-Bn_oSQEw.js

## products — 82/100

- **largest-contentful-paint**: 4.4 s
- **first-contentful-paint**: 2.1 s
- **speed-index**: 2.1 s
- **total-blocking-time**: 100 ms
- **cumulative-layout-shift**: 0
- **mainthread-work-breakdown**: 1.5 s
- **bootup-time**: 0.5 s
- **unused-javascript**: Est savings of 78 KiB (saving 620 ms, saving 78 KiB)
- **unused-css-rules**: Est savings of 20 KiB (saving 160 ms, saving 20 KiB)
- **render-blocking-resources**: Est savings of 310 ms (saving 311 ms)
- **uses-responsive-images**: Est savings of 2,015 KiB (saving 0 ms, saving 2015 KiB)
- **uses-optimized-images**:  (saving 0 ms, saving 0 KiB)
- **modern-image-formats**: Est savings of 2,713 KiB (saving 0 ms, saving 2713 KiB)
- **offscreen-images**:  (saving 0 ms, saving 0 KiB)
- **network-requests**: Network Requests
- **largest-contentful-paint-element**: 4,420 ms
  - LCP element: `<p class="mt-8 text-lg text-foreground/70 max-w-3xl leading-relaxed">`
- **lcp-lazy-loaded**: Largest Contentful Paint image was not lazily loaded
- **prioritize-lcp-image**: Preload Largest Contentful Paint image
- **third-party-summary**: Third-party code blocked the main thread for 0 ms
- **dom-size**: 894 elements

Largest transferred resources:
- 2123 KiB — https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/migrated-lovable/78/7890c934098f80ed4fa3bdb5f693613cd8c57f3da631aed86d3e6986508bbcd7.png
- 869 KiB — https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/migrated-lovable/32/329b168f762b26aac6a426809fef57987aa58eedab66972437d809dd4dc1940b.png
- 77 KiB — https://irhaapparels.com/assets/index-Bn_oSQEw.js
- 52 KiB — https://irhaapparels.com/assets/client-CkAV-PUJ.js
- 45 KiB — https://irhaapparels.com/assets/dist-Z1EN_Xdd.js
- 40 KiB — https://pvzjiozismyxqrzmtfbi.supabase.co/rest/v1/rpc/catalog_get_public_release
- 39 KiB — https://irhaapparels.com/assets/usePublicCatalog-6svRg0x8.js
- 23 KiB — https://irhaapparels.com/assets/index-C2MTY5Bn.css

Largest JS execution costs:
- 612 ms total / 424 ms scripting — https://irhaapparels.com/assets/dist-Z1EN_Xdd.js
- 443 ms total / 88 ms scripting — Unattributable
- 210 ms total / 10 ms scripting — https://irhaapparels.com/products/?lh_diag=20733
- 56 ms total / 0 ms scripting — https://irhaapparels.com/assets/constants-BA3rRn5q.js

## catalogue — 75/100

- **largest-contentful-paint**: 6.2 s
- **first-contentful-paint**: 2.2 s
- **speed-index**: 2.8 s
- **total-blocking-time**: 20 ms
- **cumulative-layout-shift**: 0
- **mainthread-work-breakdown**: 1.2 s
- **bootup-time**: 0.4 s
- **unused-javascript**: Est savings of 79 KiB (saving 320 ms, saving 79 KiB)
- **unused-css-rules**: Est savings of 20 KiB (saving 160 ms, saving 20 KiB)
- **render-blocking-resources**: Est savings of 320 ms (saving 316 ms)
- **uses-responsive-images**: Est savings of 1,659 KiB (saving 1350 ms, saving 1659 KiB)
- **uses-optimized-images**:  (saving 0 ms, saving 0 KiB)
- **modern-image-formats**: Est savings of 2,955 KiB (saving 630 ms, saving 2955 KiB)
- **offscreen-images**:  (saving 0 ms, saving 0 KiB)
- **network-requests**: Network Requests
- **largest-contentful-paint-element**: 6,180 ms
  - LCP element: `<img src="/assets/og-bavarian-hero-DmROEEkY.jpg" alt="Bavarian garments catalogue" width="1920" height="1280" loading="eager" fetchpriority="high" decoding="async" class="h-full w-full object-cover ">`
- **lcp-lazy-loaded**: Largest Contentful Paint image was not lazily loaded
- **prioritize-lcp-image**: Est savings of -140 ms (saving -142 ms)
- **third-party-summary**: Third-party code blocked the main thread for 0 ms
- **dom-size**: 306 elements

Largest transferred resources:
- 1604 KiB — https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/catalog-migrated/c3826fca-27d4-4211-89dd-7a0e8ed24cbe/99b556dadbf757eb9552.png
- 1046 KiB — https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/catalog-migrated/baec93f5-4c96-404b-9107-00c4ecdb1ace/23e3561ca8b39b7e4412.png
- 336 KiB — https://irhaapparels.com/assets/og-bavarian-hero-DmROEEkY.jpg
- 286 KiB — https://irhaapparels.com/assets/og-sportswear-CB8-_gUA.jpg
- 268 KiB — https://irhaapparels.com/assets/og-leather-CkMyE94p.jpg
- 251 KiB — https://irhaapparels.com/assets/og-streetwear-DFMIr38l.jpg
- 205 KiB — https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/thumbnails/catalog/bavarian-checkered-shirt/b04d27bc78a04337eeb0-6cf5ec8f6258.png.webp
- 180 KiB — https://irhaapparels.com/assets/og-nightwear-CXoUwRX0.jpg

Largest JS execution costs:
- 467 ms total / 306 ms scripting — https://irhaapparels.com/assets/dist-Z1EN_Xdd.js
- 353 ms total / 52 ms scripting — Unattributable
- 245 ms total / 3 ms scripting — https://irhaapparels.com/catalogue/?lh_diag=2022
