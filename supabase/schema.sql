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

revoke insert, update, delete on public.app_docs, public.app_doc_history, public.profiles from anon, authenticated;

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
  return v_new;
end $$;
revoke all on function public.restore_history(bigint) from public, anon;
grant execute on function public.restore_history(bigint) to authenticated;

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
