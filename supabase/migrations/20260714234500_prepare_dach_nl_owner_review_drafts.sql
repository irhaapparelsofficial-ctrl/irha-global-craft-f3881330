-- Large Batch 4: prepare the current DACH/NL business-domain drafts for
-- one-by-one owner review. This migration does not approve or send anything.

begin;

with prepared as (
  update public.outreach_messages m
  set body_text = case lower(m.recipient_email)
    when 'info@schaber.com' then $schaber$
Guten Tag,

wir melden uns im Namen von Irha Apparels, einem erfahrenen B2B-Bekleidungshersteller in Sialkot, Pakistan. Unsere Website wurde neu aufgebaut; unsere Fertigungserfahrung besteht bereits seit Jahren.

Ihr Sortiment an Dirndln, Lederhosen, Trachtenhemden, Westen und Jankern könnte zu unserer kundenspezifischen Fertigung passen. Wir unterstützen Private-Label-Projekte mit produktspezifischer Entwicklung sowie Branding-Optionen wie Stickerei, Web- und Pflegeetiketten und Hangtags. Mengen, Materialien, Muster, Termine und Versand werden erst nach Prüfung Ihrer Anforderungen bestätigt.

Gern senden wir Ihnen unseren Trachtenkatalog. Eine geplante Live-Videoführung durch die Produktion ist ebenfalls möglich.

Mit freundlichen Grüßen
Irha Apparels
$schaber$
    when 'info@trachtenkaiser.at' then $kaiser$
Guten Tag,

wir melden uns im Namen von Irha Apparels, einem erfahrenen B2B-Bekleidungshersteller in Sialkot, Pakistan. Unsere Website wurde neu aufgebaut; unsere Fertigungserfahrung besteht bereits seit Jahren.

Ihr Sortiment an Dirndln, Lederhosen, Trachtenhemden, Westen und Jankern könnte zu unserer kundenspezifischen Fertigung passen. Wir unterstützen Private-Label-Projekte mit produktspezifischer Entwicklung sowie Branding-Optionen wie Stickerei, Web- und Pflegeetiketten und Hangtags. Mengen, Materialien, Muster, Termine und Versand werden erst nach Prüfung Ihrer Anforderungen bestätigt.

Gern senden wir Ihnen unseren Trachtenkatalog. Eine geplante Live-Videoführung durch die Produktion ist ebenfalls möglich.

Mit freundlichen Grüßen
Irha Apparels
$kaiser$
    when 'onlineshop@trachtenhof.de' then $trachtenhof$
Guten Tag,

wir melden uns im Namen von Irha Apparels, einem erfahrenen B2B-Bekleidungshersteller in Sialkot, Pakistan. Unsere Website wurde neu aufgebaut; unsere Fertigungserfahrung besteht bereits seit Jahren.

Ihr Sortiment an Dirndln, Lederhosen, Dirndlblusen, Trachtenhemden, Westen und Jankern könnte zu unserer kundenspezifischen Fertigung passen. Wir unterstützen Private-Label-Projekte mit produktspezifischer Entwicklung sowie Branding-Optionen wie Stickerei, Web- und Pflegeetiketten und Hangtags. Mengen, Materialien, Muster, Termine und Versand werden erst nach Prüfung Ihrer Anforderungen bestätigt.

Gern senden wir Ihnen unseren Trachtenkatalog. Eine geplante Live-Videoführung durch die Produktion ist ebenfalls möglich.

Mit freundlichen Grüßen
Irha Apparels
$trachtenhof$
    when 'info@lechtaler.de' then $lechtaler$
Guten Tag,

wir melden uns im Namen von Irha Apparels, einem erfahrenen B2B-Bekleidungshersteller in Sialkot, Pakistan. Unsere Website wurde neu aufgebaut; unsere Fertigungserfahrung besteht bereits seit Jahren.

Ihr Sortiment an Dirndln, Lederhosen, Trachtenwesten, Jankern und passenden Accessoires könnte zu unserer kundenspezifischen Fertigung passen. Wir unterstützen Private-Label-Projekte mit produktspezifischer Entwicklung sowie Branding-Optionen wie Stickerei, Web- und Pflegeetiketten und Hangtags. Mengen, Materialien, Muster, Termine und Versand werden erst nach Prüfung Ihrer Anforderungen bestätigt.

Gern senden wir Ihnen unseren Trachtenkatalog. Eine geplante Live-Videoführung durch die Produktion ist ebenfalls möglich.

Mit freundlichen Grüßen
Irha Apparels
$lechtaler$
    when 'info@carnavalsland.nl' then $carnavalsland$
Goedendag,

wij nemen contact op namens Irha Apparels, een ervaren B2B-kledingfabrikant in Sialkot, Pakistan. Onze website is nieuw opgebouwd; onze productie-ervaring bestaat al jaren.

Uw assortiment in lederhosen, dirndls, Trachten-overhemden en Beierse accessoires kan aansluiten op onze productie op maat. Wij ondersteunen private-labelprojecten met productspecifieke ontwikkeling en brandingopties zoals borduurwerk, geweven labels, waslabels en hangtags. Aantallen, materialen, monsters, planning en verzending worden pas bevestigd nadat wij uw vereisten hebben beoordeeld.

Wij sturen u graag onze Trachten-catalogus. Een geplande live-videorondleiding door de productie is ook mogelijk.

Met vriendelijke groet
Irha Apparels
$carnavalsland$
    when 'info@feestkledingbreda.nl' then $breda$
Goedendag,

wij nemen contact op namens Irha Apparels, een ervaren B2B-kledingfabrikant in Sialkot, Pakistan. Onze website is nieuw opgebouwd; onze productie-ervaring bestaat al jaren.

Uw assortiment in dirndls, lederhosen, dirndlblouses, Trachten-overhemden en Beierse accessoires kan aansluiten op onze productie op maat. Wij ondersteunen private-labelprojecten met productspecifieke ontwikkeling en brandingopties zoals borduurwerk, geweven labels, waslabels en hangtags. Aantallen, materialen, monsters, planning en verzending worden pas bevestigd nadat wij uw vereisten hebben beoordeeld.

Wij sturen u graag onze Trachten-catalogus. Een geplande live-videorondleiding door de productie is ook mogelijk.

Met vriendelijke groet
Irha Apparels
$breda$
    else m.body_text
  end,
  personalization_evidence = coalesce(m.personalization_evidence, '{}'::jsonb) || jsonb_build_object(
    'owner_review', jsonb_build_object(
      'batch', 'large_batch_4',
      'business_email_verified', true,
      'claims_reviewed', true,
      'unsupported_assortment_removed', true,
      'attachment_policy', 'buyer_private_copy_only',
      'attachment_state', 'awaiting_real_file_upload',
      'owner_approval_required', true,
      'external_message_sent', false,
      'prepared_at', now()
    ),
    'reviewed_product_focus', case lower(m.recipient_email)
      when 'info@schaber.com' then to_jsonb(array['Dirndl','Lederhosen','Trachten shirts','Trachten vests','Janker']::text[])
      when 'info@trachtenkaiser.at' then to_jsonb(array['Dirndl','Lederhosen','Trachten shirts','Trachten vests','Janker']::text[])
      when 'onlineshop@trachtenhof.de' then to_jsonb(array['Dirndl','Lederhosen','Dirndl blouses','Trachten shirts','Trachten vests','Janker']::text[])
      when 'info@lechtaler.de' then to_jsonb(array['Dirndl','Lederhosen','Trachten vests','Janker','Bavarian accessories']::text[])
      when 'info@carnavalsland.nl' then to_jsonb(array['Lederhosen','Dirndl','Trachten shirts','Bavarian accessories']::text[])
      when 'info@feestkledingbreda.nl' then to_jsonb(array['Dirndl','Lederhosen','Dirndl blouses','Trachten shirts','Bavarian accessories']::text[])
      else '[]'::jsonb
    end
  ),
  manual_reason = null,
  error = null,
  updated_at = now()
  from public.outreach_campaigns c
  where c.id = m.campaign_id
    and c.name = 'DACH-NL Bavarian Buyers — Owner Review 2026-07-14'
    and m.status = 'draft'
    and public.is_irha_business_email(m.recipient_email)
    and lower(m.recipient_email) in (
      'info@schaber.com',
      'info@trachtenkaiser.at',
      'onlineshop@trachtenhof.de',
      'info@lechtaler.de',
      'info@carnavalsland.nl',
      'info@feestkledingbreda.nl'
    )
  returning m.id, m.campaign_id, m.lead_id, m.recipient_email
)
insert into public.outreach_events (campaign_id, message_id, lead_id, event_type, detail, actor)
select campaign_id,
       id,
       lead_id,
       'status_sync',
       jsonb_build_object(
         'reason', 'owner_review_copy_prepared',
         'batch', 'large_batch_4',
         'recipient_email', recipient_email,
         'status_preserved', 'draft',
         'attachment_state', 'awaiting_real_file_upload',
         'external_message_sent', false
       ),
       null
from prepared;

commit;
