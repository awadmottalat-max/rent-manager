/* سجل التعديلات: من عدّل ماذا ومتى (القيمة قبل وبعد) — يُحسب بمقارنة البيانات قبل/بعد كل حفظ */
'use strict';
const AU_MAX=4000,AU_BULK=120;
const AU_L={unit:'الوحدة',owner:'المالك',tenant:'المستأجر',rent:'الإيجار',fee:'رسوم الإدارة',feeType:'نوع الرسوم',feePct:'نسبة الرسوم',feeMode:'طريقة الرسوم',feeDate:'تاريخ الرسوم',cfee:'رسوم العقد',start:'البداية',end:'النهاية',period:'الدورية',count:'عدد الأقساط',notes:'ملاحظات',prevRemaining:'متبقي سابق',oldDates:'تواريخ سابقة',extra:'إضافات',kind:'النوع',name:'الاسم',phone:'الجوال',idno:'الهوية',email:'البريد',addr:'العنوان',type:'النوع',area:'المساحة',base:'المبلغ قبل الضريبة',total:'الإجمالي',year:'السنة',party:'على',due:'الاستحقاق',payee:'الجهة',status:'الحالة',cost:'التكلفة',cat:'التصنيف',payer:'يتحمّل',pid:'المشروع',no:'الرقم',vat:'الضريبة',operator:'اسم المشغّل',mode:'طريقة الاحتساب',date:'التاريخ',amount:'المبلغ',note:'ملاحظة'};
const AU_K={c:'عقد',u:'وحدة',p:'مشروع',sv:'رسوم وخدمات',mq:'صيانة ونظافة',fu:'وحدة رسوم فقط',ow:'مالك',tn:'مستأجر',ag:'اتفاقية',st:'إعدادات',pay:'دفعة'};
const AU_A={add:'إضافة',edit:'تعديل',del:'حذف',note:'ملاحظة'};
const auV=v=>{if(v==null||v==='')return'—';if(typeof v==='object')v=JSON.stringify(v);v=String(v);return v.length>90?v.slice(0,90)+'…':v};
const auWho=()=>{const c=S.cl;return c&&c.on?(c.name||c.email||'مستخدم'):'محلي'};
const auId=()=>'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const AU_KEYS=['contracts','units'];
function auEnts(db){
  const m=new Map(),put=(k,o,x)=>m.set(k,{o,x,s:JSON.stringify(o)});
  for(const[pid,p]of Object.entries(db.projects||{})){
    const{contracts,units,...pr}=p;put('p:'+pid,pr,{pid,k:'p'});
    for(const c of contracts||[])put('c:'+pid+':'+(c.id||c.unit),c,{pid,k:'c'});
    for(const u of units||[])put('u:'+pid+':'+(u.id||u.no),u,{pid,k:'u'});
  }
  const L=[['svc','sv'],['mreq','mq'],['feeUnits','fu'],['agreements','ag']];
  for(const[f,k]of L)for(const x of db[f]||[])put(k+':'+(x.id||x.no),x,{pid:x.pid,k});
  for(const x of db.parties?.owners||[])put('ow:'+x.id,x,{k:'ow'});
  for(const x of db.parties?.tenants||[])put('tn:'+x.id,x,{k:'tn'});
  put('st:',db.settings||{},{k:'st'});
  return m;
}
function auRef(k,o,pid){
  const pn=(S.db.projects[pid]||{}).name||'';
  if(k==='c'||k==='u')return{pn,ref:'وحدة '+(o.unit||o.no||'')+(o.tenant?' — '+o.tenant:o.owner?' — '+o.owner:'')};
  if(k==='sv'||k==='mq'||k==='fu')return{pn:pn||((S.db.projects[o.pid]||{}).name||''),ref:'وحدة '+(o.unit||o.no||'')+(o.type?' — '+o.type:'')};
  if(k==='ow'||k==='tn')return{pn:'',ref:o.name||''};
  if(k==='p')return{pn:o.name||'',ref:''};
  return{pn,ref:o.title||o.name||o.unit||''};
}
function auDiff(a,b,meta,out){
  const{k,pid}=meta,o=a||b,{pn,ref}=auRef(k,o,pid),T=Date.now(),u=auWho();
  const e=(kk,act,f,ov,nv)=>out.push({id:auId(),t:T,u,k:AU_K[kk]||kk,a:act,pn,ref,f:f||'',o:auV(ov),n:auV(nv)});
  if(!a){e(k,'add','',null,k==='c'||k==='sv'||k==='mq'?(b.rent??b.total??b.cost??''):'');return}
  if(!b){e(k,'del','',k==='c'||k==='sv'||k==='mq'?(a.rent??a.total??a.cost??''):'',null);return}
  for(const f of new Set([...Object.keys(a),...Object.keys(b)])){
    const x=a[f],y=b[f];if(JSON.stringify(x)===JSON.stringify(y))continue;
    if(Array.isArray(x||y||[])&&((x||y||[])[0]?.id!=null||!(x||[]).length&&!(y||[]).length)&&(f==='payments'||f==='pays')){
      const mx=new Map((x||[]).map(p=>[p.id,p])),my=new Map((y||[]).map(p=>[p.id,p]));
      for(const[i,p]of my){const q=mx.get(i);if(!q)e('pay','add','دفعة '+(p.date||''),null,p.amount);else if(JSON.stringify(p)!==JSON.stringify(q)){for(const g of new Set([...Object.keys(p),...Object.keys(q)]))if(JSON.stringify(p[g])!==JSON.stringify(q[g]))e('pay','edit','دفعة '+(q.date||p.date||'')+' — '+(AU_L[g]||g),q[g],p[g])}}
      for(const[i,p]of mx)if(!my.has(i))e('pay','del','دفعة '+(p.date||''),p.amount,null);
    }else e(k,'edit',AU_L[f]||f,x,y);
  }
}
function auRun(){
  if(!S.db)return;
  const db=S.db;if(!Array.isArray(db.audit))db.audit=[];
  const cur=auEnts(db);
  if(S._auDb!==db||!S._auMap){S._auDb=db;S._auMap=cur;return}
  const prev=S._auMap,out=[];
  for(const[k,v]of cur){const p=prev.get(k);if(!p)auDiff(null,v.o,v.x,out);else if(p.s!==v.s)auDiff(p.o,v.o,v.x,out)}
  for(const[k,p]of prev)if(!cur.has(k))auDiff(p.o,null,p.x,out);
  S._auMap=cur;
  if(!out.length)return;
  if(out.length>AU_BULK){
    const c={};for(const x of out){const g=x.k+' / '+AU_A[x.a];c[g]=(c[g]||0)+1}
    out.length=0;out.push({id:auId(),t:Date.now(),u:auWho(),k:'تعديل جماعي',a:'edit',pn:'',ref:'',f:'عدد التغييرات',o:'—',n:Object.entries(c).map(([g,n])=>g+': '+n).join('، ')});
  }
  db.audit.push(...out);
  if(db.audit.length>AU_MAX)db.audit.splice(0,db.audit.length-AU_MAX);
}
function auNote(text,k){if(!S.db)return;(S.db.audit=S.db.audit||[]).push({id:auId(),t:Date.now(),u:auWho(),k:k||'النظام',a:'note',pn:'',ref:'',f:text,o:'—',n:'—'})}
Object.assign(S,{au:{q:'',u:[],k:[],a:[],p:[],d:''}});
const auTime=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())};
function vAudit(){
  const A=S.au,all=(S.db.audit||[]).slice().reverse(),q=A.q.toLowerCase();
  const uniq=f=>[...new Set(all.map(x=>x[f]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const day=A.d?new Date(A.d+'T00:00:00').getTime():0;
  const list=all.filter(x=>MS(A.u,x.u)&&MS(A.k,x.k)&&MS(A.a,x.a)&&MS(A.p,x.pn)&&(!day||x.t>=day&&x.t<day+864e5)&&(!q||[x.u,x.k,x.pn,x.ref,x.f,x.o,x.n].join(' ').toLowerCase().includes(q)));
  const cols=[{h:'الوقت',k:'t'},{h:'المستخدم',k:'t'},{h:'القسم',k:'t'},{h:'العملية',k:'t'},{h:'المشروع',k:'t'},{h:'العنصر',k:'t'},{h:'الحقل',k:'t'},{h:'قبل',k:'t'},{h:'بعد',k:'t'}];
  const rws=list.slice(0,400).map(x=>({cells:['<span class="num">'+auTime(x.t)+'</span>',esc(x.u),esc(x.k),'<b class="au-'+x.a+'">'+(AU_A[x.a]||x.a)+'</b>',esc(x.pn),esc(x.ref),esc(x.f),esc(x.o),esc(x.n)]}));
  S.pm={title:'سجل التعديلات',sub:list.length+' عملية',cols,rows:list.slice(0,2000).map(x=>({cells:[auTime(x.t),x.u,x.k,AU_A[x.a]||x.a,x.pn,x.ref,x.f,x.o,x.n]})),foot:null,footSpan:0};
  return `<h1>سجل التعديلات</h1><p class="sub">من عدّل ماذا ومتى مع القيمة قبل التعديل وبعده. يُسجَّل كل تعديل على العقود والدفعات والوحدات والملاك والمستأجرين والرسوم والصيانة. يُحتفظ بآخر ${AU_MAX} عملية.</p>
<div class="bar">${msel('au.u',uniq('u').map(x=>[x,x]),'كل المستخدمين')}${msel('au.k',uniq('k').map(x=>[x,x]),'كل الأقسام')}${msel('au.a',Object.entries(AU_A),'كل العمليات')}${msel('au.p',uniq('pn').map(x=>[x,x]),'كل المشاريع')}<input type="date" id="au_d" value="${esc(A.d)}" title="اليوم"><input type="search" id="au_q" placeholder="بحث: وحدة، اسم، قيمة" value="${esc(A.q)}">${pbtn('list')}</div>
<div class="kps"><div class="kp static"><span>عدد العمليات</span><b>${list.length}</b><i>${list.length>400?'يُعرض أحدث 400':''}</i></div></div>
${rws.length?T(cols,rws):'<p class="empty">لا توجد عمليات مسجَّلة بعد.</p>'}`;
}
VF.audit=vAudit;
document.addEventListener('input',e=>{if(e.target.id==='au_q'){S.au.q=e.target.value;render()}});
document.addEventListener('change',e=>{if(e.target.id==='au_d'){S.au.d=e.target.value;render()}});
