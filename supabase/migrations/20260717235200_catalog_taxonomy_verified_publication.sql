begin;

-- Complete the owner's current instruction after the repository-controlled
-- review approval migration has verified the exact 69-node / 86-product snapshot.
-- This publication uses the existing audited release RPC, preserves individual
-- approvals and does not apply database-managed legacy redirects.

do $$
declare
  owner_id uuid;
  summary jsonb;
  published_summary jsonb;
  public_release jsonb;
  assignment_count integer;
  confirmation_phrase text;
  snapshot_hash text;
begin
  select u.id into owner_id
  from auth.users u
  join public.user_roles r on r.user_id = u.id and r.role = 'admin'
  where lower(u.email) = 'irhaapparelsofficial@gmail.com'
  order by u.created_at asc
  limit 1;

  if owner_id is null then
    raise exception 'owner admin identity is required for taxonomy publication';
  end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );

  summary := public.catalog_taxonomy_review_summary();

  if coalesce((summary->>'is_published')::boolean, false) then
    if (summary->>'published_node_count')::integer <> 69
       or (summary->>'approved_count')::integer <> 86 then
      raise exception 'existing taxonomy publication does not match the verified snapshot: %', summary;
    end if;
    return;
  end if;

  if not coalesce((summary->>'can_publish')::boolean, false)
     or (summary->>'node_count')::integer <> 69
     or (summary->>'root_count')::integer <> 5
     or (summary->>'audience_count')::integer <> 13
     or (summary->>'leaf_count')::integer <> 51
     or (summary->>'assignment_count')::integer <> 86
     or (summary->>'approved_count')::integer <> 86
     or (summary->>'proposed_count')::integer <> 0
     or (summary->>'rejected_count')::integer <> 0
     or (summary->>'unassigned_product_count')::integer <> 0
     or (summary->>'empty_leaf_count')::integer <> 0
     or (summary->>'invalid_assignment_count')::integer <> 0 then
    raise exception 'verified taxonomy is not ready for publication: %', summary;
  end if;

  assignment_count := (summary->>'assignment_count')::integer;
  confirmation_phrase := summary->>'confirmation_phrase';
  snapshot_hash := summary->>'snapshot_hash';

  published_summary := public.catalog_publish_reviewed_taxonomy(
    confirmation_phrase,
    assignment_count,
    snapshot_hash
  );

  if not coalesce((published_summary->>'is_published')::boolean, false)
     or (published_summary->>'published_node_count')::integer <> 69
     or (published_summary->>'approved_count')::integer <> 86
     or (published_summary->>'assignment_count')::integer <> 86 then
    raise exception 'taxonomy publication verification failed: %', published_summary;
  end if;

  public_release := public.catalog_get_public_taxonomy();
  if jsonb_array_length(coalesce(public_release->'nodes', '[]'::jsonb)) <> 69
     or jsonb_array_length(coalesce(public_release->'assignments', '[]'::jsonb)) <> 86 then
    raise exception 'public taxonomy projection verification failed: %', public_release;
  end if;

  if not exists (
    select 1
    from public.catalog_taxonomy_review_events e
    where e.action = 'publish'
      and e.actor_id = owner_id
      and e.assignment_count = 86
      and e.node_count = 69
      and e.snapshot_hash = published_summary->>'snapshot_hash'
  ) then
    raise exception 'taxonomy publication audit event was not recorded';
  end if;
end
$$;

commit;
