## Irha Apparels — Peak Professional Upgrade Plan

### 1. Trust & Credibility (Global)
- **Clients strip** — animated marquee of 12 brand-style client logos (generic SVG marks, "Trusted by leading retailers across USA, EU, UAE")
- **Certifications row** — ISO 9001, BSCI, OEKO-TEX®, SEDEX, WRAP, GOTS badges with tooltip descriptions
- **Factory KPI counters** — animated count-up: 500+ machines, 350+ artisans, 2M+ units/year, 25+ countries shipped, 12+ years experience
- **Testimonials carousel** — 6 international buyer quotes (USA, Germany, UAE, UK) with role + company
- **Press / Featured-in strip** — "As seen in" trade publication marks

### 2. Premium Banners (Video-style)
- **Home hero** — full-bleed cinematic image with subtle Ken Burns zoom + parallax layers + animated gold accent lines (CSS only, no actual video file to keep load fast)
- **Category banners** — each of the 6 categories gets a wide editorial banner with overlay text + gold gradient
- **About page banner** — factory floor cinematic
- **Manufacturing banner** — machinery close-up with overlay stats
- Generate 8 new premium 1920×1080 banner images

### 3. Products — Sub-categories + Massive Catalog
Each of the 6 categories gets **sub-categories** with product lists. Target ~100 products per category through sub-categories:

- **Bavarian Wear** → Lederhosen (men), Dirndl (women), Trachten Shirts, Trachten Jackets, Kids Trachten, Accessories
- **Sportswear** → T-Shirts, Hoodies, Track Suits, Shorts, Compression Wear, Jerseys, Gym Tanks, Joggers
- **Leatherwear** → Biker Jackets, Bomber Jackets, Leather Pants, Leather Shirts, Vests, Gloves, Accessories
- **Streetwear** → Oversized Tees, Cargo Pants, Windbreakers, Varsity Jackets, Denim, Caps
- **Leisurewear** → Polo Shirts, Chinos, Cardigans, Linen Shirts, Lounge Sets
- **Nightwear** → Pajama Sets, Robes, Nighties, Loungewear, Kids Sleepwear

**Implementation approach** (image-realistic, not 600 generated images):
- Build a structured catalog: 6 categories × ~6 sub-categories × ~15-20 product entries each
- Generate **~8 hero images per sub-category** that act as a rotating image pool; products in same sub-category share/cycle through them (industry-standard for B2B catalogs)
- Total new generated images: ~50 (sub-category pools) + 8 banners = ~58 images
- Each product still has: name, SKU, fabric, MOQ, color options, size range
- Sub-category accordion/tab view on Products page; click product → existing detail modal

### 4. New Pages
- **`/sustainability`** — Hero, commitments (ethical labor, eco materials, water reduction), certifications grid, supply chain transparency, CSR initiatives
- **`/faq`** — Accordion grouped by: Ordering & MOQ, Customization, Samples, Shipping & Logistics, Payment, Quality & Compliance (~30 Q&A)
- **`/journal`** — Blog landing with 6 static editorial articles (Craft of Lederhosen, Sustainable Leather, Sialkot's Apparel Legacy, etc.) + individual article route `/journal/:slug`

### 5. Home Page Polish
- Cinematic hero with parallax + animated tagline
- Trust strip directly under hero
- Animated 4-step process timeline (Concept → Sampling → Production → Delivery)
- KPI counters section
- Featured collections (existing) — refined cards
- Testimonials carousel
- Awards/press strip
- Final CTA band

### 6. Manufacturing Depth
- **Capability matrix table** — fabric types × processes × monthly capacity
- **Production capacity table** — category × monthly units × lead time
- **6-stage QC process** — visual stepper (Fabric inspection → Cutting → Stitching → Mid-line → Final → Pre-shipment)
- **Compliance section** — full certification grid with descriptions
- **Sustainability snapshot** linking to new page

### 7. Lead Capture & UX
- **Multi-step inquiry form** (3 steps): Company info → Product details (category, sub-category, qty, target price) → Timeline & files
- **Quote calculator widget** — pick category, qty, customization → estimated lead time + indicative price range
- **RFQ template download** — branded PDF (we'll create a static one)
- **Sticky bottom-bar CTA** on mobile: WhatsApp + Get Quote
- File upload field in inquiry (tech packs, sketches) — stored via Lovable Cloud storage bucket

### 8. Navigation Updates
- Add to navbar: Sustainability, Journal, FAQ (or group under a "Company" mega-menu dropdown)
- Footer: full sitemap with new pages

---

### Technical Notes
- All new sections use existing design tokens (gold/dark editorial theme) — no token changes
- Counters use IntersectionObserver + requestAnimationFrame
- Testimonials carousel via existing `embla-carousel-react`
- Multi-step form via local state + zod validation
- File upload → Supabase storage bucket `inquiry-attachments` with public-read off, signed URLs
- Sub-category data: extend `src/lib/categories.ts` with `subCategories: SubCategory[]` containing `products: Product[]`
- Images: generated as JPGs into `src/assets/products/<category>/` and `src/assets/banners/`
- Languages: per your answer, **not adding** multi-language switcher — focus instead on premium visual banners as you specified
- No backend schema changes except one new storage bucket for inquiry files

### Estimated scope
- ~58 new generated images
- ~12 new component files
- ~3 new page files + 1 article route
- Extended `categories.ts` data structure
- 1 storage bucket migration
- Touches: Home, Products, Manufacturing, Inquiry, About (banner), Navbar, Footer

This is a substantial build (~30-45 min generation + edits). I'll execute in this order: data structure → banner images → sub-category images → new pages → home/manufacturing polish → multi-step inquiry → nav/footer.