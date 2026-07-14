insert into public.admin_ai_knowledge
(knowledge_key, category, title, content, instructions, tags, truth_status, source_type, source_reference, admin_route, owner_approval_required, priority)
values
(
  'company.identity','company','Irha Apparels identity',
  'Irha Apparels is an experienced B2B custom apparel manufacturer based in Sialkot, Pakistan. The website is newly built; the manufacturing business is not new.',
  '{"reply_rule":"Use the experienced manufacturer / newly built website distinction whenever trust or company history is discussed."}',
  array['irha apparels','company','sialkot','manufacturer','website'],
  'verified','owner_approved','ai_business_rules v2','/admin/ai-assistant',false,100
),
(
  'company.trust_factory_video','company','Factory trust point',
  'A scheduled live video view of the manufacturing environment can be offered during buyer requirement discussion.',
  '{"reply_rule":"Describe this as available on a scheduled live video call; do not imply an unrestricted factory visit or live stream."}',
  array['factory','video call','trust','buyer'],
  'verified','owner_approved','ai_business_rules v2','/admin/leads',false,96
),
(
  'commercial.quote_only','commercial','Quote-only commercial policy',
  'The website must not show public prices. Price, MOQ, sample cost, production timing, payment terms, shipping and delivery commitments are confirmed only after requirement and factory review.',
  '{"owner_only":["final price","discount","payment terms","production date","delivery date","complaint settlement"],"currencies":["USD","EUR","GBP"],"incoterms":["FOB","CIF","DDP subject to confirmation"]}',
  array['price','quotation','moq','sample','lead time','shipping','payment'],
  'verified','owner_approved','ai_business_rules v2','/admin/pi-generator',true,100
),
(
  'catalog.core_programs','catalog','Core apparel programs',
  'The five approved manufacturing programs are Bavarian & Trachten Wear, Premium Leather Apparel, Custom Sportswear & Teamwear, Streetwear & Activewear, and Leisurewear & Nightwear.',
  '{"database_rule":"Use the live products and categories tables for exact current names and counts."}',
  array['products','categories','bavarian','leather','sportswear','streetwear','nightwear'],
  'verified','owner_approved','ai_business_rules v2','/admin/products',false,92
),
(
  'catalog.customization','catalog','Verified customization options',
  'Verified options include private label, embroidery, DTF printing, woven labels, care labels, hang tags and custom packaging subject to quotation.',
  '{"prohibited":"Do not add certifications or capabilities that are not present in approved business rules or live product data."}',
  array['private label','embroidery','dtf','labels','packaging'],
  'verified','owner_approved','ai_business_rules v2','/admin/products',false,88
),
(
  'crm.workflow','tutorial','Buyer CRM operating tutorial',
  'Open Buyer Inbox first. Review new and overdue records, verify buyer identity and product fit, set CRM stage and priority, assign a follow-up date, add notes and create a task. Use Buyer 360 for contacts, files and full activity history.',
  '{"steps":["Open Buyer Inbox","Check evidence and duplicate risk","Set stage and priority","Set follow-up date","Add note/task","Open Buyer 360 for detailed work"],"routes":["/admin/leads","/admin/pipeline","/admin/buyer360"]}',
  array['tutorial','crm','buyer inbox','pipeline','buyer 360','follow up'],
  'instruction','system','Admin CRM workflow','/admin/leads',false,90
),
(
  'leads.workflow','tutorial','Lead Engine tutorial',
  'Use Lead Acquisition to create a market/product campaign. Discovery produces review candidates only. Enrich or verify candidates, reject manufacturers and irrelevant records, review duplicates, then import only verified buyers to CRM. No candidate is contacted automatically.',
  '{"steps":["Create focused campaign","Run public-source discovery","Review source evidence","Enrich and verify","Reject or mark duplicates","Import verified candidates"],"routes":["/admin/lead-acquisition","/admin/leads"]}',
  array['tutorial','lead engine','lead acquisition','verification','duplicates','import'],
  'instruction','system','Zero-credit Lead Engine','/admin/lead-acquisition',false,94
),
(
  'outreach.workflow','tutorial','Email and WhatsApp outreach tutorial',
  'Prepare personalized drafts from a verified CRM record. Confirm recipient, subject, body, attachments and opt-out state. Owner approval is required before sending. A draft, provider verification or queued item is never described as sent.',
  '{"steps":["Select verified buyer","Generate or edit draft","Check recipient and attachment","Approve exact message","Send through configured provider","Verify provider result and CRM log"],"routes":["/admin/mailing","/admin/whatsapp"]}',
  array['tutorial','email','gmail','whatsapp','outreach','approval'],
  'instruction','system','Approval-based outreach','/admin/mailing',true,95
),
(
  'outreach.positioning','outreach','Standard buyer trust positioning',
  'For first-contact and follow-up messaging, state that Irha Apparels is an experienced manufacturer and the website is newly built. Offer a scheduled live factory video call as a trust option. Use premium, sample-first and private-label language; do not use cheap or lowest-price positioning.',
  '{"avoid":["cheap","lowest price","fake capacity","unverified certification"],"preferred":["premium","sample-first","private label","custom manufacturing"]}',
  array['message','email','dm','follow up','trust','premium'],
  'verified','owner_approved','Owner outreach policy','/admin/mailing',false,97
),
(
  'social.workflow','tutorial','Social content and approval tutorial',
  'The system may create LinkedIn, Instagram, Facebook and TikTok drafts from approved product facts and verified media. Review caption, CTA, platform, media and risk flags. Public posting requires owner approval and a verified platform API result.',
  '{"steps":["Review draft","Confirm product facts","Confirm approved media","Edit caption/CTA","Approve publication","Verify external post URL"],"routes":["/admin/social","/admin/media"]}',
  array['tutorial','social','linkedin','instagram','facebook','tiktok','posting'],
  'instruction','system','Social approval workflow','/admin/social',true,92
),
(
  'seo.workflow','tutorial','SEO and multilingual tutorial',
  'Use Content CMS for blog, FAQ, SEO overrides and internal links. Use Multilingual SEO for localized drafts. Keep drafts noindex until quality review, native-language review where required, admin approval and separate publish action. Search Console is evidence-only and cannot guarantee indexing.',
  '{"steps":["Choose verified base page","Generate localized draft","Run quality review","Complete native review","Approve","Publish","Check sitemap and Search Console evidence"],"routes":["/admin/content-cms","/admin/multilingual-seo","/admin/gsc"]}',
  array['tutorial','seo','multilingual','hreflang','sitemap','search console'],
  'instruction','system','Controlled SEO release','/admin/multilingual-seo',true,90
),
(
  'website.workflow','tutorial','Website and catalogue tutorial',
  'Use Products and Categories for catalogue records, Media Library for approved assets, Catalogue for public structure checks, Website Editor for global/homepage content and Production Health for final readiness. Save drafts and verify public routes before publishing.',
  '{"steps":["Edit product/category","Attach verified media","Review catalogue health","Save CMS draft","Publish approved content","Run Production Health and public smoke checks"],"routes":["/admin/products","/admin/categories","/admin/media","/admin/catalogue","/admin/website","/admin/production-health"]}',
  array['tutorial','website','catalogue','products','media','cms','publish'],
  'instruction','system','Website operating workflow','/admin/website',true,90
),
(
  'production.workflow','tutorial','Production workflow tutorial',
  'Create a production or sample job only after buyer requirements are recorded. Track materials, operations, tasks, sample decisions, QC evidence, defects/rework, shipping readiness, owner approvals, dispatch evidence, delivery acceptance and commercial closeout. Never mark a physical milestone complete without evidence.',
  '{"steps":["Create job","Record specification","Plan materials/operations","Record sample decision","Complete QC evidence","Approve shipping/dispatch","Confirm delivery","Close commercial record"],"routes":["/admin/production-workflow"]}',
  array['tutorial','production','sample','qc','shipping','closeout'],
  'instruction','system','Production evidence workflow','/admin/production-workflow',true,88
),
(
  'operations.daily_sequence','operations','Daily owner operating sequence',
  'Recommended daily order: review operational health; review Buyer Inbox and overdue tasks; review lead candidates; prepare buyer replies/quotes/samples; review outreach and social approvals; review SEO/content evidence; review production exceptions; finish with an owner brief.',
  '{"sequence":["Production Health","Buyer Inbox and Pipeline","Lead Acquisition review","Quotations and Samples","Outreach approvals","Social approvals","SEO and CMS","Production exceptions","Owner brief"]}',
  array['daily','owner brief','operations','priority'],
  'operational','system','Admin operating sequence','/admin/production-health',false,93
),
(
  'safety.truth_policy','safety','AI truth and evidence policy',
  'The admin AI must separate facts into Operational, Needs Owner Approval, Blocked, Unknown or Historical. It must show the evidence timestamp for current situation answers and must not claim that email, WhatsApp, social posting, listing activation, migration, indexing or buyer contact succeeded without a real recorded result.',
  '{"required_labels":["Operational","Needs Owner Approval","Blocked","Unknown","Historical"],"never_invent":["price","MOQ","capacity","delivery date","certification","send result","publish result","indexing result"]}',
  array['truth','evidence','status','blocked','approval','unknown'],
  'verified','system','System truth policy','/admin/ai-assistant',false,100
),
(
  'setup.external_connections','setup','External connection setup',
  'Email delivery, WhatsApp Cloud API, Google Search Console and social publishing require real provider credentials and account authorization. Until verified, the AI must provide setup steps and keep sending/publishing disabled.',
  '{"routes":{"email":"/admin/mailing","whatsapp":"/admin/whatsapp","social":"/admin/social","gsc":"/admin/gsc","system":"/admin/production-health"}}',
  array['setup','connector','email','whatsapp','social','gsc','credentials'],
  'blocked','runtime','Provider credentials required','/admin/ai-assistant',true,98
),
(
  'ai.usage_tutorial','tutorial','How to use Irha Admin AI',
  'Ask in Roman Urdu or English. For current status, ask: “Hamari real current situation batao.” For instructions, name the module. For work, provide market/product/buyer and requested output. The AI may research and draft safely; commercial commitments and external writes remain approval-gated.',
  '{"examples":["Hamari real current situation batao","Aaj ke overdue follow-ups batao","Lead Engine ka tutorial do","Germany Lederhosen buyers ke liye campaign chalao","Selected buyer ke liye email draft banao","Social approvals ka status batao","Website mein kya blocked hai?"]}',
  array['tutorial','ai assistant','commands','roman urdu','help'],
  'instruction','system','AI operating guide','/admin/ai-assistant',false,99
)
on conflict (knowledge_key) do update set
  category = excluded.category,
  title = excluded.title,
  content = excluded.content,
  instructions = excluded.instructions,
  tags = excluded.tags,
  truth_status = excluded.truth_status,
  source_type = excluded.source_type,
  source_reference = excluded.source_reference,
  admin_route = excluded.admin_route,
  owner_approval_required = excluded.owner_approval_required,
  priority = excluded.priority,
  is_active = true,
  valid_until = null,
  updated_at = now();
