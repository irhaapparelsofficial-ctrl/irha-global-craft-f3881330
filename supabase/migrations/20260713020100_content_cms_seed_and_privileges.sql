-- Final hardening/seed companion for Phase 2.3.
-- Applied only during the owner's later one-time backend activation.

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_locale_uidx
  ON public.blog_posts (slug, locale);
CREATE UNIQUE INDEX IF NOT EXISTS seo_page_overrides_route_locale_uidx
  ON public.seo_page_overrides (route, locale);
CREATE UNIQUE INDEX IF NOT EXISTS internal_links_unique_link_uidx
  ON public.internal_links (from_route, to_route, anchor_text, locale);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blog_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.faqs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seo_page_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.internal_links TO authenticated;

GRANT SELECT ON TABLE public.blog_posts TO anon;
GRANT SELECT ON TABLE public.faqs TO anon;
GRANT SELECT ON TABLE public.seo_page_overrides TO anon;
GRANT SELECT ON TABLE public.internal_links TO anon;

WITH verified_faqs(locale, category, question, answer, sort_order) AS (
  VALUES
    ('en','Company & Verification','Is Irha Apparels a new manufacturer?','No. Irha Apparels is an experienced apparel manufacturer in Sialkot. The website is newly built, so buyers are encouraged to verify the team and program directly instead of relying on website age alone.',10),
    ('en','Company & Verification','Can I see the factory before placing an order?','You can request a scheduled live factory video call. The team confirms availability and the relevant viewing scope after reviewing your category and meeting request.',20),
    ('en','Company & Verification','How can my company verify Irha Apparels?','Share your business requirement, request a live call, review the quotation and program evidence, and confirm specifications, samples and commercial terms before committing to production.',30),
    ('en','Quotes & MOQ','What is your minimum order quantity?','MOQ is confirmed per program. It depends on the product, material, color split, customization, labels, packaging and production setup. Send the exact requirement for a reliable answer.',40),
    ('en','Quotes & MOQ','Why are prices not shown on the website?','Irha Apparels is a custom B2B manufacturer, not a fixed-price retail store. Unit cost changes with fabric or leather, construction, embellishment, quantity, packaging, destination and shipping scope.',50),
    ('en','Quotes & MOQ','What information is needed for a quotation?','Provide the product or reference, material preference, estimated quantity, size and color range, customization, branding, destination country and target delivery window. A tech pack is helpful but not required for the first review.',60),
    ('en','Samples & Development','Can I request a sample before bulk production?','Yes, sample requests can be reviewed before bulk production. Sample feasibility, cost, timing and shipping are confirmed after the product and customization scope are understood.',70),
    ('en','Samples & Development','Can you develop a product from a sketch or reference image?','OEM, ODM and private-label development can start from a tech pack, sketch, reference garment or image. The team first confirms what can be developed without copying protected branding or unsupported details.',80),
    ('en','Samples & Development','What happens if I request changes after sample approval?','Changes are documented and reviewed again because they may affect material use, pattern, artwork, cost or timing. Bulk should proceed only against the latest approved specification.',90),
    ('en','Customization & Private Label','What private-label options are available?','Depending on the program, options may include woven or printed labels, care labels, hangtags, packaging, embroidery, printing, trims and other buyer branding. Availability and MOQ are confirmed for the exact request.',100),
    ('en','Customization & Private Label','Can you match my colors, fabric or trims?','Color, material and trim matching can be reviewed against references or specifications. Approval samples, swatches or alternatives may be required before bulk production.',110),
    ('en','Customization & Private Label','Can we discuss confidentiality or an NDA?','Yes. Tell the team about confidentiality, design ownership or exclusivity requirements before sharing sensitive files so the appropriate commercial terms can be discussed.',120),
    ('en','Quality & Documentation','How is product quality agreed?','Quality is judged against the approved specification, sample, measurements, materials, artwork, trims and packaging requirements. The inspection plan should be agreed before production.',130),
    ('en','Quality & Documentation','Do all products carry the same certifications?','No blanket certification claim is made for every product. Material, testing and compliance documents are confirmed according to the exact fabric or leather, supplier, destination and buyer requirement.',140),
    ('en','Quality & Documentation','Can third-party inspection be arranged?','Third-party inspection requirements can be discussed and included in the order plan before production. The inspection scope, timing, cost and responsible party must be agreed in writing.',150),
    ('en','Production, Shipping & Payment','How long will production take?','Timing is confirmed after the product, quantity, material availability, sample approval and customization are reviewed. A date shown before that review would not be reliable.',160),
    ('en','Production, Shipping & Payment','Which shipping terms are available?','The team can review suitable Incoterms and shipping options based on destination, shipment size and buyer preference. The quotation states what is included and which destination costs remain with the buyer.',170),
    ('en','Production, Shipping & Payment','What payment terms do you accept?','Payment method and milestones are stated on the approved quotation or proforma invoice. Do not send payment against an informal message that does not match the confirmed company and order documents.',180)
)
INSERT INTO public.faqs (locale, category, question, answer, sort_order, is_published)
SELECT seed.locale, seed.category, seed.question, seed.answer, seed.sort_order, true
FROM verified_faqs seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.faqs existing
  WHERE existing.locale = seed.locale
    AND lower(btrim(existing.question)) = lower(btrim(seed.question))
);
