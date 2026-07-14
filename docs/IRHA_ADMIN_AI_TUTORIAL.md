# Irha Admin AI — Complete Roman Urdu Tutorial

_Last updated: 14 July 2026_

## 1. Admin AI kya hai?

Irha Admin AI ab generic chatbot nahi hai. Ye private **Live Business Brain** hai jo:

- live database ka PII-free operational snapshot read karta hai;
- approved Irha Business Rules read karta hai;
- versioned tutorials aur instructions read karta hai;
- CRM, Lead Engine, outreach, social, SEO, website, media, production aur operations ka real aggregate status batata hai;
- har response ko `ai_runs` audit history mein evidence snapshot aur checked timestamp ke saath save karta hai;
- draft, queued, verified aur completed states ko alag rakhta hai;
- owner approval ke baghair price, terms, buyer contact ya public publishing commit nahi karta.

Admin route:

```text
/admin/ai-assistant
```

## 2. Sab se pehla command

Admin AI khol kar ye likhein:

```text
Hamari real current situation batao.
```

AI ko jawab mein ye sections dene chahiye:

1. **Operational** — jis ka real backend/run/provider evidence mojood hai.
2. **Needs Owner Approval** — tayar kaam jo owner approval ke baghair execute nahi ho sakta.
3. **Blocked / Setup Required** — missing credential, connection, authorization ya evidence.
4. **Unknown** — jis ke liye system mein reliable evidence nahi.
5. **Checked** — live snapshot ka exact timestamp.

## 3. Current situation ko kaise samjhein

### Operational

Is label ka matlab sirf ye hai ke database record, completed worker run, public smoke check ya verified provider result mojood hai.

### Needs Owner Approval

Is mein normally ye cheezen aati hain:

- final price;
- discount;
- payment terms;
- production ya delivery commitment;
- email/WhatsApp send;
- social publish;
- external listing update;
- complaint settlement.

### Blocked

Is ka matlab code hona kaafi nahi. Required provider account, credential, API authorization ya verified evidence missing hai.

### Unknown

AI guess nahi karega. Jahan reliable data nahi hoga wahan `Unknown` likhega.

## 4. Daily owner workflow

Roz ka recommended sequence:

1. `/admin/production-health` par latest heartbeat aur public website checks dekhein.
2. `/admin/leads` par new/high-priority buyers dekhein.
3. `/admin/pipeline` par open aur overdue tasks/follow-ups dekhein.
4. `/admin/lead-acquisition` par pending candidates verify/reject karein.
5. `/admin/buyer360` par selected buyer ki contacts, notes, files aur history dekhein.
6. `/admin/pi-generator` par quotation brief ya owner-reviewable quotation prepare karein.
7. `/admin/mailing` aur `/admin/whatsapp` par exact recipient/message review karein.
8. `/admin/social` par drafts, media aur approval state review karein.
9. `/admin/content-cms`, `/admin/multilingual-seo` aur `/admin/gsc` par content/indexing evidence dekhein.
10. `/admin/production-workflow` par sample, QC, shipping aur closeout exceptions dekhein.
11. Din ke end par Admin AI se poochein:

```text
Aaj ka Irha Apparels owner brief banao. Top 5 next actions do.
```

## 5. CRM tutorial

Command:

```text
Buyer CRM ka complete step-by-step tutorial do.
```

Practical workflow:

1. Buyer Inbox open karein: `/admin/leads`.
2. Company name, country, website/source aur contact evidence review karein.
3. Duplicate risk check karein.
4. Product fit aur likely buyer type confirm karein.
5. CRM stage aur priority set karein.
6. Follow-up date zaroor set karein.
7. Important notes aur missing information record karein.
8. Task banayein: `/admin/pipeline`.
9. Contacts/files/history ke liye Buyer 360 open karein: `/admin/buyer360`.
10. Commercial requirement complete ho to quotation handoff karein.

AI command examples:

```text
Aaj ke overdue CRM tasks aur follow-ups batao.
```

```text
Selected buyer ko evidence ke sath qualify kro. Price ya MOQ invent mat kro.
```

## 6. Lead Engine tutorial

Admin route:

```text
/admin/lead-acquisition
```

Command example:

```text
Germany, Austria aur Switzerland se 50 Lederhosen, Dirndl aur Trachten wholesalers, importers, distributors aur specialist retailers find kro. Koi outreach automatically mat kro.
```

Workflow:

1. Market, product aur buyer type focused rakhein.
2. Discovery run public sources scan karega.
3. Result pehle `Needs Review` queue mein aayega.
4. Source URL aur evidence dekhein.
5. Manufacturer/exporter ko buyer samajh kar import na karein.
6. Duplicate domain/email check karein.
7. `verify leads` command chala sakte hain.
8. Sirf verified buyer ko CRM import karein.
9. CRM import ke baad bhi message automatically send nahi hota.

Useful commands:

```text
Lead Engine ka real status batao.
```

```text
Pending leads verify kro.
```

```text
Import verified leads to CRM.
```

## 7. Outreach tutorial

Routes:

```text
/admin/mailing
/admin/whatsapp
```

Workflow:

1. Sirf verified CRM buyer select karein.
2. Recipient email/WhatsApp number dobara check karein.
3. Buyer requirement aur previous conversation use karein.
4. Message mein Irha positioning use karein:
   - experienced manufacturer;
   - website newly built;
   - scheduled live factory video call available.
5. Cheap/lowest-price positioning avoid karein.
6. Attachment ka correct buyer aur correct version verify karein.
7. Opt-out/suppression state check karein.
8. Exact subject/body/recipient approve karein.
9. Provider result ke baad hi `sent` manain.
10. Result CRM history mein log hona chahiye.

Command:

```text
Selected buyer ke liye professional follow-up draft banao. Experienced manufacturer/new website aur live factory video call mention kro.
```

## 8. Social tutorial

Route:

```text
/admin/social
```

System kya kar sakta hai:

- approved product facts se drafts;
- LinkedIn, Instagram, Facebook aur TikTok variants;
- captions, CTA, hashtags aur creative briefs;
- verified/social-approved media selection;
- daily scheduled draft generation.

System kya approval ke baghair nahi karega:

- public post;
- unverified account ko connected mark;
- renderer output ko verified media mark;
- queued item ko published claim.

Commands:

```text
Social system ki real current situation batao.
```

```text
Agly 7 din ka B2B social content plan banao. Approved media use kro aur publishing owner approval par rakho.
```

## 9. Website aur catalogue tutorial

Routes:

```text
/admin/products
/admin/categories
/admin/media
/admin/catalogue
/admin/website
/admin/content-cms
/admin/production-health
```

Workflow:

1. Product/category record edit karein.
2. Correct verified media attach karein.
3. SEO title/description aur product facts review karein.
4. Draft save karein.
5. Catalogue structure aur orphan/broken records check karein.
6. Website Editor/CMS se approved content publish karein.
7. Public homepage, products aur sitemap smoke checks run karein.
8. Error ho to previous revision/backup se rollback karein.

Command:

```text
Website aur catalogue ka complete tutorial do aur current blockers batao.
```

## 10. SEO tutorial

Routes:

```text
/admin/content-cms
/admin/multilingual-seo
/admin/gsc
```

Workflow:

1. Verified English/base page choose karein.
2. Buyer intent aur market define karein.
3. Localized draft create karein.
4. Draft `noindex` rahe.
5. AI quality review run karein.
6. Native-language review required ho to complete karein.
7. Canonical, hreflang, schema aur internal links review karein.
8. Owner/admin approval karein.
9. Separate publish action karein.
10. Sitemap aur Search Console evidence check karein.

Important:

- Search Console indexing guarantee nahi deta.
- Thin machine translation publish na karein.
- Fake search volume/CPC numbers accept na karein.

## 11. Production tutorial

Route:

```text
/admin/production-workflow
```

Workflow:

1. Buyer requirement aur source record confirm karein.
2. Sample/order job create karein.
3. Specification reference save karein.
4. Materials aur operations plan karein.
5. Sample decision/evidence record karein.
6. QC inspection aur defects/rework record karein.
7. Quality release ke baghair shipping ready na karein.
8. Shipping documents, package, tracking aur dispatch approval record karein.
9. Delivery evidence confirm karein.
10. Cost, issues, payment aur lessons learned ke sath closeout karein.

AI kisi physical milestone ko evidence ke baghair complete nahi batayega.

## 12. Setup aur blockers

Useful command:

```text
System mein kya blocked ya missing hai? Exact setup routes do.
```

Common external blockers:

- email provider end-to-end credential/readiness;
- WhatsApp Cloud API token and phone-number authorization;
- Facebook/Instagram/LinkedIn/TikTok account authorization;
- Google Search Console property credential;
- reel/carousel renderer provider.

Code deployed hona aur provider operational hona alag cheezen hain.

## 13. Best command format

Achha command mein ye cheezen dein:

```text
Goal + market/buyer + product + required output + restrictions
```

Example:

```text
Germany ke specialist Trachten retailers ke liye 25 buyer candidates find kro. Lederhosen aur Dirndl fit check kro, manufacturers reject kro, source evidence save kro, koi CRM import ya outreach automatically mat kro.
```

## 14. Admin AI ko kya nahi kehna chahiye

AI ko kabhi ye claims nahi karne chahiye jab evidence na ho:

- email sent;
- WhatsApp delivered;
- social post published;
- listing active/verified;
- page indexed;
- migration complete;
- buyer verified;
- final price/discount approved;
- production/delivery date committed;
- certification available.

## 15. Emergency check

Kisi bhi confusion mein ye teen commands use karein:

```text
Hamari real current situation batao.
```

```text
System mein kya blocked hai?
```

```text
Aaj ke top 5 owner actions batao.
```
