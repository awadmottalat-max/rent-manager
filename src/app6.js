/* v1.9: إزالة/إعادة الوحدات، إغلاق النوافذ بالنقر خارجها، فحص سلامة البيانات */
'use strict';
function pickProject(title,cb){
  const L=Object.entries(P()).sort((a,b)=>a[1].name.localeCompare(b[1].name,'ar'));
  if(!L.length)return toast('أضف مشروعًا أولًا');
  {const a=MSV(S.av.p);if(a.length===1||L.length===1)return cb(a[0]||L[0][0])}
  formDlg({title,save:'متابعة',vals:{pid:L[0][0]},fields:[{k:'pid',l:'المشروع',t:'select',opts:L.map(([k,p])=>[k,p.name]),full:1}],onSave:o=>{setTimeout(()=>cb(o.pid),80)}});
}
const unitOf=b=>{const p=P()[b.dataset.p];return{p,u:p?.units.find(u=>u.id===b.dataset.i)}};
Object.assign(act,{
  availAdd:()=>pickProject('إضافة وحدة',pid=>unitForm(pid)),
  unitOff:b=>{const{p,u}=unitOf(b);if(!u)return;
    formDlg({title:'إزالة الوحدة من المتاحة — '+esc(u.no)+' ('+esc(p.name)+')',save:'تأكيد الإزالة',vals:{date:iso(TODAY),reason:'تسليم الوحدة للمالك',note:''},
      fields:[{k:'date',l:'تاريخ الإزالة / التسليم',t:'date'},{k:'reason',l:'السبب',t:'select',opts:['تسليم الوحدة للمالك','المالك لا يرغب بتأجيرها حاليًا','صيانة / تجهيز','بيعت','أخرى'].map(x=>[x,x])},{k:'note',l:'ملاحظات',t:'area',full:1}],
      onSave:o=>{mutate(b.dataset.p,q=>{const z=q.units.find(x=>x.id===b.dataset.i);z.avail='no';z.off={date:o.date,reason:o.reason,note:o.note};z.availNote=o.reason+(o.note?' — '+o.note:'')});toast('أُزيلت الوحدة '+u.no+' من المتاحة — يمكن إعادتها من «خارج الإيجار»')}})},
  unitOn:b=>{const{u}=unitOf(b);if(!u)return;mutate(b.dataset.p,q=>{const z=q.units.find(x=>x.id===b.dataset.i);z.avail='auto';delete z.off;z.availNote=''});toast('أُعيدت الوحدة '+u.no+' إلى المتاحة')}
});
/* ----- إغلاق أي نافذة بالنقر خارجها ----- */
let dirtyHit=null;
document.addEventListener('input',e=>{if(e.target.closest?.('#frm'))dirtyHit=dirtyHit||false},true);
document.addEventListener('mousedown',e=>{
  const d=e.target;if(!(d instanceof HTMLDialogElement)||!d.open)return;
  const r=d.getBoundingClientRect(),out=e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;
  if(!out)return;
  if(d.id==='frm'&&dirtyHit===false){dirtyHit=true;toast('هناك بيانات غير محفوظة — انقر خارج النافذة مرة أخرى للإغلاق');d.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:220});return}
  d.close();
});
document.getElementById('frm').addEventListener('close',()=>{dirtyHit=null});
new MutationObserver(()=>{if(!document.getElementById('frm').open)dirtyHit=null}).observe(document.getElementById('frm'),{attributes:true,attributeFilter:['open']});
/* ----- فحص سلامة البيانات ----- */
function auditData(){
  const I=[];
  for(const[pid,p]of Object.entries(P())){
    const um={};for(const u of p.units||[])(um[normU(u.no)]=um[normU(u.no)]||[]).push(u);
    for(const[k,a]of Object.entries(um))if(a.length>1)I.push({t:'dupUnit',pid,msg:`وحدة مكررة في ${p.name}: ${a.map(u=>u.no).join(' / ')}`});
    const ck={};for(const c of p.contracts)(ck[[normU(c.unit),nm(c.tenant),c.start,c.end,c.rent].join('|')]=ck[[normU(c.unit),nm(c.tenant),c.start,c.end,c.rent].join('|')]||[]).push(c);
    for(const a of Object.values(ck))if(a.length>1)I.push({t:'dupContract',pid,cid:a[0].id,msg:`عقد مكرر (${a.length}) في ${p.name}: وحدة ${a[0].unit} — ${a[0].tenant||'—'}`});
    const by={};for(const c of p.contracts)if(normU(c.unit))(by[normU(c.unit)]=by[normU(c.unit)]||[]).push(c);
    for(const a of Object.values(by)){if(a.length<2)continue;
      const iv=a.map(c=>({c,s:pd(c.start),e:Math.min(pd(c.end)??1e12,c.exit?.date?pd(c.exit.date):1e12)})).filter(x=>x.s!=null);
      for(let i=0;i<iv.length;i++)for(let j=i+1;j<iv.length;j++){const x=iv[i],y=iv[j];if(x.s<=y.e&&y.s<=x.e&&!(x.s===y.s&&x.c.tenant===y.c.tenant&&x.c.end===y.c.end))
        I.push({t:'overlap',pid,cid:x.c.id,msg:`عقدان متداخلان لوحدة ${x.c.unit} في ${p.name}: ${nm(x.c.tenant)||'—'} (${x.c.start}→${x.c.end}) و${nm(y.c.tenant)||'—'} (${y.c.start}→${y.c.end})`})}}
    for(const c of p.contracts)if(!nm(c.unit))I.push({t:'noUnit',pid,cid:c.id,msg:`عقد بلا رقم وحدة في ${p.name}: ${nm(c.tenant)||'—'}`});
  }
  return I;
}
function auditFixUnits(){let n=0;
  for(const p of Object.values(P())){const seen={},keep=[];
    for(const u of p.units||[]){const k=normU(u.no);if(seen[k]){for(const f of Object.keys(u))if(seen[k][f]===undefined||seen[k][f]==='')seen[k][f]=u[f];n++}else{seen[k]=u;keep.push(u)}}
    p.units=keep}
  persist();return n}
function auditCard(){return `<div class="card"><h3>فحص سلامة البيانات</h3><p>يبحث عن وحدات مكررة، عقود مكررة، تداخل عقدين لنفس الوحدة، وعقود بلا رقم وحدة.</p><div class="acts"><button class="btn p" data-a="audit">تشغيل الفحص</button></div><div id="auditOut"></div></div>`}
Object.assign(act,{
  audit:()=>{const I=auditData(),o=$('#auditOut'),G={dupUnit:'وحدات مكررة',dupContract:'عقود مكررة',overlap:'عقود متداخلة لنفس الوحدة',noUnit:'عقود بلا وحدة'};
    o.innerHTML=I.length?Object.entries(G).map(([t,l])=>{const L=I.filter(x=>x.t===t);return L.length?`<h4>${l} (${L.length})</h4><ul class="aud">${L.slice(0,60).map(x=>`<li>${x.cid?`<button class="link" data-a="open" data-p="${esc(x.pid)}" data-c="${esc(x.cid)}">${esc(x.msg)}</button>`:esc(x.msg)}</li>`).join('')}</ul>${t==='dupUnit'?'<button class="btn" data-a="auditFix">دمج الوحدات المكررة تلقائيًا</button>':''}`:''}).join(''):'<p class="ok">✓ لا توجد مشكلات: لا تكرار ولا تداخل.</p>'},
  auditFix:()=>{const n=auditFixUnits();toast('تم دمج '+n+' وحدة مكررة');render()}
});

/* ----- قالب طباعة عقد الإيجار (A4) ----- */
function leaseDoc(x){
  const{c,r,pid}=x,p=P()[pid]||{},cn=v=>esc(v)||'—',u=(p.units||[]).find(z=>normU(z.no)===normU(c.unit))||{};
  const own=PR('owners').find(z=>nm(z.name)===nm(c.owner))||{},ten=PR('tenants').find(z=>nm(z.name)===nm(c.tenant))||{};
  const s=pd(c.start),prev=(p.contracts||[]).some(o=>o!==c&&normU(o.unit)===normU(c.unit)&&((pd(o.end)||0)<(s||0)||(pd(o.start)||0)<(s||0)));
  const idx=(p.contracts||[]).filter(o=>normU(o.unit)===normU(c.unit)).sort((a,b)=>(pd(a.start)||0)-(pd(b.start)||0)).indexOf(c)+1;
  const inNo=(p.no?p.no+'-':'')+c.unit+(idx>1?'/'+idx:'');
  const rate=Number(c.vatRate)||0,vatf=Number(S.db.settings.vat)||0,n=v=>fm(v),num=v=>Number(v)||0;
  let pool=num(r.paid),lateG=0;const paidG=num(r.paid),rentT=num(r.total),rentVat=r2(rentT*rate/100),grossT=r2(rentT+rentVat);
  const fee=num(c.fee),feeVat=r2(fee*vatf/100),svc=num(c.svc),dep=num(c.deposit);
  const stT=r.st==='منتهي'?(c.exit?'مُنهى':'منتهٍ'):r.st;
  const now=new Date(),pdt=iso(todayNow())+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const rows=r.inst.map(i=>{const tax=r2(i.amount*rate/100),tot=r2(i.amount+tax),pd_=Math.min(tot,r2(pool));pool=r2(pool-pd_);const rm=i.waived?0:Math.max(0,r2(tot-pd_));if(i.late)lateG=r2(lateG+rm);
    const stl=i.waived?'أُسقط':i.status==='paid'?'مسدد':i.late?'متأخر':i.status==='partial'?'مسدد جزئيًا':'قادم';
    return `<tr><td>${i.n}</td><td>${i.date!=null?iso(i.date):'—'}</td><td>${n(i.amount)}</td><td>${rate?n(tax):'—'}</td><td>${n(tot)}</td><td>${n(pd_)}</td><td>${n(rm)}</td><td class="${i.late?'lt':''}">${stl}</td></tr>`}).join('');
  const sumT=r.inst.length?`<tr class="tt"><td colspan="2">الإجمالي</td><td>${n(rentT)}</td><td>${rate?n(rentVat):'—'}</td><td>${n(grossT)}</td><td>${n(paidG)}</td><td>${n(Math.max(0,r2(grossT-paidG)))}</td><td></td></tr>`:'';
  const cond=String(c.conditions||'').split(/\n+/).map(z=>z.trim()).filter(Boolean);
  const kv=(a,b)=>`<th>${a}</th><td>${b}</td>`;
  return `<div class="doc lease">
<div class="ls-h"><div class="ls-co"><img src="assets/logo.svg" alt="كثيب"><div><b>${esc(CO.name)}</b><small>سجل تجاري ${CO.cr} · ${esc(CO.addr)}</small></div></div>
<div class="ls-t"><h1>عقد إيجار وحدة عقارية</h1><small>ملخص بيانات العقد</small></div>
<table class="ls-m"><tr><th>رقم عقد إيجار</th><td>${cn(c.ejar)}</td></tr><tr><th>الرقم الداخلي</th><td>${esc(inNo)}</td></tr><tr><th>نوع العقد</th><td>${prev?'مجدد':'جديد'}</td></tr><tr><th>حالة العقد</th><td>${esc(stT)}</td></tr><tr><th>تاريخ الطباعة</th><td>${pdt}</td></tr></table></div>
<h2>أولًا: بيانات العقد والعقار</h2>
<table class="ls-g"><tr>${kv('تاريخ إبرام العقد',c.signDate?fs_(c.signDate):'—')}${kv('مدة العقد',r.m?r.m+' شهرًا':cn(c.period))}</tr>
<tr>${kv('بداية الإيجار',fs_(c.start))}${kv('نهاية الإيجار',fs_(c.end))}</tr>
<tr>${kv('فترة السماح',Number(c.grace)>0?esc(c.grace)+' يومًا':'لا توجد')}${kv('رقم الوحدة','<b>'+cn(c.unit)+'</b>')}</tr>
<tr>${kv('المشروع / العقار',cn(p.name))}${kv('نوع الوحدة',cn(u.type))}</tr>
<tr>${kv('المساحة',u.area?esc(u.area)+' م²':'—')}${kv('عدد الغرف',cn(u.rooms))}</tr></table>
<h2>ثانيًا: أطراف العقد</h2>
<div class="ls-p"><table><tr><th colspan="2" class="ph">المؤجر</th></tr><tr><th>الاسم</th><td>${cn(c.owner)}</td></tr><tr><th>الهوية / السجل التجاري</th><td>${cn(own.idno)}</td></tr><tr><th>الرقم الموحد</th><td>${cn(own.unified)}</td></tr><tr><th>رقم الجوال</th><td>${cn(own.phone)}</td></tr></table>
<table><tr><th colspan="2" class="ph">المستأجر</th></tr><tr><th>الاسم / المنشأة</th><td>${cn(c.tenant)}</td></tr><tr><th>الهوية / السجل التجاري</th><td>${cn(ten.idno)}</td></tr><tr><th>الرقم الضريبي</th><td>${cn(ten.tax)}</td></tr><tr><th>رقم الجوال</th><td>${cn(ten.phone)}</td></tr></table></div>
<h2>ثالثًا: البيانات المالية</h2>
<table class="ls-f"><thead><tr><th>البند</th><th>بدون ضريبة</th><th>الضريبة</th><th>الإجمالي</th><th>ملاحظة</th></tr></thead><tbody>
<tr><td>قيمة الإيجار${r.m>12&&S.db.settings.mode==='annual'?' (للمدة كاملة)':''}</td><td>${n(rentT)}</td><td>${rate?n(rentVat)+' ('+rate+'%)':'غير مفروضة'}</td><td>${n(grossT)}</td><td></td></tr>
<tr class="tt"><td>إجمالي قيمة العقد</td><td>${n(rentT)}</td><td>${rate?n(rentVat):'—'}</td><td>${n(grossT)}</td><td></td></tr>
${fee?`<tr><td>رسوم الأملاك</td><td>${n(fee)}</td><td>${n(feeVat)} (${vatf}%)</td><td>${n(fee+feeVat)}</td><td>خارج قيمة الإيجار</td></tr>`:''}
${svc?`<tr><td>رسوم إضافية (مياه / خدمات)</td><td>${n(svc)}</td><td>—</td><td>${n(svc)}</td><td></td></tr>`:''}
${dep?`<tr><td>مبلغ الضمان / التأمين</td><td>${n(dep)}</td><td>—</td><td>${n(dep)}</td><td>مبلغ مسترد، لا يدخل ضمن قيمة الإيجار</td></tr>`:''}
</tbody></table>
<div class="ls-s"><div><span>إجمالي العقد</span><b>${n(grossT)}</b></div><div><span>إجمالي المسدد</span><b>${n(paidG)}</b></div><div><span>إجمالي المتبقي</span><b>${n(Math.max(0,r2(grossT-paidG)))}</b></div><div class="lt"><span>إجمالي المتأخر</span><b>${n(lateG)}</b></div></div>
<h2>رابعًا: جدول سداد الدفعات</h2>
${rows?`<table class="ls-i"><thead><tr><th>القسط</th><th>تاريخ الاستحقاق</th><th>قيمة الإيجار</th><th>الضريبة</th><th>الإجمالي</th><th>المسدد</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody>${rows}${sumT}</tbody></table>`:'<p class="ls-n">لم يكتمل جدول الأقساط (راجع الفترة والتواريخ وعدد الدفعات).</p>'}
<div class="ls-end"><h2>خامسًا: الشروط الخاصة والاعتماد</h2>
<div class="ls-c">${cond.length?'<ul>'+cond.map(z=>'<li>'+esc(z)+'</li>').join('')+'</ul>':'<span>لا توجد شروط خاصة. تسري أحكام عقد منصة «إيجار» الموحد.</span>'}</div>
<div class="ls-sg"><div><b>المؤجر / ممثله</b><small>${esc(c.owner)||''}</small><i>التوقيع والختم</i><em>التاريخ: ____ / ____ / ________</em></div><div><b>المستأجر / ممثله</b><small>${esc(c.tenant)||''}</small><i>التوقيع والختم</i><em>التاريخ: ____ / ____ / ________</em></div></div></div>
<div class="ls-f2">${esc(CO.name)} · ${CO.phone} · ${CO.mail}</div></div>`;
}
