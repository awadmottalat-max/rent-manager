-- =====================================================================
-- متابعة الإيجارات وإدارة الأملاك — مخطط Supabase (يُنفَّذ مرة واحدة)
-- المرحلة 1: مستند بيانات مشترك + أدوار + فحص تضارب + سجل نسخ
-- نفّذه من Supabase Dashboard > SQL Editor. آمن لإعادة التنفيذ.
-- =====================================================================

-- ---------- الجداول ----------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','editor','viewer')),
  full_name  text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_docs (
  id         text primary key,
  data       jsonb not null,
  rev        bigint not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_doc_history (
  id         bigint generated always as identity primary key,
  doc_id     text not null references public.app_docs(id) on delete cascade,
  rev        bigint not null,
  data       jsonb not null,
  saved_by   uuid references auth.users(id),
  saved_at   timestamptz not null default now()
);
create index if not exists app_doc_history_doc_idx on public.app_doc_history (doc_id, saved_at desc);
create index if not exists app_docs_updated_by_idx on public.app_docs (updated_by);
create index if not exists app_doc_history_saved_by_idx on public.app_doc_history (saved_by);

-- ---------- الدور الحالي ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where user_id = (select auth.uid())
$$;
revoke all on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;

-- ---------- الأمان (RLS) ----------
alter table public.profiles        enable row level security;
alter table public.app_docs        enable row level security;
alter table public.app_doc_history enable row level security;

drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists app_docs_read        on public.app_docs;
drop policy if exists history_admin_read   on public.app_doc_history;

create policy profiles_self_read on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.my_role()) = 'admin');
-- القراءة لكل مستخدم مسجَّل له دور. لا توجد سياسات كتابة: الكتابة عبر save_doc فقط.
create policy app_docs_read on public.app_docs for select to authenticated
  using ((select public.my_role()) is not null);
create policy history_admin_read on public.app_doc_history for select to authenticated
  using ((select public.my_role()) = 'admin');

-- الصلاحيات: القراءة فقط للمسجَّلين (RLS تحدد الصفوف). الكتابة عبر الدوال فقط، ولا شيء لـ anon.
-- (مشاريع Supabase الجديدة لا تمنح SELECT تلقائيًا، فبدون السطر التالي يرجع الخطأ 403)
revoke all on public.profiles, public.app_docs, public.app_doc_history from anon, authenticated;
grant select on public.profiles, public.app_docs, public.app_doc_history to authenticated;
-- دالة manage-users تعمل بدور service_role وتحتاج هذه الصلاحيات على profiles (لا تُمنح تلقائيًا في المشاريع الجديدة)
revoke all on public.profiles from service_role;
grant select, insert, update, delete on public.profiles to service_role;

-- ---------- الحفظ مع فحص التضارب ----------
-- يرجع الرقم الجديد، أو يرفع الخطأ 'REV_CONFLICT' إن تغيّر المستند بعد آخر قراءة لك.
create or replace function public.save_doc(p_id text, p_base_rev bigint, p_data jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_role text := public.my_role();
  v_uid  uuid := (select auth.uid());
  v_cur  bigint;
  v_new  bigint;
begin
  if v_role is null or v_role = 'viewer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or not (p_data ? 'projects') then
    raise exception 'BAD_DATA' using errcode = '22023';
  end if;

  select rev into v_cur from public.app_docs where id = p_id for update;
  if not found then
    if p_base_rev <> 0 then raise exception 'REV_CONFLICT' using errcode = 'P0001'; end if;
    insert into public.app_docs(id, data, rev, updated_by) values (p_id, p_data, 1, v_uid);
    v_new := 1;
  else
    if v_cur <> p_base_rev then raise exception 'REV_CONFLICT' using errcode = 'P0001'; end if;
    v_new := v_cur + 1;
    update public.app_docs set data = p_data, rev = v_new, updated_by = v_uid, updated_at = now() where id = p_id;
  end if;

  perform public.rebuild_relational(p_data); -- مرآة علائقية للقراءة فقط

  -- لقطة تاريخية كل 30 دقيقة على الأكثر، ونحتفظ بآخر 300
  if not exists (select 1 from public.app_doc_history where doc_id = p_id and saved_at > now() - interval '30 minutes') then
    insert into public.app_doc_history(doc_id, rev, data, saved_by) values (p_id, v_new, p_data, v_uid);
    delete from public.app_doc_history where doc_id = p_id and id not in
      (select id from public.app_doc_history where doc_id = p_id order by saved_at desc limit 300);
  end if;
  return v_new;
end $$;
revoke all on function public.save_doc(text, bigint, jsonb) from public, anon;
grant execute on function public.save_doc(text, bigint, jsonb) to authenticated;

-- ---------- استعادة نسخة تاريخية (للمدير فقط) ----------
create or replace function public.restore_history(p_history_id bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare h public.app_doc_history; v_new bigint;
begin
  if public.my_role() <> 'admin' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into h from public.app_doc_history where id = p_history_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  update public.app_docs set data = h.data, rev = rev + 1, updated_by = (select auth.uid()), updated_at = now()
    where id = h.doc_id returning rev into v_new;
  perform public.rebuild_relational(h.data);
  return v_new;
end $$;
revoke all on function public.restore_history(bigint) from public, anon;
grant execute on function public.restore_history(bigint) to authenticated;

-- =====================================================================
-- جداول علائقية للقراءة فقط (للتقارير بـ SQL): تُبنى من المستند عند كل حفظ.
-- المصدر الوحيد للحقيقة هو المستند app_docs؛ هذه الجداول مرآة تُعاد كتابتها كاملة.
-- =====================================================================
create or replace function public.rel_num(v jsonb) returns numeric language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(v) = 'number' then (v #>> '{}')::numeric
              when jsonb_typeof(v) = 'string' and (v #>> '{}') ~ '^\s*-?\d+(\.\d+)?\s*$' then trim(v #>> '{}')::numeric end
$$;
create or replace function public.rel_date(v jsonb) returns date language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(v) = 'string' and (v #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$' then return (v #>> '{}')::date; end if;
  return null;
exception when others then return null;
end $$;

create table if not exists public.rel_projects (pid text primary key, name text, no text);
create table if not exists public.rel_units (
  pid text not null, unit_id text not null, no text, owner text, type text, area text, rooms text,
  ask_rent numeric, available boolean, notes text, primary key (pid, unit_id));
create table if not exists public.rel_contracts (
  pid text not null, cid text not null, kind text, unit text, owner text, tenant text,
  rent numeric, fee numeric, fee_type text, fee_pct numeric, start_date date, end_date date,
  period text, inst_count int, sign_date date, ejar text, sap text, notes text, details jsonb,
  primary key (pid, cid));
create table if not exists public.rel_payments (
  pid text not null, cid text not null, pay_id text not null, pay_date date, amount numeric, note text,
  primary key (pid, cid, pay_id));
create table if not exists public.rel_fee_units (fee_id text primary key, pid text, no text, owner text, phone text, area text, amt numeric);
create table if not exists public.rel_owners  (id text primary key, name text, phone text, email text, idno text, addr text, notes text);
create table if not exists public.rel_tenants (id text primary key, name text, phone text, email text, idno text, addr text, notes text);
create index if not exists rel_contracts_unit_idx on public.rel_contracts (pid, unit);
create index if not exists rel_payments_contract_idx on public.rel_payments (pid, cid);
create index if not exists rel_fee_units_pid_idx on public.rel_fee_units (pid);

create or replace function public.rebuild_relational(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Supabase (pg-safeupdate) يرفض DELETE بلا WHERE عبر الواجهة، لذلك where true صريحة
  delete from public.rel_payments where true;  delete from public.rel_contracts where true; delete from public.rel_units where true;
  delete from public.rel_projects where true;  delete from public.rel_fee_units where true; delete from public.rel_owners where true; delete from public.rel_tenants where true;

  insert into public.rel_projects select pr.key, pr.value->>'name', pr.value->>'no' from jsonb_each(p->'projects') pr;

  insert into public.rel_units
  select pr.key, u->>'id', u->>'no', u->>'owner', u->>'type', u->>'area', u->>'rooms', public.rel_num(u->'askRent'),
         case when u ? 'avail' then (u->>'avail') not in ('false','0') end, u->>'notes'
  from jsonb_each(p->'projects') pr, jsonb_array_elements(coalesce(pr.value->'units', '[]'::jsonb)) u
  where u->>'id' is not null
  on conflict do nothing;

  insert into public.rel_contracts
  select pr.key, c->>'id', c->>'kind', c->>'unit', c->>'owner', c->>'tenant', public.rel_num(c->'rent'), public.rel_num(c->'fee'),
         c->>'feeType', public.rel_num(c->'feePct'), public.rel_date(c->'start'), public.rel_date(c->'end'),
         c->>'period', public.rel_num(c->'count')::int, public.rel_date(c->'signDate'), c->>'ejar', c->>'sap', c->>'notes',
         c - 'payments' - 'files' - 'notes'
  from jsonb_each(p->'projects') pr, jsonb_array_elements(coalesce(pr.value->'contracts', '[]'::jsonb)) c
  where c->>'id' is not null
  on conflict do nothing;

  insert into public.rel_payments
  select pr.key, c->>'id', py->>'id', public.rel_date(py->'date'), public.rel_num(py->'amount'), py->>'note'
  from jsonb_each(p->'projects') pr, jsonb_array_elements(coalesce(pr.value->'contracts', '[]'::jsonb)) c,
       jsonb_array_elements(coalesce(c->'payments', '[]'::jsonb)) py
  where c->>'id' is not null and py->>'id' is not null
  on conflict do nothing;

  insert into public.rel_fee_units
  select f->>'id', f->>'pid', f->>'no', f->>'owner', f->>'phone', f->>'area', public.rel_num(f->'amt')
  from jsonb_array_elements(coalesce(p->'feeUnits', '[]'::jsonb)) f where f->>'id' is not null on conflict do nothing;

  insert into public.rel_owners
  select o->>'id', o->>'name', o->>'phone', o->>'email', o->>'idno', o->>'addr', o->>'notes'
  from jsonb_array_elements(coalesce(p->'parties'->'owners', '[]'::jsonb)) o where o->>'id' is not null on conflict do nothing;
  insert into public.rel_tenants
  select o->>'id', o->>'name', o->>'phone', o->>'email', o->>'idno', o->>'addr', o->>'notes'
  from jsonb_array_elements(coalesce(p->'parties'->'tenants', '[]'::jsonb)) o where o->>'id' is not null on conflict do nothing;
end $$;
revoke all on function public.rebuild_relational(jsonb) from public, anon, authenticated;

-- صلاحيات وحماية الجداول العلائقية: قراءة فقط لكل من له دور
do $$ declare t text; begin
  foreach t in array array['rel_projects','rel_units','rel_contracts','rel_payments','rel_fee_units','rel_owners','rel_tenants'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.my_role()) is not null)', t||'_read', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop; end $$;

-- عرض جاهز: إجمالي المدفوع لكل عقد
create or replace view public.v_contract_paid with (security_invoker = true) as
select c.pid, p.name as project, c.cid, c.unit, c.owner, c.tenant, c.rent, c.start_date, c.end_date,
       coalesce(sum(y.amount), 0) as paid, count(y.pay_id) as pay_count
from public.rel_contracts c
left join public.rel_projects p on p.pid = c.pid
left join public.rel_payments y on y.pid = c.pid and y.cid = c.cid
group by c.pid, p.name, c.cid, c.unit, c.owner, c.tenant, c.rent, c.start_date, c.end_date;
revoke all on public.v_contract_paid from anon, authenticated;
grant select on public.v_contract_paid to authenticated;

-- =====================================================================
-- إضافة المستخدمين:
-- 1) Authentication > Users > Add user (بريد وكلمة مرور، وفعّل Auto Confirm).
-- 2) ثم امنحه دورًا بتنفيذ الاستعلام التالي بعد تعديل البريد والدور:
--    admin = كل شيء + إدارة | editor = تعديل | viewer = اطلاع فقط
--
-- insert into public.profiles(user_id, role, full_name)
-- select id, 'admin', 'اسم المدير' from auth.users where email = 'you@example.com'
-- on conflict (user_id) do update set role = excluded.role;
--
-- مهم: عطّل Authentication > Providers > Email > "Allow new users to sign up"
-- حتى لا يسجّل غرباء حسابات (لن يروا شيئًا بلا دور، لكن الأفضل إغلاقه).
-- =====================================================================
