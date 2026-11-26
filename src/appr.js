/* الموافقات: طلبات الاعتماد (محاسب ← مالك، موظف ← محاسب ← مالك…) وتطبيق المعتمد منها على البيانات */
'use strict';
const AP_KIND={rent_pay:'دفعة إيجار',svc_pay:'سداد رسوم / مياه / خدمات',mt_pay:'سداد صيانة',other_pay:'تحصيل آخر',agreement:'اتفاقية',mt_quote:'عرض سعر صيانة',mt_close:'إقفال طلب صيانة'};
const AP_ROLE={admin:'المالك',accountant:'المحاسب',officer:'موظف إدارة الأملاك',supervisor:'مشرف الصيانة والنظافة',pm:'مدير المشروع',editor:'محرر',viewer:'اطلاع'};
const AP_ST={pending:'بانتظار الاعتماد',approved:'معتمد',rejected:'مرفوض',cancelled:'ملغى'};
Object.assign(S,{ap:{list:[],tab:'me',q:'',st:'',me:null,applying:false,fail:{}}});
const apprMode=()=>!!(S.cl&&S.cl.on&&['accountant','officer'].includes(S.cl.role));
const apTime=t=>{try{return auTime(new Date(t).getTime())}catch{return''}};
const apCanDecide=r=>{
  if(!S.cl||!S.cl.on||r.status!=='pending')return false;const role=S.cl.role,me=S.ap.me;
  if(role==='admin')return true;
  if(r.created_by&&me&&r.created_by===me.uid)return false;
  if(r.chain[r.step]!==role)return false;
  if(role==='pm')return(me&&me.projects||[]).includes(r.project_id);
  return true;
};
const apMine=r=>S.ap.me&&r.created_by===S.ap.me.uid;
const apPendingMe=()=>S.ap.list.filter(apCanDecide);
async function apFetch(){
  if(!S.cl||!S.cl.on||!S.cl.base||!S.cl.role)return;
  if(!S.ap.me){const m=await native.cloud('me');if(m.ok&&m.v)S.ap.me=m.v}
  const r=await native.cloud('apprList');if(!r.ok)return;
  const old=JSON.stringify(S.ap.list.map(x=>[x.id,x.status,x.step,x.applied]));
  S.ap.list=r.v||[];
  const ch=old!==JSON.stringify(S.ap.list.map(x=>[x.id,x.status,x.step,x.applied]));
  await apApply();
  if(ch&&!document.querySelector('dialog[open]')){render()}
}
/* تطبيق الطلبات المعتمدة على المستند (يقوم به أي حساب يملك حق الحفظ، والتطبيق آمن التكرار) */
async function apApply(){
  if(S.ap.applying||!S.cl||S.cl.role==='viewer')return;
  const todo=S.ap.list.filter(r=>r.status==='approved'&&!r.applied&&!S.ap.fail[r.id]);if(!todo.length)return;
  S.ap.applying=true;const was=S.cl.ro;S.cl.ro=false;
  try{
    for(const r of todo){
      let ok=false;
      try{ok=apDo(r)}catch(e){console.error(e)}
      if(!ok){S.ap.fail[r.id]=1;toast('تعذّر تطبيق الطلب المعتمد رقم '+r.no+' (البيانات تغيّرت). راجع الطلب يدويًا');continue}
      await flush();
      if(dirty){S.ap.fail[r.id]=1;continue}
      const a=await native.cloud('apprApplied',r.id);
      if(a.ok){r.applied=true;native.cloud('apprClean',(r.files||[]).map(f=>f.path))}
    }
  }finally{S.cl.ro=was;S.ap.applying=false}
}
function apStamp(r,pay){pay.ap=r.no;pay.apBy=(r.log||[]).filter(l=>l.act==='approve').map(l=>(l.name||AP_ROLE[l.role]||'')).filter(Boolean).join('، ');pay.apFiles=(r.files||[]).map(f=>f.name)}
function apDo(r){
  const pl=r.payload||{};
  if(r.kind==='rent_pay'){
    const p=P()[pl.pid],c=p&&p.contracts.find(x=>x.id===pl.cid);if(!c)return false;
    if((c.payments||[]).some(x=>x.id===pl.pay.id))return true;
    const rno=S.db.settings.nextReceipt||1;S.db.settings.nextReceipt=rno+1;
    const pay={...pl.pay,rno};apStamp(r,pay);
    mutate(pl.pid,q=>{const cc=q.contracts.find(x=>x.id===pl.cid);(cc.payments=cc.payments||[]).push(pay)});return true;
  }
  if(r.kind==='svc_pay'){
    const x=svById(pl.id);if(!x)return false;
    if((x.pays||[]).some(y=>y.id===pl.pay.id))return true;
    const pay={...pl.pay};apStamp(r,pay);(x.pays=x.pays||[]).push(pay);svLog(x,'سداد معتمد: '+fm(pay.amount));persist();render();return true;
  }
  if(r.kind==='mt_pay'){
    const x=mtById(pl.id);if(!x)return false;
    if((x.pays||[]).some(y=>y.id===pl.pay.id))return true;
    const pay={...pl.pay};apStamp(r,pay);(x.pays=x.pays||[]).push(pay);mtLog(x,'سداد معتمد: '+fm(pay.amount));persist();render();return true;
  }
  return false;
}
/* إرسال طلب اعتماد بدل التنفيذ المباشر */
async function apSubmit(kind,pid,title,amount,payload,files){
  if(!files||!files.length){toast('المرفق إلزامي');return false}
  toast('جارٍ رفع المرفقات وإرسال الطلب…');
  const r=await native.cloud('apprSubmit',kind,pid,title,amount,payload,files);
  if(!r.ok){toast('تعذّر إرسال الطلب: '+(r.m||r.e));return false}
  toast('أُرسل الطلب للاعتماد — لا يُحتسب حتى الاعتماد النهائي');apFetch();return true;
}
/* ---------- الصفحة ---------- */
function apChain(r){return(r.chain||[]).map((x,i)=>{const done=r.status==='approved'||i<r.step,cur=r.status==='pending'&&i===r.step,rej=r.status==='rejected'&&i===r.step;return`<span class="ch ${done?'ok':rej?'bad':cur?'warn':''}">${done?'✓ ':rej?'✕ ':''}${esc(AP_ROLE[x]||x)}</span>`}).join(' ← ')}
function vApprovals(){
  const A=S.ap,q=A.q.toLowerCase(),all=A.list;
  const tabs=[['me','بانتظار اعتمادي',all.filter(apCanDecide).length],['mine','طلباتي',all.filter(apMine).length],['all','كل الطلبات',all.length]];
  const base=A.tab==='me'?all.filter(apCanDecide):A.tab==='mine'?all.filter(apMine):all;
  const pn=id=>(P()[id]||{}).name||'';
  const L=base.filter(r=>MS(A.st,r.status)&&(!q||[r.title,r.created_name,pn(r.project_id),AP_KIND[r.kind],r.no].join(' ').toLowerCase().includes(q)));
  const cols=[{h:'رقم',k:'d'},{h:'النوع',k:'t'},{h:'المشروع',k:'t'},{h:'البيان',k:'t'},{h:'المبلغ',k:'n'},{h:'مقدّم الطلب',k:'t'},{h:'التاريخ',k:'d'},{h:'مراحل الاعتماد',k:'t'},{h:'الحالة',k:'t'},{h:'مرفقات',k:'n'}];
  const rws=L.map(r=>({cls:r.status==='pending'&&apCanDecide(r)?'soon':r.status==='rejected'?'late':'',attrs:` data-a="apOpen" data-i="${esc(r.id)}"`,cells:[r.no,esc(AP_KIND[r.kind]||r.kind),esc(pn(r.project_id))||'—',esc(r.title),r.amount!=null?fm(r.amount):'—',esc(r.created_name||AP_ROLE[r.created_role]||''),apTime(r.created_at),apChain(r),`<span class="ch ${r.status==='approved'?'ok':r.status==='rejected'?'bad':r.status==='pending'?'warn':''}">${AP_ST[r.status]||r.status}</span>`,(r.files||[]).length||'—']}));
  S.pm={title:'الموافقات',sub:L.length+' طلب',cols,rows:L.map(r=>({cells:[r.no,AP_KIND[r.kind]||r.kind,pn(r.project_id),r.title,r.amount!=null?fm(r.amount):'',r.created_name||'',apTime(r.created_at),(r.chain||[]).map(x=>AP_ROLE[x]).join(' ← '),AP_ST[r.status],(r.files||[]).length]})),foot:null,footSpan:0};
  return `<h1>الموافقات</h1><p class="sub">الدفعات والطلبات لا تُحتسب في المتبقي ولا في التقارير إلا بعد الاعتماد النهائي، ثم تُسجَّل تلقائيًا في العقد أو الطلب المعني.</p>
<div class="tabs">${tabs.map(([k,l,n])=>`<button class="btn sm${A.tab===k?' p':''}" data-a="apTab" data-t="${k}">${l}${n?' ('+n+')':''}</button>`).join('')}</div>
<div class="bar">${msel('ap.st',Object.entries(AP_ST),'كل الحالات')}<input type="search" id="ap_q" placeholder="بحث: بيان، مقدّم الطلب، مشروع" value="${esc(A.q)}">${pbtn('list')}</div>
${rws.length?T(cols,rws):'<p class="empty">'+(A.tab==='me'?'لا توجد طلبات بانتظار اعتمادك.':'لا توجد طلبات.')+'</p>'}`;
}
VF.approvals=vApprovals;
function apDlg(id){
  const r=S.ap.list.find(x=>x.id===id);if(!r)return;
  const pn=(P()[r.project_id]||{}).name||'';
  const logs=(r.log||[]).map(l=>`<tr><td class="num">${apTime(l.at)}</td><td>${esc(l.name||AP_ROLE[l.role]||'')}</td><td>${{submit:'أرسل الطلب',approve:'اعتمد'+(l.all?' (نهائي)':''),reject:'رفض',cancel:'ألغى'}[l.act]||l.act}</td><td>${esc(l.note||'')}</td></tr>`).join('');
  const files=(r.files||[]).map((f,i)=>`<button class="btn sm" data-a="apFile" data-i="${esc(r.id)}" data-n="${i}">📎 ${esc(f.name)} <small>${fsz(f.size||0)}</small></button>`).join(' ')||'<span class="mut">لا مرفقات</span>';
  const can=apCanDecide(r);
  $('#stm').innerHTML=`<div class="dh"><div><h2>طلب رقم ${r.no} — ${esc(AP_KIND[r.kind]||r.kind)}</h2><p>${AP_ST[r.status]}</p></div><button class="x" data-a="sclose" aria-label="إغلاق">✕</button></div><div class="db">
${T([{h:'المشروع',k:'t'},{h:'البيان',k:'t'},{h:'المبلغ',k:'n'},{h:'مقدّم الطلب',k:'t'},{h:'التاريخ',k:'d'}],[{cells:[esc(pn)||'—',esc(r.title),r.amount!=null?'<b>'+fm(r.amount)+'</b>':'—',esc(r.created_name||'')+' <small>('+esc(AP_ROLE[r.created_role]||'')+')</small>',apTime(r.created_at)]}])}
<h3>مراحل الاعتماد</h3><p>${apChain(r)}</p>
<h3>المرفقات${r.status==='pending'?'':' <small class="mut">(تُحذف من السحابة بعد الاعتماد أو الرفض)</small>'}</h3><p>${files}</p>
<h3>السجل</h3><table class="t"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>ملاحظة</th></tr></thead><tbody>${logs}</tbody></table>
<div class="acts">${can?`<button class="btn p" data-a="apOk" data-i="${esc(r.id)}">اعتماد</button>${S.cl.role==='admin'&&r.chain.length-r.step>1?`<button class="btn" data-a="apOkAll" data-i="${esc(r.id)}">اعتماد نهائي (يتخطى المراحل)</button>`:''}<button class="btn dng" data-a="apNo" data-i="${esc(r.id)}">رفض</button>`:''}${r.status==='pending'&&(apMine(r)||S.cl.role==='admin')?`<button class="btn dng" data-a="apCancel" data-i="${esc(r.id)}">إلغاء الطلب</button>`:''}</div></div>`;
  if(!$('#stm').open)$('#stm').showModal();
}
async function apDecide(id,ok,note,all){
  const r=await native.cloud('apprDecide',id,ok,note,all);
  if(!r.ok){toast('تعذّر: '+({FORBIDDEN:'لا تملك صلاحية هذه المرحلة',NOT_PENDING:'الطلب لم يعد معلّقًا',SELF_APPROVE:'لا يمكنك اعتماد طلبك بنفسك',NOTE_REQUIRED:'اكتب سبب الرفض'}[r.e]||r.m));return}
  const rq=S.ap.list.find(x=>x.id===id);
  if(!ok&&rq)native.cloud('apprClean',(rq.files||[]).map(f=>f.path));
  toast(ok?(r.v==='approved'?'اعتُمد نهائيًا وسيُسجَّل تلقائيًا':'تم الاعتماد وانتقل للمرحلة التالية'):'رُفض الطلب');
  try{$('#stm').close()}catch{}await apFetch();render();
}
Object.assign(act,{
  apOpen:b=>apDlg(b.dataset.i),apTab:b=>{S.ap.tab=b.dataset.t;render()},
  apOk:b=>apDecide(b.dataset.i,true,'',false),apOkAll:b=>apDecide(b.dataset.i,true,'',true),
  apNo:b=>{const id=b.dataset.i;formDlg({title:'رفض الطلب',save:'رفض',fields:[{k:'note',l:'سبب الرفض *',t:'area',full:1}],onSave:o=>{if(!o.note)return 'سبب الرفض مطلوب';apDecide(id,false,o.note,false)}})},
  apCancel:b=>arm(b,async()=>{const id=b.dataset.i,rq=S.ap.list.find(x=>x.id===id),r=await native.cloud('apprCancel',id);if(r.ok){if(rq)native.cloud('apprClean',(rq.files||[]).map(f=>f.path));try{$('#stm').close()}catch{}await apFetch();render();toast('أُلغي الطلب')}else toast('تعذّر الإلغاء')}),
  apFile:async b=>{const r=S.ap.list.find(x=>x.id===b.dataset.i),f=r&&r.files[+b.dataset.n];if(!f)return;const o=await native.cloud('apprOpen',f.path,f.name);if(!o.ok||typeof o.v==='string'&&o.v)toast(o.ok?o.v:(o.m||'تعذّر فتح المرفق'))}
});
document.addEventListener('input',e=>{if(e.target.id==='ap_q'){S.ap.q=e.target.value;render()}});
setInterval(()=>{apFetch().catch(()=>0)},20000);setTimeout(()=>apFetch().catch(()=>0),5000);
