insert into public.admin_ai_knowledge
(
  knowledge_key,
  category,
  title,
  content,
  instructions,
  tags,
  truth_status,
  source_type,
  source_reference,
  admin_route,
  owner_approval_required,
  priority
)
values (
  'leads.verification_worker',
  'leads',
  'Scheduled lead verification worker',
  'A service-token protected worker checks up to five pending lead websites per run, reads public contact/about/imprint pages, detects buyer, manufacturer, product, marketplace and duplicate signals, and stores evidence. Recently checked Needs Review records are skipped for seven days. It never imports to CRM and never sends messages.',
  '{"batch_size":5,"retry_gap_days":7,"external_credits":0,"automatic_crm_import":false,"automatic_outreach":false,"schedule":"Daily after lead discovery","manual_command":"Pending leads verify kro"}',
  array[
    'lead verification',
    'scheduled worker',
    'public website',
    'duplicates',
    'needs review',
    'evidence',
    'zero credits'
  ],
  'operational',
  'runtime',
  'scheduled-lead-verification v1',
  '/admin/lead-acquisition',
  false,
  96
)
on conflict (knowledge_key) do update set
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
  updated_at = now();
