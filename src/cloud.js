/* المزامنة مع Supabase: دخول، تحميل، حفظ مع دمج التعديلات، تحديث دوري */
Object.assign(S,{cl:{on:false,rev:0,role:'',email:'',base:null,ro:false,busy:false,st:'off'}});
const CL_POLL=20000;
const clJ=JSON.stringify;
const clCanon=v=>Array.isArray(v)?'['+v.map(clCanon).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>clJ(k)+':'+clCanon(v[k])).join(',')+'}':clJ(v);
const clStats=d=>{let c=0,u=0;for(const p of Object.values(d.projects||{})){c+=(p.contracts||[]).length;u+=(p.units||[]).length}return{مشاريع:Object.keys(d.projects||{}).length,عقود:c,وحدات:u,'وحدات للرسوم':(d.feeUnits||[]).length}};

/* ---- دمج ثلاثي: base = آخر نسخة متزامنة، t = نسخة الآخرين، m = نسختي ---- */
function clMerge(b,t,m,depth,path,conf,pref){
  if(clJ(m)===clJ(t))return t;
  if(clJ(m)===clJ(b))return t;
  if(clJ(t)===clJ(b))return m;
  const isO=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const fail=()=>{conf.push({p:path});return pref==='mine'?m:t};
  if(depth<=0)return fail();
  if(isO(b)&&isO(t)&&isO(m)){
    const o={};
    for(const k of new Set([...Object.keys(b),...Object.keys(t),...Object.keys(m)])){
      const hb=k in b,ht=k in t,hm=k in m,p=path+'/'+k;
      if(!hb){ // مضاف
        if(ht&&hm){o[k]=clJ(t[k])===clJ(m[k])?t[k]:(conf.push({p}),pref==='mine'?m[k]:t[k])}else o[k]=ht?t[k]:m[k];continue}
      if(!hm){if(clJ(t[k])===clJ(b[k]))continue;conf.push({p,del:'mine'});if(pref==='mine')continue;o[k]=t[k];continue}
      if(!ht){if(clJ(m[k])===clJ(b[k]))continue;conf.push({p,del:'theirs'});if(pref!=='mine')continue;o[k]=m[k];continue}
      o[k]=clMerge(b[k],t[k],m[k],depth-1,p,conf,pref)}
    return o}
  const idd=a=>Array.isArray(a)&&a.every(x=>x&&typeof x==='object'&&x.id!=null);
  if(idd(b)&&idd(t)&&idd(m)){
    const mp=a=>new Map(a.map(x=>[String(x.id),x])),B=mp(b),T=mp(t),M=mp(m),out=[];
    const ids=[...T.keys(),...[...M.keys()].filter(k=>!T.has(k))];
    for(const id of ids){
      const hb=B.has(id),ht=T.has(id),hm=M.has(id),p=path+'/'+id;
      if(!hb){if(ht&&hm){out.push(clJ(T.get(id))===clJ(M.get(id))?T.get(id):(conf.push({p}),pref==='mine'?M.get(id):T.get(id)))}else out.push(ht?T.get(id):M.get(id));continue}
      if(!hm){if(clJ(T.get(id))===clJ(B.get(id)))continue;conf.push({p,del:'mine'});if(pref!=='mine')out.push(T.get(id));continue}
      out.push(clMerge(B.get(id),T.get(id),M.get(id),depth-1,p,conf,pref))}
    for(const id of B.keys())if(!ids.includes(id)&&!T.has(id)&&M.has(id)&&clJ(M.get(id))!==clJ(B.get(id))){conf.push({p:path+'/'+id,del:'theirs'});if(pref==='mine')out.push(M.get(id))}
    return out}
  return fail();
}
function clLabel(p){
  const a=p.split('/').filter(Boolean),db=S.db;let s='';
  if(a[0]==='projects'&&db.projects[a[1]]){const pr=db.projects[a[1]];s=pr.name;
    if(a[2]==='contracts'){const c=(pr.contracts||[]).find(x=>String(x.id)===a[3]);s+=' / عقد '+(c?c.unit+' — '+(c.tenant||''):a[3])}
    else if(a[2]==='units'){const u=(pr.units||[]).find(x=>String(x.id)===a[3]);s+=' / وحدة '+(u?u.no:a[3])}
    else if(a[2])s+=' / '+a[2]}
  else s=a.slice(0,3).join(' / ');
  return s;
}

/* ---- شارة الحالة ---- */
function clBadge(st,msg){
  S.cl.st=st;let b=document.getElementById('clb');
  if(!S.cl.on){if(b)b.remove();return}
  if(!b){b=document.createElement('div');b.id='clb';b.setAttribute('role','button');b.onclick=e=>{if(!e.target.closest('[data-a]'))clDlg()};document.body.appendChild(b)}
  const c={ok:'#1f7a4d',sync:'#8a6d1d',err:'#a33',ro:'#555'}[st]||'#555';
  b.style.cssText='position:fixed;bottom:10px;left:12px;z-index:60;background:#fff;border:1px solid '+c+';color:'+c+';border-radius:14px;padding:3px 10px;font-size:12px;cursor:pointer;box-shadow:0 1px 4px #0002;font-family:inherit';
  b.innerHTML=esc(({ok:'☁ متزامن',sync:'☁ جارٍ المزامنة…',err:'☁ تعذّرت المزامنة',ro:'☁ للاطلاع فقط'}[st]||'☁')+(msg?' — '+msg:''))+(S.cl.email?' · '+esc(S.cl.email):'')+'';
  b.title=(S.cl.email||'')+' · v'+S.cl.rev;
}

/* ---- شاشة الدخول (تحجب التطبيق حتى النجاح) ---- */
function clGate(msg){
  return new Promise(res=>{
    document.getElementById('clg')?.remove();
    const g=document.createElement('div');g.id='clg';
    g.style.cssText='position:fixed;inset:0;z-index:200;background:#edf0f3;display:flex;align-items:center;justify-content:center;direction:rtl;font-family:inherit';
    g.innerHTML=`<form style="background:#fff;border-radius:14px;padding:26px;width:340px;box-shadow:0 8px 30px #0003;display:grid;gap:10px"><h2 style="margin:0">تسجيل الدخول</h2><p style="margin:0;color:#667">بيانات الأملاك مشتركة على السحابة.</p>
<input id="clg_e" type="email" autocomplete="username" placeholder="البريد الإلكتروني" style="direction:ltr;padding:9px" required><input id="clg_p" type="password" autocomplete="current-password" placeholder="كلمة المرور" style="direction:ltr;padding:9px" required>
<div id="clg_m" style="color:#a33;min-height:18px;font-size:13px">${esc(msg||'')}</div><button class="btn p" type="submit">دخول</button><button class="btn" type="button" id="clg_x">العمل محليًا بدون سحابة</button></form>`;
    document.body.appendChild(g);
    g.querySelector('#clg_e').value=S.cl.email||'';g.querySelector('#clg_e').focus();
    g.querySelector('form').onsubmit=async e=>{e.preventDefault();const m=g.querySelector('#clg_m');m.textContent='جارٍ الدخول…';
      const r=await native.cloud('login',g.querySelector('#clg_e').value,g.querySelector('#clg_p').value);
      if(r.ok){S.cl.email=r.v.email;S.cl.role=r.v.role;g.remove();res(true)}else m.textContent=r.m||'تعذّر الدخول'};
    g.querySelector('#clg_x').onclick=async()=>{await native.cloud('on',false);S.cl.on=false;g.remove();res(false)};
  });
}

/* ---- تحميل من السحابة ---- */
async function clPull(first){
  let r=await native.cloud('get');
  if(!r.ok&&r.e==='AUTH'){if(!await clGate('انتهت الجلسة، سجّل الدخول من جديد'))return false;r=await native.cloud('get')}
  if(!r.ok){toast('تعذّر الاتصال بالسحابة: '+r.m);clBadge('err');return false}
  const rl=await native.cloud('role');if(rl.ok)S.cl.role=rl.v||'';S.cl.ro=S.cl.role==='viewer';
  if(!r.v){ // السحابة فارغة
    if(S.cl.role==='admin'){ // السحابة فارغة: رفع تلقائي لمرة واحدة (لا يستبدل شيئًا)
      clBadge('sync','رفع البيانات…');const m=await clUpload();toast(m.slice(0,160));
      if(/^✔/.test(m)){S.cl.lastUp=m;return true}clBadge('err','فشل الرفع الأولي');return true}
    toast('لا توجد بيانات على السحابة بعد');return true}
  if(first||!S.cl.base){try{await native.backupPre('cloud')}catch{}}
  S.db=normalize(r.v.data);S.cl.rev=r.v.rev;S.cl.base=structuredClone(r.v.data);dirty=false;
  try{await native.save(S.db)}catch{}
  clBadge(S.cl.ro?'ro':'ok');return true;
}


/* رفع النسخة المحلية إلى السحابة مع التحقق بالمقارنة الكاملة */
async function clUpload(){
  await flush();const g=await native.cloud('get');if(!g.ok)return 'تعذّرت القراءة: '+g.m;
  const base=g.v?g.v.rev:0;
  try{await native.backupPre(g.v?'cloud-overwrite':'cloud-first')}catch{}
  const sent=structuredClone(S.db),want=clCanon(JSON.parse(JSON.stringify(sent))),r=await native.cloud('save',sent,base);
  if(!r.ok)return r.e==='REV_CONFLICT'?'تغيّرت السحابة أثناء الرفع، أعد المحاولة':'فشل الرفع: '+r.m;
  const v=await native.cloud('get');
  const same=v.ok&&v.v&&clCanon(v.v.data)===want;
  S.cl.rev=r.v;S.cl.base=sent;clBadge('ok');
  const a=clStats(sent),c=v.ok&&v.v?clStats(v.v.data):{};
  return (same?'✔ رُفعت البيانات والمطابقة 100%. ':'⚠ رُفعت لكن المقارنة لم تتطابق تمامًا! ')+'المحلي: '+Object.entries(a).map(([k,x])=>k+' '+x).join('، ')+' | السحابة: '+Object.entries(c).map(([k,x])=>k+' '+x).join('، ');
}

/* ---- رفع التعديلات مع الدمج ---- */
async function clPush(){
  if(!S.cl.on||S.cl.ro||S.cl.busy)return;
  S.cl.busy=true;clBadge('sync');
  try{
    for(let i=0;i<4;i++){
      const sent=structuredClone(S.db),r=await native.cloud('save',sent,S.cl.rev); // اللقطة المُرسلة هي الأساس، لا ما تغيّر أثناء الإرسال
      if(r.ok){S.cl.rev=r.v;S.cl.base=sent;clBadge('ok');return}
      if(r.e==='REV_CONFLICT'){if(!await clResolve())return;continue}
      if(r.e==='AUTH'){S.cl.busy=false;if(await clGate('انتهت الجلسة، سجّل الدخول لحفظ تعديلاتك')){dirty=true;persist()}return}
      if(r.e==='FORBIDDEN'){S.cl.ro=true;clBadge('ro');toast('ليس لديك صلاحية التعديل. تعديلاتك محفوظة محليًا فقط');return}
      dirty=true;clBadge('err');toast('تعذّر الحفظ على السحابة: '+r.m);return}
    dirty=true;clBadge('err');toast('تعذّر الحفظ بسبب تعديلات متزامنة، أعد المحاولة');
  }finally{S.cl.busy=false}
}
async function clResolve(){
  const g=await native.cloud('get');if(!g.ok||!g.v){dirty=true;clBadge('err');toast('تعذّر قراءة آخر نسخة من السحابة');return false}
  const conf=[],merged=clMerge(S.cl.base||g.v.data,g.v.data,S.db,8,'',conf,'theirs');
  const mine=S.db;
  S.db=normalize(merged);S.cl.rev=g.v.rev;S.cl.base=structuredClone(g.v.data);render();
  if(conf.length)clConflictDlg(conf,mine,g.v);
  else toast('دُمجت تعديلاتك مع تعديلات مستخدم آخر تلقائيًا');
  return true;
}
function clConflictDlg(conf,mine,theirs){
  const L=conf.map(c=>`<li>${esc(clLabel(c.p))}${c.del==='mine'?' <small>(حذفتَه أنت وعدّله غيرك)</small>':c.del==='theirs'?' <small>(حذفه غيرك وعدّلته أنت)</small>':''}</li>`).join('');
  $('#stm').innerHTML=`<div class="dh"><div><h2>تعارض في التعديلات</h2><p>عدّل مستخدم آخر ${conf.length} عنصرًا عدّلتَه أنت أيضًا</p></div><button class="x" data-a="sclose" aria-label="إغلاق">✕</button></div><div class="db"><p>دُمجت بقية تعديلاتك تلقائيًا. في العناصر التالية اعتُمدت <b>نسخة المستخدم الآخر</b>:</p><ul>${L}</ul><div class="acts"><button class="btn" data-a="sclose">أبقِ نسخة الآخر</button><button class="btn p" data-a="clMine">اعتمد نسختي في هذه العناصر</button></div></div>`;
  S.cl._cf={mine,theirs};$('#stm').showModal();
}
act.clMine=()=>{const x=S.cl._cf;if(!x)return;const conf=[];
  S.db=normalize(clMerge(S.cl.base,x.theirs.data,x.mine,8,'',conf,'mine'));S.cl._cf=null;$('#stm').close();dirty=true;persist();render();toast('اعتُمدت نسختك في المتعارضات')};

/* ---- تحديث دوري من تعديلات الآخرين ---- */
async function clPoll(){
  if(!S.cl.on||S.cl.busy||!S.cl.base)return;
  if(dirty)return;
  const r=await native.cloud('rev');
  if(!r.ok){if(r.e!=='AUTH')clBadge('err');return}
  if(!r.v||r.v.rev<=S.cl.rev){if(S.cl.st==='err')clBadge(S.cl.ro?'ro':'ok');return}
  if(document.querySelector('dialog[open]'))return; // لا نقاطع نافذة مفتوحة
  const g=await native.cloud('get');if(!g.ok||!g.v||dirty)return;
  S.db=normalize(g.v.data);S.cl.rev=g.v.rev;S.cl.base=structuredClone(g.v.data);
  try{await native.save(S.db)}catch{}
  render();clBadge(S.cl.ro?'ro':'ok');toast('تم تحديث البيانات: عدّلها مستخدم آخر');
}
setInterval(()=>clPoll().catch(()=>{}),CL_POLL);

/* ---- الإقلاع ---- */
async function clBoot(){
  const s=await native.cloud('status');if(!s.ok||!s.v.configured||!s.v.on)return;
  S.cl.on=true;S.cl.email=s.v.email;
  if(!s.v.signed&&!await clGate())return;
  if(!await clPull(true)&&S.cl.on&&!S.cl.base)clBadge('err');
}

/* ---- نافذة الإعداد ---- */
async function clDlg(){
  const s=(await native.cloud('status')).v||{};
  const h=await(S.cl.on&&S.cl.role==='admin'?native.cloud('hist'):Promise.resolve({ok:false}));
  const hist=h.ok&&h.v?h.v:[];
  $('#stm').innerHTML=`<div class="dh"><div><h2>الاتصال بقاعدة البيانات (Supabase)</h2><p>${S.cl.on?'مفعّل — '+esc(S.cl.email)+' ('+esc({admin:'مدير',editor:'محرر',viewer:'اطلاع فقط'}[S.cl.role]||'')+') — v'+S.cl.rev:'غير مفعّل'}</p></div><button class="x" data-a="sclose" aria-label="إغلاق">✕</button></div>
<div class="db"><div class="g2"><label>رابط المشروع (Project URL)<input id="cl_u" dir="ltr" placeholder="https://xxxx.supabase.co" value="${esc(s.url||'')}"></label>
<label>مفتاح anon / publishable فقط<input id="cl_k" dir="ltr" type="password" placeholder="${s.configured?'محفوظ — اتركه فارغًا للإبقاء':'eyJ… أو sb_publishable_…'}"></label></div>
${S.cl.lastUp?'<p class="sub">'+esc(S.cl.lastUp)+'</p>':''}<p class="sub">لا تضع مفتاح service_role هنا أبدًا. التنفيذ الأول: شغّل supabase/schema.sql في SQL Editor ثم أضف المستخدمين كما في آخر الملف.</p>
<div class="acts"><button class="btn p" data-a="clSave">حفظ الاتصال</button>${s.configured&&!S.cl.on?'<button class="btn p" data-a="clEnable">تفعيل المزامنة وتسجيل الدخول</button>':''}${S.cl.on?'<button class="btn" data-a="clPullNow">تحديث من السحابة الآن</button>':''}${S.cl.on&&S.cl.role==='admin'?'<button class="btn dng" data-a="clUp">رفع بياناتي المحلية إلى السحابة</button>':''}${S.cl.on?'<button class="btn" data-a="clLogout">تسجيل الخروج</button><button class="btn" data-a="clOut">إيقاف المزامنة والعمل محليًا</button>':''}</div>
<div id="cl_msg" class="sub"></div>
${hist.length?`<h3>نسخ السحابة (آخر ${hist.length})</h3>${T([{h:'التاريخ',k:'t'},{h:'الرقم',k:'d'},{h:'',k:'ac'}],hist.map(x=>({cells:[esc(new Date(x.saved_at).toLocaleString('ar-SA')),x.rev,`<button class="btn sm dng" data-a="clRest" data-i="${x.id}">استعادة</button>`]})))}`:''}</div>`;
  if(!$('#stm').open)$('#stm').showModal();
}
const clMsg=t=>{const e=document.getElementById('cl_msg');if(e)e.textContent=t};
Object.assign(act,{
  clOpen:()=>clDlg(),
  clSave:async()=>{const u=$('#cl_u').value,k=$('#cl_k').value.trim();
    let key=k;if(!key){clMsg('أدخل المفتاح');return}
    const r=await native.cloud('config',u,key);clMsg(r.ok?'تم حفظ الاتصال. اضغط «تفعيل المزامنة».':r.m);if(r.ok)setTimeout(clDlg,400)},
  clEnable:async()=>{await native.cloud('on',true);S.cl.on=true;$('#stm').close();
    if(!await clGate()){return}
    if(await clPull(true)){render();clDlg()}},
  clPullNow:async()=>{if(dirty)await flush();if(await clPull(true)){render();toast('تم التحديث من السحابة')}},
  clLogout:b=>arm(b,async()=>{if(dirty)await flush();await native.cloud('logout');S.cl.email='';S.cl.role='';S.cl.base=null;S.cl.ro=false;try{$('#stm').close()}catch{}
    if(await clGate()){if(await clPull(true))render()}}),
  clOut:async()=>{await flush();await native.cloud('logout');await native.cloud('on',false);S.cl.on=false;clBadge('off');$('#stm').close();toast('أُوقفت المزامنة. البيانات المحلية كما هي')},
  clUp:b=>arm(b,async()=>{clMsg(await clUpload())}),
  clRest:b=>arm(b,async()=>{
    const d=await native.cloud('histGet',b.dataset.i);if(!d.ok||!d.v){toast('تعذّرت قراءة النسخة');return}
    await flush();try{await native.backupPre('cloud-restore')}catch{}
    const r=await native.cloud('histRestore',b.dataset.i);if(!r.ok){toast('فشلت الاستعادة: '+r.m);return}
    if(await clPull(true)){$('#stm').close();render();toast('استُعيدت النسخة السحابية')}})
});

native.onFlush(async()=>{try{await flush()}catch{}native.flushed()});
