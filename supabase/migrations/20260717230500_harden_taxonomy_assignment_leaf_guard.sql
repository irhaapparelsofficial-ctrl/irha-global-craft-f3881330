-- Harden the explicit taxonomy leaf guard before any taxonomy node or assignment can be published.

begin;

create or replace function public.catalog_taxonomy_prevent_empty_published_leaf()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  old_node public.catalog_taxonomy_nodes%rowtype;
  removes_old_approval boolean;
begin
  if old.review_state <> 'approved' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  removes_old_approval := tg_op = 'DELETE'
    or new.taxonomy_node_id is distinct from old.taxonomy_node_id
    or new.review_state is distinct from 'approved';

  if not removes_old_approval then
    return new;
  end if;

  select * into old_node
  from public.catalog_taxonomy_nodes
  where id = old.taxonomy_node_id;

  if found
     and old_node.publish_state = 'published'
     and old_node.node_type = 'product_type'
     and nullif(btrim(coalesce(old_node.seo_empty_state_reason, '')), '') is null
     and not exists (
       select 1
       from public.product_taxonomy_assignments a
       where a.taxonomy_node_id = old.taxonomy_node_id
         and a.product_id <> old.product_id
         and a.review_state = 'approved'
     ) then
    raise exception 'cannot empty a published product-type node without an intentional SEO decision';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

commit;
