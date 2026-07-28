begin;

create policy "Admins read B2B tech packs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'tech_packs'
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
);

commit;
