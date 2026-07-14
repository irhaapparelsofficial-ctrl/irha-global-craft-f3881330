drop policy if exists "Admin users can manage AI knowledge"
  on public.admin_ai_knowledge;

drop policy if exists "Admin users can insert AI knowledge"
  on public.admin_ai_knowledge;
create policy "Admin users can insert AI knowledge"
  on public.admin_ai_knowledge
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

drop policy if exists "Admin users can update AI knowledge"
  on public.admin_ai_knowledge;
create policy "Admin users can update AI knowledge"
  on public.admin_ai_knowledge
  for update to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

drop policy if exists "Admin users can delete AI knowledge"
  on public.admin_ai_knowledge;
create policy "Admin users can delete AI knowledge"
  on public.admin_ai_knowledge
  for delete to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );
