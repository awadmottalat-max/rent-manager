import { createClient } from 'npm:@supabase/supabase-js@2';

// إدارة المستخدمين: للمدير (admin) فقط. نتحقق من الهوية والدور داخل الدالة نفسها.
// النشر: verify_jwt=false لأن التحقق يتم هنا (التوكنات غير المتماثلة).
const ROLES = ['admin', 'editor', 'viewer'];
const url = Deno.env.get('SUPABASE_URL')!;
const sk = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(url, sk, { auth: { persistSession: false, autoRefreshToken: false } });

const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
const bad = (m: string, s = 400) => json({ error: m }, s);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function adminCount(exceptId?: string) {
  const { data } = await db.from('profiles').select('user_id').eq('role', 'admin');
  return (data ?? []).filter((r) => r.user_id !== exceptId).length;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return bad('METHOD', 405);
  const tok = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tok) return bad('AUTH', 401);
  const { data: u, error: ue } = await db.auth.getUser(tok);
  if (ue || !u?.user) return bad('AUTH', 401);
  const me = u.user.id;
  const { data: prof } = await db.from('profiles').select('role').eq('user_id', me).maybeSingle();
  if (prof?.role !== 'admin') return bad('FORBIDDEN', 403);

  let b: any;
  try { b = await req.json(); } catch { return bad('BAD_JSON'); }
  const act = String(b.action || '');

  if (act === 'list') {
    const { data: lu, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return bad(error.message, 500);
    const { data: ps } = await db.from('profiles').select('user_id, role, full_name');
    const pm = new Map((ps ?? []).map((p) => [p.user_id, p]));
    const users = lu.users.map((x) => ({
      id: x.id, email: x.email, role: pm.get(x.id)?.role ?? null, full_name: pm.get(x.id)?.full_name ?? '',
      created_at: x.created_at, last_sign_in_at: x.last_sign_in_at, me: x.id === me,
    })).sort((a, c) => String(a.email).localeCompare(String(c.email)));
    return json({ users });
  }

  if (act === 'create') {
    const email = String(b.email || '').trim().toLowerCase();
    const pw = String(b.password || '');
    const role = String(b.role || '');
    const name = String(b.full_name || '').trim().slice(0, 120);
    if (!EMAIL.test(email)) return bad('البريد الإلكتروني غير صحيح');
    if (pw.length < 10) return bad('كلمة المرور يجب ألا تقل عن 10 أحرف');
    if (!ROLES.includes(role)) return bad('الدور غير صحيح');
    const { data: cu, error } = await db.auth.admin.createUser({ email, password: pw, email_confirm: true });
    if (error || !cu?.user) return bad(/already|registered|exists/i.test(error?.message || '') ? 'هذا البريد مسجَّل مسبقًا' : (error?.message || 'تعذّر إنشاء الحساب'), 400);
    const { error: pe } = await db.from('profiles').upsert({ user_id: cu.user.id, role, full_name: name || null });
    if (pe) { await db.auth.admin.deleteUser(cu.user.id); return bad('تعذّر ضبط الدور: ' + pe.message, 500); }
    return json({ ok: true, id: cu.user.id });
  }

  const id = String(b.user_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return bad('BAD_ID');

  if (act === 'setRole') {
    const role = String(b.role || '');
    if (!ROLES.includes(role)) return bad('الدور غير صحيح');
    if (role !== 'admin' && (await adminCount(id)) === 0) return bad('لا يمكن إزالة آخر مدير');
    const { error } = await db.from('profiles').upsert({ user_id: id, role });
    return error ? bad(error.message, 500) : json({ ok: true });
  }

  if (act === 'setName') {
    const name = String(b.full_name || '').trim().slice(0, 120);
    const { error } = await db.from('profiles').update({ full_name: name || null }).eq('user_id', id);
    return error ? bad(error.message, 500) : json({ ok: true });
  }

  if (act === 'resetPassword') {
    const pw = String(b.password || '');
    if (pw.length < 10) return bad('كلمة المرور يجب ألا تقل عن 10 أحرف');
    const { error } = await db.auth.admin.updateUserById(id, { password: pw });
    return error ? bad(error.message, 400) : json({ ok: true });
  }

  if (act === 'remove') {
    if (id === me) return bad('لا يمكنك حذف حسابك بنفسك');
    const { data: t } = await db.from('profiles').select('role').eq('user_id', id).maybeSingle();
    if (t?.role === 'admin' && (await adminCount(id)) === 0) return bad('لا يمكن حذف آخر مدير');
    const { error } = await db.auth.admin.deleteUser(id);
    return error ? bad(error.message, 400) : json({ ok: true });
  }

  return bad('UNKNOWN_ACTION');
});
