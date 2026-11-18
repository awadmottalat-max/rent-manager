'use strict';
const {pd,iso,edate,r2,normU,calc,renewals,ownerStatements,DAY}=Core;
const {parseWb,applyImp,ensureUnit,buildWorkbook,uid}=Importer;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fm=n=>n==null||n===''||isNaN(n)?'—':Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
const fd=t=>t==null?'—':'<bdi>'+iso(t)+'</bdi>';
const fs_=s=>s?'<bdi>'+esc(s)+'</bdi>':'—';
const todayNow=()=>{const d=new Date();return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())};
let TODAY=todayNow();
window.addEventListener('focus',()=>{const t=todayNow();if(t!==TODAY){TODAY=t;render()}});
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const S={db:{v:1,projects:{},settings:{mode:'total'}},view:'dash',f:{p:'',s:'',q:''},due:{p:'',cs:'',mode:'exp',s:'open',from:'',to:'',m:'',g:'month',q:''},flow:{p:'',cs:'',mode:'exp',s:'all',from:'',to:'',m:'',g:'month',q:''},av:{p:'',q:''},en:{p:'',q:'',s:'pend'},rc:null,ren:{p:'',win:'all90',q:''},ow:{q:''},pr:{q:''},cur:null,ed:null,imp:null,dir:'',pm:null};
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(tt);tt=setTimeout(()=>t.style.display='none',3200)};
function arm(b,fn){if(b.dataset.armed){fn();return}b.dataset.t=b.textContent;b.dataset.armed=1;b.textContent='اضغط للتأكيد';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent=b.dataset.t}},3000)}

/* ---------- التخزين ---------- */
let dirty=false,st=null;
function persist(){dirty=true;clearTimeout(st);st=setTimeout(flush,250)}
async function flush(){if(!dirty)return;dirty=false;try{await native.save(S.db)}catch(e){dirty=true;toast('تعذّر الحفظ على القرص: '+(e.message||e))}}
window.addEventListener('beforeunload',()=>{if(dirty){clearTimeout(st);native.saveSync(S.db);dirty=false}});
const P=()=>S.db.projects;
function mutate(pid,fn){const p=structuredClone(P()[pid]);fn(p);P()[pid]=p;persist();render()}

/* ---------- بيانات مشتقة ---------- */
const MODE=()=>S.db.settings.mode||'total';
function rows(){const o=[];for(const[pid,p]of Object.entries(P()))for(const c of p.contracts||[])o.push({pid,pn:p.name,c,r:calc(c,MODE(),TODAY)});return o}
const key=x=>x.r.late_n?0:x.r.soon?1:2;
const sorted=a=>a.sort((a,b)=>key(a)-key(b)||((a.r.next?.date??9e15)-(b.r.next?.date??9e15))||a.pn.localeCompare(b.pn,'ar')||String(a.c.unit).localeCompare(String(b.c.unit),'ar',{numeric:true}));
const projOpts=(sel,all)=>(all?'<option value="">كل المشاريع</option>':'')+Object.entries(P()).sort((a,b)=>a[1].name.localeCompare(b[1].name,'ar')).map(([k,p])=>`<option value="${esc(k)}"${k===sel?' selected':''}>${esc(p.name)}</option>`).join('');
const pname=id=>P()[id]?.name||'';
const txt=(...a)=>a.join(' ').toLowerCase();
function passC(x){
  const{p,s,q}=S.f,r=x.r;
  if(p&&x.pid!==p)return false;
  if(s==='late'&&!r.late_n)return false;if(s==='soon'&&!r.soon)return false;
  if(s==='active'&&r.st!=='ساري')return false;if(s==='ended'&&r.st!=='منتهي')return false;if(s==='future'&&r.st!=='لم يبدأ')return false;
  if(s==='issues'&&!r.iss.length)return false;if(s==='open'&&!(r.rem>0.005))return false;
  if(q&&!txt(x.c.unit,x.c.tenant,x.c.owner,x.pn,x.c.sap,x.c.ejar).includes(q.toLowerCase()))return false;
  return true;
}
const chip=i=>i.status==='paid'?'<span class="ch ok">مسدد</span>':i.late?'<span class="ch late">متأخر</span>':i.soon?'<span class="ch warn">خلال 30 يومًا</span>':i.status==='partial'?'<span class="ch warn">جزئي</span>':i.date==null?'<span class="ch">بلا تاريخ</span>':'<span class="ch">قادم</span>';
const stChip=x=>{const r=x.r;return r.late_n?`<span class="ch late">متأخر ${r.late_n}</span>`:`<span class="ch ${r.st==='ساري'?'ok':r.st==='منتهي'||r.st==='لم يبدأ'?'':'warn'}">${r.st}</span>`};
const pu=x=>[esc(x.pn),'<b>'+(esc(x.c.unit)||'—')+'</b>'];

/* ---------- جدول موحّد: كل عنوان بنفس محاذاة بياناته ---------- */
/* cols: {h,k:'t'|'n'|'d'|'x'} ; rows: {cls,attrs,span,cells} */
function T(cols,rws,o={}){
  const pr=o.print,cs=pr?cols.filter(c=>c.k!=='ac'):cols,N=cs.length;
  const cell=(c,h,i)=>`<td class="${c.k||''}">${h}</td>`;
  let zi=0;
  const body=rws.map(r=>{
    let cells=r.cells;const grp=(r.cls||'').includes('grp');if(grp)zi=0;const zc=grp?'':(zi++%2?' zb':' zw');const sp=r.span||0;
    if(pr)cells=cells.slice(0,N-(sp?sp-1:0));
    const out=cells.map((h,i)=>sp&&i===0?`<td colspan="${sp}">${h}</td>`:cell(cs[i+(sp?sp-1:0)],h,i)).join('');
    return `<tr class="${(r.cls||'')+zc}"${pr?'':(r.attrs||'')}>${out}</tr>`}).join('');
  const foot=o.foot?`<tfoot><tr>${(pr?o.foot.slice(0,N-(o.footSpan?o.footSpan-1:0)):o.foot).map((h,i)=>o.footSpan&&i===0?`<td colspan="${o.footSpan}">${h}</td>`:`<td class="${cs[i+(o.footSpan?o.footSpan-1:0)]?.k||''}">${h}</td>`).join('')}</tr></tfoot>`:'';
  return `<div class="${pr?'':'tw'}"><table><thead><tr>${cs.map(c=>`<th class="${c.k||''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rws.length?body:`<tr><td colspan="${N}" class="empty">لا توجد بيانات مطابقة.</td></tr>`}</tbody>${foot}</table></div>`;
}
const open_=x=>` data-a="open" data-p="${esc(x.pid)}" data-c="${esc(x.c.id)}"`;

/* ---------- الطباعة بالشعار ---------- */
function docHtml({title,sub,body,land}){
  const now=new Date(),dt=iso(todayNow())+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  return `<div class="doc ${land?'land':''}"><div class="lh"><img src="assets/logo.svg" alt="كثيب"><div class="tt"><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="meta">${dt}</div></div>${body}<div class="pf">Kathib Property &amp; Facilities mng. — ${dt}</div></div>`;
}
async function printArea(html,pdfName){
  const done=()=>{document.body.classList.remove('pr');$('#printarea').innerHTML=''};
  $('#printarea').innerHTML=html;document.body.classList.add('pr');
  if(pdfName){try{const f=await native.pdf(pdfName);if(f)toast('تم الحفظ')}finally{done()}}
  else{window.addEventListener('afterprint',done,{once:true});setTimeout(done,180000);await native.print(html.includes('class="rcv"'))}
}
const safe=s=>String(s).replace(/[\\/:*?"<>|]/g,'_');
const pbtn=k=>`<button class="btn" data-a="print" data-k="${k}">طباعة</button><button class="btn" data-a="pdf" data-k="${k}">حفظ PDF</button>${k==='list'?'<button class="btn" data-a="xlsx">تصدير Excel</button>':''}`;
function listDoc(){const m=S.pm;return docHtml({title:m.title,sub:m.sub,land:true,body:T(m.cols,m.rows,{print:true,foot:m.foot,footSpan:m.footSpan})})}

/* ---------- أيقونات ---------- */
const IC={
dash:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
key:'<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M16 7l3 3M14 9l2 2"/>',
file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
filex:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9.5 12.5l5 5M14.5 12.5l-5 5"/>',
wallet:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
refresh:'<path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15 6.7L21 16"/><path d="M21 21v-5h-5"/>',
building:'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-5h4v5"/>',
users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
sign:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 16c1.5-2.5 2.5-2.5 3 0s1.5 1.5 3.5-1"/>',
calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
chart:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
db:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
const ico=(k,c)=>`<svg class="ic ${c||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]||''}</svg>`;
const NAVIC={dash:'dash',avail:'key',contracts:'file',ended:'filex',due:'wallet',flow:'trend',renew:'refresh',props:'building',owners:'users',tenants:'users',agr:'sign',fin:'calc',rep:'chart',settings:'db'};

/* ---------- التنقل ---------- */
const VIEWS=[['dash','لوحة التحكم'],['avail','الشقق المتاحة'],['contracts','العقود'],['ended','العقود المنتهية'],['due','المستحقات'],['flow','التدفقات النقدية'],['renew','التجديدات'],['props','المشاريع والوحدات'],['owners','الملاك'],['tenants','المستأجرون'],['agr','اتفاقيات التأجير'],['fin','التحليل المالي'],['rep','التقارير'],['settings','البيانات والنسخ الاحتياطي']];
const VF={};
function go(v){S.view=v;render();$('main').scrollTop=0}
function renderNav(all){
  const late=all.filter(x=>x.r.late_n).length,ren=renewals(all,TODAY,90).length;
  const pendN=all.filter(x=>x.r.st==='منتهي'&&endState(x.pid,x.c)==='pend').length;
  const bd={ended:pendN?`<span class="bd">${pendN}</span>`:'',due:late?`<span class="bd">${late}</span>`:'',renew:ren?`<span class="bd">${ren}</span>`:''};
  $('#nav').innerHTML=VIEWS.map(([k,l])=>`<button data-a="go" data-v="${k}" class="${S.view===k?'on':''}">${ico(NAVIC[k])}<span>${l}</span>${bd[k]||''}</button>`).join('');
  $('#sidefoot').innerHTML='التاريخ المعتمد: <bdi>'+iso(TODAY)+'</bdi><br>الإصدار <bdi>'+esc(S.ver||'')+'</bdi> · <button class="link" data-a="chkUpd">التحقق من التحديث</button>';
}
function render(){
  const all=rows();renderNav(all);
  const v=$('#view'),kf=document.activeElement&&document.activeElement.id;
  S.pm=null;
  v.innerHTML=(VF[S.view]||vDash)(all);
  if(kf){const el=document.getElementById(kf);if(el&&el.matches('input[type=search]')){el.focus();const l=el.value.length;try{el.setSelectionRange(l,l)}catch{}}}
  if(S.cur&&$('#det').open)fillDet();
  if(S.view==='settings')native.getIcon().then(u=>{if(u&&$('#iconprev'))$('#iconprev').src=u}).catch(()=>{});
}
Object.assign(VF,{ended:vEnded,dash:vDash,avail:vAvail,contracts:vContracts,due:vDues,flow:vFlow,renew:vRenew,props:vProps,owners:vOwners,settings:vSettings});
const J={
  avail:()=>{S.av={p:'',q:''};go('avail')},
  active:()=>{S.f={p:'',q:'',s:'active'};go('contracts')},ended:()=>{S.en={p:'',q:'',s:'pend'};go('ended')},
  open:()=>{S.f={p:'',q:'',s:'open'};go('contracts')},issues:()=>{S.f={p:'',q:'',s:'issues'};go('contracts')},
  late:()=>{Object.assign(S.due,{p:'',cs:'',mode:'exp',s:'late',from:'',to:'',m:'',g:'month',q:''});go('due')},
  soon:()=>{Object.assign(S.due,{p:'',cs:'',mode:'exp',s:'open',from:iso(TODAY),to:iso(TODAY+30*DAY),m:'',g:'day',q:''});go('due')},
  exp:()=>{Object.assign(S.ren,{p:'',q:'',win:'u90'});go('renew')},endedR:()=>{Object.assign(S.ren,{p:'',q:'',win:'ended'});go('renew')}
};

/* ---------- لوحة التحكم ---------- */
const TOP=8;
function more(j,n,shown){return n>shown?`<button class="link" data-a="jump" data-j="${j}">عرض الكل (${n}) ←</button>`:`<button class="link" data-a="jump" data-j="${j}">فتح التفاصيل ←</button>`}
function secDash(title,j,n,body){return `<div class="sec"><div class="sech"><h3>${title}</h3>${more(j,n,TOP)}</div>${body}</div>`}
const RCOLS=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'بداية الإيجار',k:'d'},{h:'نهاية الإيجار',k:'d'},{h:'الموقف',k:'d'},{h:'إجمالي العقد',k:'n'},{h:'المتبقي',k:'n'}];
const rRow=x=>({attrs:open_(x),cells:[...pu(x),esc(x.c.owner)||'—',esc(x.c.tenant)||'—',fs_(x.c.start),fs_(x.c.end),x.days<0?`<span class="ch late">انتهى منذ ${-x.days} يوم</span>`:`<span class="ch warn">بعد ${x.days} يوم</span>`,fm(x.r.total),fm(x.r.rem>0?x.r.rem:0)]});
function vDash(all){
  const late=sum(all,x=>x.r.late),soon=sum(all,x=>sum(x.r.inst.filter(i=>i.soon),i=>i.due));
  const rn=renewals(all,TODAY,90),exp=rn.filter(x=>x.days>=0),endd=rn.filter(x=>x.days<0).sort((a,b)=>b.endT-a.endT);
  const endedAll=all.filter(x=>x.r.st==='منتهي').length;
  const KI={active:'file',avail:'key',ended:'filex',open:'wallet',late:'alert',soon:'clock',exp:'refresh',issues:'alert'};
  const kp=(cls,j,l,v,i)=>`<button class="kp ${cls}" data-a="jump" data-j="${j}"><em class="kic">${ico(KI[j])}</em><span>${l}</span><b>${v}</b><i>${i}</i></button>`;
  const US=unitsSummary();
  const byP=Object.entries(P()).map(([pid,p])=>{const rs=all.filter(x=>x.pid===pid);return{n:p.name,tot:sum(rs,x=>x.r.total||0),paid:sum(rs,x=>x.r.paid||0),rem:sum(rs,x=>x.r.rem>0?x.r.rem:0),late:sum(rs,x=>x.r.late)}}).sort((a,b)=>b.tot-a.tot);
  const maxT=Math.max(1,...byP.map(x=>x.tot));
  const lateList=all.filter(x=>x.r.late_n).sort((a,b)=>b.r.late-a.r.late);
  const upc=[];for(const x of all)for(const i of x.r.inst)if(i.soon)upc.push({x,i});upc.sort((a,b)=>a.i.date-b.i.date);
  const lateT=T([{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'أقدم استحقاق متأخر',k:'d'},{h:'الأقساط المتأخرة',k:'d'},{h:'المبلغ المتأخر',k:'n'},{h:'المتبقي الكلي',k:'n'}],
    lateList.slice(0,TOP).map(x=>({cls:'late',attrs:open_(x),cells:[...pu(x),esc(x.c.owner)||'—',esc(x.c.tenant)||'—',fd(x.r.inst.find(i=>i.late)?.date),x.r.late_n,'<b>'+fm(x.r.late)+'</b>',fm(x.r.rem)]})));
  const upT=T([{h:'تاريخ الاستحقاق',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'القسط',k:'d'},{h:'المبلغ',k:'n'}],
    upc.slice(0,TOP).map(({x,i})=>({attrs:open_(x),cells:[fd(i.date),...pu(x),esc(x.c.owner)||'—',esc(x.c.tenant)||'—',i.n+' / '+x.r.k,'<b>'+fm(i.due)+'</b>']})));
  const hr=new Date().getHours(),TT=sum(all,x=>x.r.total||0),PP=sum(all,x=>x.r.paid||0);
  return `<div class="hero"><div class="hl"><small>${hr<12?'صباح الخير':'مساء الخير'}</small><h1>لوحة التحكم</h1><p>${all.length} عقدًا في ${Object.keys(P()).length} مشاريع — اضغط على أي بطاقة أو «عرض الكل» لفتح التفاصيل.</p></div><div class="hk"><div><span>إجمالي قيمة العقود</span><b>${fm(TT)}</b></div><div><span>المحصَّل</span><b>${fm(PP)}</b></div><div><span>نسبة التحصيل</span><b>${TT?Math.round(PP/TT*100):0}%</b></div></div></div>
<div class="kpis">
${kp('','active','عقود سارية',all.filter(x=>x.r.st==='ساري').length,'من '+all.length)}
${kp('g','avail','شقق متاحة للإيجار',US.reduce((a,x)=>a+x.avail,0),'من '+US.reduce((a,x)=>a+x.total,0)+' وحدة')}
${kp('','ended','عقود منتهية',endedAll,'بانتظار القرار: '+all.filter(x=>x.r.st==='منتهي'&&endState(x.pid,x.c)==='pend').length)}
${kp('','open','إجمالي المتبقي',fm(sum(all,x=>x.r.rem>0?x.r.rem:0)),'على العقود المكتملة البيانات')}
${kp('l','late','متأخر',fm(late),all.filter(x=>x.r.late_n).length+' عقدًا')}
${kp('','soon','يستحق خلال 30 يومًا',fm(soon),all.filter(x=>x.r.soon).length+' عقدًا')}
${kp('','exp','تنتهي خلال 90 يومًا',exp.length,'تحتاج متابعة التجديد')}
${kp('','issues','بيانات ناقصة',all.filter(x=>x.r.iss.length).length,'تحتاج استكمالًا')}
</div>
<div class="sec"><div class="sech"><h3>الشقق المتاحة للإيجار حسب المشروع</h3><button class="link" data-a="jump" data-j="avail">عرض الكل ←</button></div>${T([{h:'المشروع',k:'t'},{h:'إجمالي الوحدات',k:'n'},{h:'مؤجرة',k:'n'},{h:'متاحة للإيجار',k:'n'},{h:'منتهية بانتظار القرار',k:'n'},{h:'غير متاحة',k:'n'},{h:'الإشغال',k:'n'}],
  US.map(m=>({attrs:` data-a="availProj" data-p="${esc(m.pid)}"`,cells:['<b>'+esc(m.name)+'</b>',m.total,m.rented,'<b style="color:var(--acc)">'+m.avail+'</b>',m.pend,m.unavail,m.total?Math.round(m.rented/m.total*100)+'%':'—']})),
  {foot:['الإجمالي',sum(US,m=>m.total),sum(US,m=>m.rented),sum(US,m=>m.avail),sum(US,m=>m.pend),sum(US,m=>m.unavail),''],})}</div>
${secDash('أكبر المتأخرات','late',lateList.length,lateList.length?lateT:'<div class="card empty">لا توجد متأخرات.</div>')}
${secDash('أقساط الـ 30 يومًا القادمة','soon',upc.length,upc.length?upT:'<div class="card empty">لا أقساط قادمة.</div>')}
${secDash('عقود تنتهي خلال 90 يومًا','exp',exp.length,exp.length?T(RCOLS,exp.slice(0,TOP).map(rRow)):'<div class="card empty">لا عقود تنتهي قريبًا.</div>')}
${secDash('العقود المنتهية (بلا تجديد)','endedR',endd.length,endd.length?T(RCOLS,endd.slice(0,TOP).map(rRow)):'<div class="card empty">لا توجد عقود منتهية بلا تجديد.</div>')}
<div class="card"><h3>التحصيل حسب المشروع</h3>${byP.length?byP.map(p=>`<div class="pr-row"><div class="t"><b>${esc(p.n)}</b><span class="num">${fm(p.paid)} / ${fm(p.tot)}</span></div><div class="pb"><i style="width:${p.tot?Math.min(100,p.paid/p.tot*100):0}%"></i></div><small>المتبقي <bdi>${fm(p.rem)}</bdi>${p.late?' · متأخر <bdi>'+fm(p.late)+'</bdi>':''}</small></div>`).join(''):'<p class="empty">لا توجد بيانات. استورد ملف Excel من «البيانات والنسخ الاحتياطي».</p>'}</div>`;
}

/* ---------- العقود ---------- */
const CCOLS=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'بداية الإيجار',k:'d'},{h:'نهاية الإيجار',k:'d'},{h:'إجمالي العقد',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'القسط القادم',k:'d'},{h:'الحالة',k:'t'}];
const SLAB={'':'كل الحالات',late:'متأخرة',soon:'تستحق خلال 30 يومًا',open:'عليها متبقٍ',active:'سارية',ended:'منتهية',future:'لم تبدأ',issues:'بياناتها ناقصة'};
function vContracts(all){
  const list=sorted(all.filter(passC));
  const rws=list.map(x=>{const{c,r}=x;return{cls:r.late_n?'late':r.soon?'soon':'',attrs:open_(x),cells:[...pu(x),esc(c.owner)||'—',esc(c.tenant)||'—',fs_(c.start),fs_(c.end),fm(r.total),fm(r.paid),'<b>'+fm(r.rem)+'</b>',r.next?fd(r.next.date)+'<small class="num">'+fm(r.next.due)+'</small>':'—',stChip(x)+endBtns(x)+(r.iss.length?` <span class="ch warn" title="${esc(r.iss.join('، '))}">ناقص</span>`:'')]}});
    S.pm={title:'قائمة العقود',sub:'المشروع: '+(S.f.p?esc(pname(S.f.p)):'الكل')+' — الحالة: '+SLAB[S.f.s]+(S.f.q?' — بحث: '+esc(S.f.q):''),cols:CCOLS,rows:rws};
  S.pm.foot=[list.length+' عقدًا','','','','','',fm(sum(list,x=>x.r.total||0)),fm(sum(list,x=>x.r.paid||0)),fm(sum(list,x=>x.r.rem>0?x.r.rem:0)),'',''];S.pm.footSpan=0;
  return `<h1>العقود</h1><p class="sub">انقر على أي عقد لعرض ملفه الكامل وأقساطه ودفعاته. يُخصَّص المسدد للأقساط الأقدم أولًا.</p>
<div class="bar"><select id="fp" aria-label="المشروع">${projOpts(S.f.p,true)}</select>
<select id="fs" aria-label="الحالة">${Object.entries(SLAB).map(([v,l])=>`<option value="${v}"${S.f.s===v?' selected':''}>${l}</option>`).join('')}</select>
<input type="search" id="fq" placeholder="بحث: وحدة، مستأجر، مالك" value="${esc(S.f.q)}" aria-label="بحث">
<button class="btn p" data-a="new">+ عقد جديد</button>${pbtn('list')}<button class="btn" data-a="csv">تصدير CSV</button></div>
${T(CCOLS,rws,{foot:S.pm.foot})}`;
}
const endBtns=x=>{if(x.r.st!=='منتهي')return'';const e=endState(x.pid,x.c);
  if(e==='renewed')return' <span class="ch ok">مجدد</span>';if(e==='term')return' <span class="ch">انتهى الإيجار</span>';
  return `<span class="eb"><button class="btn sm p" data-a="endRenew" data-p="${esc(x.pid)}" data-c="${esc(x.c.id)}">تجديد</button><button class="btn sm dng" data-a="endExit" data-p="${esc(x.pid)}" data-c="${esc(x.c.id)}">إنهاء</button></span>`};
const cur=()=>{const p=P()[S.cur?.pid];const c=p?.contracts.find(c=>c.id===S.cur.cid);return c?{pid:S.cur.pid,pn:p.name,c,r:calc(c,MODE(),TODAY)}:null};
function infoGrid(x){
  const{c,r}=x,i=(l,v)=>`<div><span>${l}</span><b>${v||'—'}</b></div>`;
  return `<div class="info">${i('المشروع',esc(x.pn))}${i('رقم الوحدة',esc(c.unit))}${i('المالك',esc(c.owner))}${i('المستأجر',esc(c.tenant))}${i('بداية الإيجار',fs_(c.start))}${i('نهاية الإيجار',fs_(c.end))}
${i('مدة العقد',r.m?r.m+' شهرًا':esc(c.period))}${i('قيمة الإيجار المسجلة',fm(c.rent))}${i('عدد الأقساط',r.k?r.k+' قسطًا':esc(c.count))}${i('رسوم الأملاك',fm(c.fee))}${c.ejar?i('رقم عقد إيجار',esc(c.ejar)):''}${c.sap?i('رقم ساب SAP',esc(c.sap)):''}${i('المتبقي المسجل قبل التعديل',fm(c.prevRemaining))}${i('الحالة',r.late_n?'متأخر ('+r.late_n+' قسط)':r.st)}</div>`;
}
function instTable(x,print){
  const r=x.r;
  return T([{h:'#',k:'d'},{h:'الاستحقاق',k:'d'},{h:'المبلغ',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'الحالة',k:'t'}],
    r.inst.map(i=>({cls:i.late?'late':i.soon?'soon':'',cells:[i.n,fd(i.date),fm(i.amount),fm(i.paid),fm(i.status==='paid'?0:i.due),chip(i)]})),{print});
}
function payTable(c,print,del){
  const ps=[...(c.payments||[])].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  return T([{h:'سند',k:'d'},{h:'تاريخ التحصيل',k:'d'},{h:'المبلغ',k:'n'},{h:'استحقاق من',k:'d'},{h:'استحقاق إلى',k:'d'},{h:'ساب',k:'t'},{h:'ملاحظة',k:'t'},...(del?[{h:'',k:'ac'}]:[])],ps.map(p=>({cells:[p.rno?String(p.rno).padStart(5,'0'):'—',p.date?fs_(p.date):'غير محدد',fm(p.amount),fs_(p.from),fs_(p.to),esc(p.sap)||'—',esc([p.method,p.note].filter(Boolean).join(' — '))||'—',...(del?[(p.rno?`<button class="btn sm" data-a="rcOne" data-i="${esc(p.id)}">سند</button> `:`<button class="btn sm" data-a="rcOne" data-i="${esc(p.id)}">سند</button> `)+`<button class="btn dng sm" data-a="delPay" data-i="${esc(p.id)}">حذف</button>`]:[])]})),{print,foot:['','الإجمالي',fm(sum(ps,p=>+p.amount||0)+(+c.extra||0)),'','','',+c.extra?'يشمل سداد إضافي '+fm(c.extra):'',...(del?['']:[])]});
}
function fillDet(){
  const x=cur();if(!x){$('#det').close();return}
  const{c,r,pn}=x;
  $('#det').innerHTML=`<div class="dh"><div><h2>الوحدة ${esc(c.unit)||'—'} <small style="display:inline">— ${esc(pn)}</small></h2><p>المستأجر: ${esc(c.tenant)||'—'} · المالك: ${esc(c.owner)||'—'}</p></div><button class="x" data-a="close" aria-label="إغلاق">✕</button></div>
<div class="db"><div class="sum"><div><span>إجمالي العقد</span><b>${fm(r.total)}</b></div><div><span>المسدد</span><b>${fm(r.paid)}</b></div>
<div><span>المتبقي</span><b>${fm(r.rem)}</b></div><div><span>المتأخر</span><b>${fm(r.late)}</b></div><div><span>الأقساط</span><b>${r.k?r.k+' × '+fm(r.M):'—'}</b></div></div>
${r.iss.length?'<p class="warnbox">يلزم استكمال: '+r.iss.map(esc).join('، ')+'</p>':''}
<div class="acts"><button class="btn" data-a="edit">تعديل بيانات العقد</button><button class="btn" data-a="renewC">تجديد العقد</button>${r.st==='منتهي'&&endState(x.pid,c)==='pend'?`<button class="btn dng" data-a="endExit" data-p="${esc(x.pid)}" data-c="${esc(c.id)}">انتهاء الإيجار (خروج المستأجر)</button>`:''}${c.exit?`<button class="btn" data-a="endUndo" data-p="${esc(x.pid)}" data-c="${esc(c.id)}">إلغاء الإنهاء</button>`:''}<button class="btn p" data-a="print" data-k="contract">طباعة ملف العقد</button><button class="btn" data-a="pdf" data-k="contract">حفظ PDF</button><button class="btn dng" data-a="delC">حذف العقد</button></div>
<h3>بيانات العقد</h3>${infoGrid(x)}${c.notes?`<p style="margin:6px 0;font-size:13.5px"><b>ملاحظات:</b> ${esc(c.notes)}</p>`:''}
${(c.oldDates||[]).length?`<small>تواريخ مسجلة سابقًا: ${c.oldDates.map(d=>'<bdi>'+esc(d)+'</bdi>').join('، ')}</small>`:''}
<h3>جدول الأقساط</h3>${r.inst.length?instTable(x):'<p class="empty">يظهر الجدول بعد استكمال القيمة والتواريخ وعدد الأقساط.</p>'}
<h3>الدفعات المسجلة</h3>
<div class="acts"><button class="btn p" data-a="addPay" data-v="${r.next?r.next.due:''}">+ تسجيل دفعة</button></div>
${(c.payments||[]).length||+c.extra?payTable(c,false,true):'<div class="tw"><p class="empty">لا توجد دفعات مسجلة.</p></div>'}</div>`;
}
function openDet(pid,cid){S.cur={pid,cid};fillDet();if(!$('#det').open)$('#det').showModal()}
function contractDoc(x){
  const{c,r}=x;
  return docHtml({title:'ملف عقد إيجار — الوحدة '+esc(c.unit),sub:esc(x.pn)+' · المستأجر: '+esc(c.tenant),body:
  `<h3>بيانات العقد</h3>${infoGrid(x)}
  <h3>الملخص المالي</h3><div class="sum"><div><span>إجمالي العقد</span><b>${fm(r.total)}</b></div><div><span>المسدد</span><b>${fm(r.paid)}</b></div><div><span>المتبقي</span><b>${fm(r.rem)}</b></div><div><span>المتأخر</span><b>${fm(r.late)}</b></div></div>
  ${r.inst.length?`<h3>جدول الأقساط</h3>${instTable(x,true)}`:''}
  <h3>سجل الدفعات</h3>${(c.payments||[]).length||+c.extra?payTable(c,true,false):'<p>لا توجد دفعات مسجلة.</p>'}
  ${c.notes?`<h3>ملاحظات</h3><p>${esc(c.notes)}</p>`:''}
  ${r.iss.length?`<h3>بيانات ناقصة</h3><p>${r.iss.map(esc).join('، ')}</p>`:''}
  <div class="sign"><div>المالك / ممثله</div><div>المستأجر</div><div>إدارة الأملاك</div></div>`});
}

/* ---------- نموذج عام ---------- */
function formDlg({title,fields,vals={},save,onSave}){
  const fl=f=>{const v=vals[f.k]??f.def??'';let el;
    if(f.t==='select')el=`<select id="ff_${f.k}">${f.opts.map(([a,b])=>`<option value="${esc(a)}"${String(a)===String(v)?' selected':''}>${esc(b)}</option>`).join('')}</select>`;
    else if(f.t==='area')el=`<textarea id="ff_${f.k}" rows="2">${esc(v)}</textarea>`;
    else el=`<input id="ff_${f.k}" type="${f.t||'text'}" ${f.t==='number'?'step="0.01"':''} value="${esc(v)}" ${f.ph?`placeholder="${esc(f.ph)}"`:''}>`;
    return `<label class="${f.full?'full':''}">${f.l}${el}</label>`};
  $('#frm').innerHTML=`<div class="dh"><h2>${title}</h2><button class="x" data-a="fclose" aria-label="إغلاق">✕</button></div><div class="fg">${fields.map(fl).join('')}</div><div class="ft"><button class="btn p" id="fsave">${save||'حفظ'}</button><button class="btn" data-a="fclose">إلغاء</button></div>`;
  $('#fsave').onclick=()=>{const o={};for(const f of fields)o[f.k]=document.getElementById('ff_'+f.k).value.trim();
    document.querySelectorAll('#frm .bad').forEach(e=>e.classList.remove('bad'));
    const err=onSave(o);if(err){toast(err);const m=fields.find(f=>err.includes(f.l.replace(/[ *].*$/,'').slice(0,6)));const el=document.getElementById('ff_'+(m?.k||fields[0].k));if(el){el.classList.add('bad');el.focus()}}else $('#frm').close()};
  $('#frm').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('#fsave')?.click()}};
  if(!$('#frm').open)$('#frm').showModal();
  setTimeout(()=>{const f=$('#frm .fg input:not([type=hidden]),#frm .fg select');if(f&&!f.value)f.focus()},60);
}
const numOk=s=>s===''||!isNaN(Number(s));
function renewForm(pid,c){
  const m=Core.months(c)||12,s=c.end?iso(pd(c.end)+DAY):iso(TODAY);
  contractForm(false,{pid,unit:c.unit,tenant:c.tenant,owner:c.owner,fee:c.fee,rent:c.rent,count:c.count,start:s,end:iso(edate(pd(s),m)-DAY),period:c.period,notes:''});
}
function payForm(pid,cid,amount){
  const c=P()[pid]?.contracts.find(c=>c.id===cid);if(!c)return;
  const nx=(c.payments||[]).filter(p=>p.to).map(p=>p.to).sort().pop(),from0=nx?iso(pd(nx)+DAY):(c.start||'');
  formDlg({title:'تسجيل دفعة — '+esc(c.unit)+' / '+esc(c.tenant),save:'تسجيل الدفعة',vals:{date:iso(TODAY),amount:amount||'',from:from0,to:''},
    fields:[{k:'date',l:'تاريخ التحصيل',t:'date'},{k:'amount',l:'المبلغ',t:'number'},{k:'from',l:'استحقاق الدفعة من',t:'date'},{k:'to',l:'استحقاق الدفعة إلى',t:'date'},
      {k:'method',l:'طريقة الدفع',t:'select',opts:[['','—'],['نقدًا','نقدًا'],['حوالة بنكية','حوالة بنكية'],['شيك','شيك'],['شبكة','شبكة / بطاقة'],['منصة إيجار','منصة إيجار']]},{k:'note',l:'رقم الحوالة / ملاحظة'},{k:'sap',l:'رقم قيد ساب SAP (اختياري)'}],
    onSave:o=>{const a=+o.amount;if(!(a>0))return 'أدخل مبلغًا صحيحًا';if(!o.date)return 'أدخل تاريخ التحصيل';
      if(o.from&&o.to&&o.to<o.from)return 'نهاية فترة الاستحقاق قبل بدايتها';
      const rno=S.db.settings.nextReceipt||1;S.db.settings.nextReceipt=rno+1;
      const id='i'+uid();mutate(pid,p=>p.contracts.find(c=>c.id===cid).payments.push({id,date:o.date,amount:a,from:o.from,to:o.to,method:o.method,note:o.note,sap:o.sap,rno}));
      toast('تم تسجيل الدفعة — سند القبض رقم '+rno);setTimeout(()=>askReceipt(pid,cid,id),120)}});
}
const quickPay=payForm;
function askReceipt(pid,cid,payId){
  S.rc={pid,cid,payId};
  $('#frm').innerHTML=`<div class="dh"><h2>تم تسجيل الدفعة</h2><button class="x" data-a="fclose" aria-label="إغلاق">✕</button></div><p style="padding:6px 4px">هل تريد طباعة سند القبض الآن؟</p><div class="ft"><button class="btn p" data-a="rcPrint">طباعة سند القبض</button><button class="btn" data-a="rcPdf">حفظ PDF</button><button class="btn" data-a="fclose">لاحقًا</button></div>`;
  if(!$('#frm').open)$('#frm').showModal();
}
const CO={name:'شركة كثيب للاستثمار',addr:'الرياض - حي القيروان - ص.ب 911 الرياض 11322',vat:'311175458400003',cr:'1010773989',phone:'+966 53 0900 930',mail:'info@kathib.com.sa'};
function hijriStr(isoD){
  const t=pd(isoD);if(t==null)return'';
  try{const o={};for(const x of new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).formatToParts(new Date(t)))o[x.type]=x.value;return o.day+' / '+o.month+' / '+String(o.year).replace(/\D/g,'')}catch{return''}
}
function receiptDoc(pid,cid,payId){
  const p=P()[pid],c=p?.contracts.find(c=>c.id===cid),pm=c?.payments.find(x=>x.id===payId);if(!pm)return null;
  const r=calc(c,MODE(),TODAY),full=r.total!=null&&(+pm.amount)>=r.total-0.01;
  const rno=pm.rno?String(pm.rno).padStart(5,'0'):'',g=String(pm.date||'').split('-'),gd=g.length===3?[g[2],g[1],g[0]]:['','',''];
  const hj=hijriStr(pm.date).split(' / ');
  const forTxt=(full?'إيجار شقة ':'دفعة من إيجار شقة ')+(c.unit||'')+' مشروع '+(p.name||'');
  const m=pm.method||'نقدًا';
  const how=esc(m)+(pm.note?' — '+esc(pm.note):'')+(pm.sap?'':'');
  const html=`<div class="rcv"><div class="rcv-in">
<div class="rc-top">
<div class="rc-amt"><div class="bx"><b>${fm(pm.amount)}</b><span>ريال</span></div>${rno?`<div class="rno">سند رقم <bdi>${rno}</bdi></div>`:''}</div>
<div class="rc-logo"><img src="assets/logo.svg" alt="كثيب"><h2>سـنـد قبض <small>Receipt Voucher</small></h2></div>
<div class="rc-dates"><div class="bx"><span>التاريخ</span><b class="dd"><i>${esc(hj[0]||'')}</i> / <i>${esc(hj[1]||'')}</i> / <i>${esc(hj[2]||'')}</i> هـ</b></div><div class="bx"><b class="dd"><i>${gd[0]}</i> / <i>${gd[1]}</i> / <i>${gd[2]}</i></b><span class="en">Date</span></div></div></div>
<div class="rl"><span class="lb">استلمت من</span><span class="ln hw">${esc(c.tenant)||''}</span><span class="en">Received from /</span></div>
<div class="rl"><span class="lb">مبلغ وقدره</span><span class="ln box hw">${esc(Fin.tafqeet(pm.amount))}</span><span class="en">The Sum of</span></div>
<div class="rl"><span class="lb">نقدًا / تحويل / شيك رقم</span><span class="ln hw">${how}</span><span class="en">cash/cheque</span><span class="lb">على بنك</span><span class="ln s"></span><span class="en">Bank</span><span class="lb">تاريخ</span><span class="ln s"></span><span class="en">Date</span></div>
<div class="rl"><span class="lb">وذلك مقابل</span><span class="ln hw">${esc(forTxt)}</span><span class="en">For</span></div>
<div class="rl"><span class="ln"></span></div>
<div class="rc-sign"><div><span>المدير <i>Manager</i></span><u></u></div><div><span>المحاسب <i>Accountant</i></span><u></u></div><div><span>المستلم <i>Receiver</i></span><u></u></div></div>
<div class="rc-foot"><div>المقر الرئيسي: ${esc(CO.name)}<br>${esc(CO.addr)}</div><div>رقم ضريبة القيمة المضافة:<br><bdi>${CO.vat}</bdi></div><div>س.ت: <bdi>${CO.cr}</bdi><br><bdi>${CO.phone}</bdi></div><div class="em"><bdi>${CO.mail}</bdi></div></div>
</div></div>`;
  return{html,name:'receipt-'+(rno||'x')+'.pdf'};
}

/* ---------- المستحقات والتدفقات النقدية ---------- */
const mEnd=m=>{const[y,mo]=m.split('-').map(Number);return iso(Date.UTC(y,mo,0))};
function dueList(all,D){
  D=D||S.due;const from=pd(D.from),to=pd(D.to),q=D.q.toLowerCase(),L=[];
  const inR=t=>(from==null||(t!=null&&t>=from))&&(to==null||(t!=null&&t<=to));
  for(const x of all){
    if(D.p&&x.pid!==D.p)continue;
    if(D.cs==='active'&&x.r.st!=='ساري')continue;if(D.cs==='ended'&&x.r.st!=='منتهي')continue;if(D.cs==='future'&&x.r.st!=='لم يبدأ')continue;
    if(q&&!txt(x.c.unit,x.c.tenant,x.c.owner,x.pn).includes(q))continue;
    if(D.mode==='act'){
      for(const pm of x.c.payments||[]){const t=pd(pm.date);if(t==null&&(from!=null||to!=null))continue;if(inR(t))L.push({x,t,pm,amount:+pm.amount||0,paid:+pm.amount||0,due:0,note:pm.note,n:''})}
    }else{
      for(const i of x.r.inst){
        const ok=D.s==='late'?i.late:D.s==='open'?i.status!=='paid':D.s==='paid'?i.status==='paid':true;
        if(ok&&inR(i.date))L.push({x,i,t:i.date,amount:i.amount,paid:i.paid,due:i.status==='paid'?0:i.due,n:i.n+' / '+x.r.k})
      }
    }
  }
  L.sort((a,b)=>(a.t??9e15)-(b.t??9e15)||a.x.pn.localeCompare(b.x.pn,'ar')||String(a.x.c.unit).localeCompare(String(b.x.c.unit),'ar',{numeric:true}));return L;
}
const DS_LAB={late:'أقساط متأخرة',open:'كل غير المسدد',paid:'المسددة',all:'كل الأقساط'},DCS_LAB={'':'كل حالات العقد',active:'عقود سارية',ended:'عقود منتهية',future:'لم تبدأ'};
function dueModel(all,D){
  D=D||S.due;const L=dueList(all,D),act=D.mode==='act';
  const cols=act?[{h:'تاريخ التحصيل',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'المبلغ',k:'n'},{h:'استحقاق من',k:'d'},{h:'استحقاق إلى',k:'d'},{h:'سند',k:'d'},{h:'ملاحظة',k:'t'}]
   :[{h:'الاستحقاق',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'القسط',k:'d'},{h:'مبلغ القسط',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'الحالة',k:'t'},{h:'',k:'ac'}];
  const gk=o=>o.t==null?'بلا تاريخ':D.g==='month'?iso(o.t).slice(0,7):D.g==='day'?iso(o.t):'';
  const rws=[],lim=D.print?1e9:800;let last=null,gi=null,shown=0;const G=[];
  const lineRow=o=>{const x=o.x,u=`<td></td>`;
    return act?{attrs:open_(x),cells:[o.t==null?'بلا تاريخ':fd(o.t),...pu(x),esc(x.c.owner)||'—',esc(x.c.tenant)||'—','<b>'+fm(o.amount)+'</b>',fs_(o.pm.from),fs_(o.pm.to),o.pm.rno?String(o.pm.rno).padStart(5,'0'):'—',esc(o.note)||'—']}
    :{cls:o.i.late?'late':o.i.soon?'soon':'',attrs:open_(x),cells:[fd(o.t),...pu(x),esc(x.c.owner)||'—',esc(x.c.tenant)||'—',o.n,fm(o.amount),fm(o.paid),'<b>'+fm(o.due)+'</b>',chip(o.i),o.i.status!=='paid'?`<button class="btn sm p" data-a="qpay" data-p="${esc(x.pid)}" data-c="${esc(x.c.id)}" data-v="${o.due}">دفعة</button>`:'']}};
  if(D.g!=='none'){for(const o of L){const k=gk(o);if(k!==last){gi={k,n:0,amount:0,paid:0,due:0};G.push(gi);last=k}gi.n++;gi.amount+=o.amount;gi.paid+=o.paid;gi.due+=o.due}
    let idx=-1;last=null;
    for(const o of L){if(shown>=lim)break;const k=gk(o);if(k!==last){idx++;const g=G[idx];last=k;
      rws.push({cls:'grp',span:5,cells:[`${D.g==='month'?'شهر':'يوم'} <bdi>${g.k}</bdi> — ${g.n} بندًا`,...(act?[fm(g.amount),'','','','']:['',fm(g.amount),fm(g.paid),fm(g.due),'',''])]})}
      rws.push(lineRow(o));shown++}
  }else for(const o of L){if(shown>=lim)break;rws.push(lineRow(o));shown++}
  const lab='الإجمالي ('+L.length+' بندًا)',foot=act?[lab,fm(sum(L,o=>o.amount)),'','','','']:[lab,'',fm(sum(L,o=>o.amount)),fm(sum(L,o=>o.paid)),fm(sum(L,o=>o.due)),'',''];
  const period=D.from||D.to?' — الفترة: '+(D.from||'…')+' إلى '+(D.to||'…'):'';
  return{L,cols,rows:rws,foot,footSpan:5,title:D===S.flow?(act?'تقرير التدفقات النقدية — المحصَّل فعليًا':'تقرير التدفقات النقدية — المتوقع'):'تقرير المستحقات',sub:(D.p?'المشروع: '+esc(pname(D.p))+' — ':'')+(DCS_LAB[D.cs])+(act?'':' — '+DS_LAB[D.s])+period,truncated:shown<L.length};
}
const selH=(id,arr,v)=>`<select id="${id}">${arr.map(([a,b])=>`<option value="${a}"${String(v)===String(a)?' selected':''}>${b}</option>`).join('')}</select>`;
const rangeBar=(sc,D,extra)=>`<div class="bar"><label>الشهر <input type="month" id="${sc}_m" value="${esc(D.m)}"></label>
<label>من <input type="date" id="${sc}_from" value="${esc(D.from)}"></label><label>إلى <input type="date" id="${sc}_to" value="${esc(D.to)}"></label>
${selH(sc+'_g',[['month','تجميع شهري'],['day','تجميع يومي'],['none','بدون تجميع']],D.g)}
<button class="btn" data-a="dueClear" data-d="${sc}">مسح التاريخ</button>${pbtn('list')}<button class="btn" data-a="dueCsv" data-d="${sc}">تصدير CSV</button>${extra||''}</div>`;
function vDues(all){
  const D=S.due;D.mode='exp';const m=dueModel(all,D),L=m.L;S.pm={...m};
  return `<h1>المستحقات</h1><p class="sub">الأقساط المستحقة على المستأجرين حسب تاريخ الاستحقاق، مع المشروع والوحدة والمالك والمستأجر لكل سطر. زر «دفعة» يقيّد السداد ويطبع سند القبض.</p>
<div class="bar"><select id="due_p">${projOpts(D.p,true)}</select>${selH('due_cs',Object.entries(DCS_LAB),D.cs)}${selH('due_s',Object.entries(DS_LAB),D.s)}
<input type="search" id="due_q" placeholder="بحث: وحدة، مستأجر، مالك" value="${esc(D.q)}"></div>${rangeBar('due',D)}
<div class="kpis"><div class="kp static"><span>عدد الأقساط</span><b>${L.length}</b></div><div class="kp static"><span>إجمالي الأقساط</span><b>${fm(sum(L,o=>o.amount))}</b></div>
<div class="kp static"><span>المسدد منها</span><b>${fm(sum(L,o=>o.paid))}</b></div><div class="kp l static"><span>المستحق غير المسدد</span><b>${fm(sum(L,o=>o.due))}</b></div></div>
${T(m.cols,m.rows,{foot:m.foot,footSpan:m.footSpan})}${m.truncated?'<p class="sub" style="margin-top:8px">يُعرض أول 800 بند فقط؛ الإجماليات تشمل الكل. ضيّق الفترة أو استخدم الطباعة/CSV للكل.</p>':''}`;
}
function flowSummary(all,D){
  const from=pd(D.from),to=pd(D.to),q=D.q.toLowerCase(),M={};
  const inR=t=>t!=null&&(from==null||t>=from)&&(to==null||t<=to);
  const key=t=>D.g==='day'?iso(t):iso(t).slice(0,7);
  const g_=k=>M[k]=M[k]||{k,exp:0,col:0};
  for(const x of all){
    if(D.p&&x.pid!==D.p)continue;
    if(D.cs==='active'&&x.r.st!=='ساري')continue;if(D.cs==='ended'&&x.r.st!=='منتهي')continue;if(D.cs==='future'&&x.r.st!=='لم يبدأ')continue;
    if(q&&!txt(x.c.unit,x.c.tenant,x.c.owner,x.pn).includes(q))continue;
    for(const i of x.r.inst)if(inR(i.date))g_(key(i.date)).exp+=i.amount;
    for(const pm of x.c.payments||[]){const t=pd(pm.collected||pm.date);if(inR(t))g_(key(t)).col+=+pm.amount||0}
  }
  return Object.values(M).sort((a,b)=>a.k.localeCompare(b.k));
}
function vFlow(all){
  const D=S.flow;if(D.g==='none')D.g='month';
  const m=dueModel(all,D),act=D.mode==='act',FS=flowSummary(all,D);S.pm={...m};
  const tE=sum(FS,g=>g.exp),tC=sum(FS,g=>g.col);
  const sumRows=FS.map(g=>({cells:['<b><bdi>'+g.k+'</bdi></b>',fm(g.exp),fm(g.col),fm(g.col-g.exp)]}));
  return `<h1>التدفقات النقدية</h1><p class="sub">المتوقع حسب تاريخ استحقاق الأقساط مقابل المحصَّل فعليًا حسب تاريخ التحصيل، لكل شهر أو يوم.</p>
<div class="bar"><select id="fl_p">${projOpts(D.p,true)}</select>${selH('fl_cs',Object.entries(DCS_LAB),D.cs)}
${selH('fl_mode',[['exp','تفاصيل المتوقع (الأقساط)'],['act','تفاصيل المحصَّل فعليًا (الدفعات)']],D.mode)}${act?'':selH('fl_s',Object.entries(DS_LAB),D.s)}
<input type="search" id="fl_q" placeholder="بحث: وحدة، مستأجر، مالك" value="${esc(D.q)}"></div>${rangeBar('fl',D)}
<div class="kpis"><div class="kp static"><span>المتوقع في الفترة</span><b>${fm(tE)}</b></div><div class="kp static"><span>المحصَّل فعليًا</span><b>${fm(tC)}</b></div><div class="kp ${tC<tE?'l':''} static"><span>الفرق</span><b>${fm(tC-tE)}</b></div></div>
<h3>ملخص الفترات</h3>${T([{h:D.g==='day'?'اليوم':'الشهر',k:'d'},{h:'المتوقع',k:'n'},{h:'المحصَّل فعليًا',k:'n'},{h:'الفرق',k:'n'}],sumRows,{foot:['الإجمالي',fm(tE),fm(tC),fm(tC-tE)]})}
<h3>${act?'تفاصيل المحصَّل فعليًا':'تفاصيل المتوقع'}</h3>${T(m.cols,m.rows,{foot:m.foot,footSpan:m.footSpan})}${m.truncated?'<p class="sub" style="margin-top:8px">يُعرض أول 800 بند فقط؛ الإجماليات تشمل الكل.</p>':''}`;
}

/* ---------- العقود المنتهية ---------- */
const EN_LAB={all:'كل المنتهية',pend:'بانتظار القرار',renewed:'مجددة',term:'انتهى الإيجار (خروج المستأجر)'};
function exitForm(pid,cid){
  const c=P()[pid]?.contracts.find(c=>c.id===cid);if(!c)return;
  formDlg({title:'انتهاء الإيجار — '+esc(c.unit)+' / '+esc(c.tenant),save:'تأكيد انتهاء الإيجار',vals:{date:c.end||iso(TODAY),note:''},
    fields:[{k:'date',l:'تاريخ خروج المستأجر',t:'date'},{k:'reason',l:'السبب',t:'select',opts:[['','—'],['انتهاء المدة وعدم الرغبة بالتجديد','انتهاء المدة وعدم الرغبة بالتجديد'],['رغبة المالك','رغبة المالك'],['إخلاء لعدم السداد','إخلاء لعدم السداد'],['أخرى','أخرى']]},{k:'note',l:'ملاحظات',t:'area',full:1}],
    onSave:o=>{if(!o.date)return 'أدخل تاريخ الخروج';mutate(pid,p=>{p.contracts.find(x=>x.id===cid).exit={date:o.date,reason:o.reason,note:o.note}});toast('انتهى الإيجار — الوحدة '+c.unit+' صارت متاحة للإيجار')}});
}
function endedList(all){
  const E=S.en,q=E.q.toLowerCase();
  return all.filter(x=>x.r.st==='منتهي'&&(!E.p||x.pid===E.p)&&(!q||txt(x.c.unit,x.c.tenant,x.c.owner,x.pn).includes(q))).map(x=>({...x,es:endState(x.pid,x.c)})).filter(x=>E.s==='all'||x.es===E.s)
    .sort((a,b)=>(pd(b.c.end)||0)-(pd(a.c.end)||0));
}
function vEnded(all){
  const E=S.en,L=endedList(all),cnt=k=>all.filter(x=>x.r.st==='منتهي'&&endState(x.pid,x.c)===k).length;
  const cols=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'بداية',k:'d'},{h:'نهاية',k:'d'},{h:'منذ (يوم)',k:'n'},{h:'المتبقي',k:'n'},{h:'الحالة',k:'t'},{h:'الإجراء',k:'ac'}];
  const rws=L.map(x=>({attrs:open_(x),cells:[...pu(x),esc(x.c.owner)||'—',esc(x.c.tenant)||'—',fs_(x.c.start),fs_(x.c.end),Math.max(0,Math.round((TODAY-(pd(x.c.end)||TODAY))/DAY)),fm(x.r.rem>0?x.r.rem:0),
    x.es==='pend'?'<span class="ch warn">بانتظار القرار</span>':x.es==='renewed'?'<span class="ch ok">مجدد</span>':'<span class="ch">انتهى الإيجار'+(x.c.exit.date?' · '+fs_(x.c.exit.date):'')+'</span>',
    x.es==='pend'?endBtns(x):x.es==='term'?`<button class="btn sm" data-a="endUndo" data-p="${esc(x.pid)}" data-c="${esc(x.c.id)}">تراجع</button>`:'']}));
  const pc=cols.filter(c=>c.k!=='ac');
  S.pm={title:'العقود المنتهية',sub:'الحالة: '+EN_LAB[E.s]+(E.p?' — المشروع: '+esc(pname(E.p)):''),cols:pc,rows:rws.map(r=>({...r,cells:r.cells.slice(0,pc.length)})),foot:[L.length+' عقدًا','','','','','','',fm(sum(L,x=>x.r.rem>0?x.r.rem:0)),'']};
  return `<h1>العقود المنتهية</h1><p class="sub">لكل عقد منتهٍ قرار واحد: <b>تجديد العقد</b> (يُنشأ عقد جديد مملوء من القديم)، أو <b>انتهاء الإيجار</b> (خروج المستأجر) فتتحول الوحدة إلى «الشقق المتاحة للإيجار». ما دام القرار معلّقًا لا تُحسب الوحدة متاحة.</p>
<div class="bar"><select id="en_p">${projOpts(E.p,true)}</select><select id="en_s">${Object.entries(EN_LAB).map(([v,l])=>`<option value="${v}"${E.s===v?' selected':''}>${l}</option>`).join('')}</select><input type="search" id="en_q" placeholder="بحث: وحدة، مستأجر، مالك" value="${esc(E.q)}">${pbtn('list')}</div>
<div class="kpis"><div class="kp static"><span>بانتظار القرار</span><b>${cnt('pend')}</b></div><div class="kp static"><span>مجددة</span><b>${cnt('renewed')}</b></div><div class="kp static"><span>انتهى الإيجار</span><b>${cnt('term')}</b></div></div>
${T(cols,rws,{foot:S.pm.foot.concat([''])})}`;
}

/* ---------- التجديدات ---------- */
const RW=[['all90','منتهية + تنتهي خلال 90 يومًا'],['ended','المنتهية فقط'],['u30','تنتهي خلال 30 يومًا'],['u60','تنتهي خلال 60 يومًا'],['u90','تنتهي خلال 90 يومًا'],['u180','تنتهي خلال 180 يومًا']];
function renList(all){
  const R=S.ren,w=R.win,days=w==='ended'?0:w==='all90'?90:+w.slice(1);
  return renewals(all,TODAY,days).filter(x=>(w==='ended'?x.days<0:w[0]==='u'?x.days>=0:true)&&(!R.p||x.pid===R.p)&&(!R.q||txt(x.c.unit,x.c.tenant,x.c.owner,x.pn).includes(R.q.toLowerCase())));
}
function vRenew(all){
  const R=S.ren,list=renList(all);
  const cols=[...RCOLS,{h:'',k:'ac'}];
  const rws=list.map(x=>{const r=rRow(x);r.cls=x.days<0?'':'soon';r.cells.push(`<button class="btn sm p" data-a="renewQ" data-p="${esc(x.pid)}" data-c="${esc(x.c.id)}">تجديد</button>`);return r});
  S.pm={title:'تقرير التجديدات',sub:(R.p?'المشروع: '+esc(pname(R.p))+' — ':'')+RW.find(o=>o[0]===R.win)[1],cols,rows:rws};
  return `<h1>التجديدات</h1><p class="sub">آخر عقد لكل وحدة، إذا انتهى أو سينتهي ولا يوجد عقد أحدث لنفس الوحدة.</p>
<div class="bar"><select id="rp">${projOpts(R.p,true)}</select>
<select id="rw">${RW.map(([v,l])=>`<option value="${v}"${R.win===v?' selected':''}>${l}</option>`).join('')}</select>
<input type="search" id="rq" placeholder="بحث: وحدة، مستأجر، مالك" value="${esc(R.q)}">${pbtn('list')}</div>
${T(cols,rws)}`;
}

/* ---------- المشاريع والوحدات ---------- */
function endState(pid,c){
  if(c.exit)return'term';
  const e=pd(c.end),k=normU(c.unit);
  if(e!=null&&k&&(P()[pid].contracts||[]).some(o=>o!==c&&normU(o.unit)===k&&(pd(o.end)||0)>e))return'renewed';
  return'pend';
}
function unitInfo(p,u){
  const pid=Object.keys(P()).find(k=>P()[k]===p),k=normU(u.no),cs=(p.contracts||[]).filter(c=>normU(c.unit)===k).map(c=>({c,r:calc(c,MODE(),TODAY)}));
  const act=cs.find(o=>o.r.st==='ساري')||cs.find(o=>o.r.st==='لم يبدأ');
  const last=[...cs].sort((a,b)=>(pd(b.c.end)||0)-(pd(a.c.end)||0))[0];
  let st='avail';
  if(act)st='rented';else if(u.avail==='no')st='unavail';
  else if(last&&last.r.st==='منتهي'&&endState(pid,last.c)==='pend')st='pend';
  return{st,act,last};
}
function unitsSummary(){
  return Object.entries(P()).map(([pid,p])=>{let t=0,r=0,a=0,n=0,w=0;for(const u of p.units||[]){t++;const i=unitInfo(p,u).st;if(i==='rented')r++;else if(i==='avail')a++;else if(i==='pend')w++;else n++}return{pid,name:p.name,total:t,rented:r,avail:a,unavail:n,pend:w}}).sort((x,y)=>y.avail-x.avail||x.name.localeCompare(y.name,'ar'));
}
function availList(){
  const A=S.av,q=A.q.toLowerCase(),L=[];
  for(const[pid,p]of Object.entries(P())){if(A.p&&pid!==A.p)continue;
    for(const u of p.units||[]){const i=unitInfo(p,u);if(i.st!=='avail')continue;
      if(q&&!txt(u.no,u.owner,u.type,p.name).includes(q))continue;L.push({pid,p,u,i})}}
  return L.sort((a,b)=>a.p.name.localeCompare(b.p.name,'ar')||String(a.u.no).localeCompare(String(b.u.no),'ar',{numeric:true}));
}
function vAvail(){
  const L=availList(),sm=unitsSummary().filter(x=>!S.av.p||x.pid===S.av.p);
  const cols=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'النوع',k:'t'},{h:'المساحة',k:'t'},{h:'الغرف',k:'d'},{h:'الإيجار المطلوب',k:'n'},{h:'آخر مستأجر',k:'t'},{h:'انتهى العقد',k:'d'},{h:'شاغرة منذ',k:'d'},{h:'',k:'ac'}];
  const rws=L.map(o=>{const l=o.i.last,e=l?pd(l.c.end):null,days=e!=null&&e<TODAY?Math.round((TODAY-e)/DAY):null;
    return{cells:['<b>'+esc(o.p.name)+'</b>','<b>'+esc(o.u.no)+'</b>',esc(o.u.owner)||'—',esc(o.u.type)||'—',esc(o.u.area)||'—',esc(o.u.rooms)||'—',o.u.askRent?fm(o.u.askRent):'—',l?esc(l.c.tenant)||'—':'لم تؤجَّر بعد',l?fs_(l.c.end):'—',days!=null?days+' يوم':'—',
      `<button class="btn sm p" data-a="rentUnit" data-p="${esc(o.pid)}" data-i="${esc(o.u.id)}">تأجير</button> <button class="btn sm" data-a="editUnit2" data-p="${esc(o.pid)}" data-i="${esc(o.u.id)}">تعديل</button>`]}});
  S.pm={title:'الشقق المتاحة للإيجار',sub:S.av.p?'المشروع: '+esc(pname(S.av.p)):'كل المشاريع',cols,rows:rws,foot:['الإجمالي: '+L.length+' وحدة','','','','','','','','','',''],footSpan:0};
  return `<h1>الشقق المتاحة للإيجار</h1><p class="sub">الوحدة المتاحة هي التي لا عقد ساريًا أو قادمًا لها، وانتهى إيجارها رسميًا (من صفحة العقود المنتهية) أو لم تؤجَّر بعد. الوحدة ذات العقد المنتهي لا تُحسب متاحة حتى تختار «انتهاء الإيجار». «تأجير» يفتح عقدًا جديدًا مملوءًا ببيانات الوحدة.</p>
<div class="bar"><select id="av_p">${projOpts(S.av.p,true)}</select><input type="search" id="av_q" placeholder="بحث: وحدة، مالك، نوع" value="${esc(S.av.q)}">${pbtn('list')}<button class="btn" data-a="availCsv">تصدير CSV</button></div>
<div class="kpis"><div class="kp static"><span>متاحة للإيجار</span><b>${L.length}</b></div><div class="kp static"><span>مؤجرة</span><b>${sum(sm,x=>x.rented)}</b></div><div class="kp static"><span>منتهية بانتظار القرار</span><b>${sum(sm,x=>x.pend)}</b></div><div class="kp static"><span>غير متاحة</span><b>${sum(sm,x=>x.unavail)}</b></div><div class="kp static"><span>إجمالي الوحدات</span><b>${sum(sm,x=>x.total)}</b></div></div>
${T(cols,rws,{foot:S.pm.foot})}`;
}
const propsTabs=()=>`<div class="tabs"><button data-a="prTab" data-t="proj" class="${S.pr.tab!=='units'?'on':''}">المشاريع</button><button data-a="prTab" data-t="units" class="${S.pr.tab==='units'?'on':''}">الوحدات (بفلاتر)</button></div>`;
function vUnitsTab(){
  const F=S.pr,q=(F.uq||'').toLowerCase(),ST={rented:'مؤجرة',avail:'متاحة للإيجار',pend:'منتهية بانتظار القرار',unavail:'غير متاحة'};
  const all=[];for(const[pid,p]of Object.entries(P()))for(const u of p.units||[])all.push({pid,p,u,i:unitInfo(p,u)});
  const owners=[...new Set(all.map(o=>o.u.owner).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')),types=[...new Set(all.map(o=>o.u.type).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const L=all.filter(o=>(!F.up||o.pid===F.up)&&(!F.us||o.i.st===F.us)&&(!F.uo||o.u.owner===F.uo)&&(!F.ut||o.u.type===F.ut)&&(!q||txt(o.u.no,o.u.owner,o.u.type,o.p.name,o.i.act?.c.tenant).includes(q)))
    .sort((a,b)=>a.p.name.localeCompare(b.p.name,'ar')||String(a.u.no).localeCompare(String(b.u.no),'ar',{numeric:true}));
  const cols=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'النوع',k:'t'},{h:'المساحة',k:'t'},{h:'الغرف',k:'d'},{h:'الإيجار المطلوب',k:'n'},{h:'الحالة',k:'t'},{h:'المستأجر الحالي',k:'t'},{h:'نهاية العقد',k:'d'}];
  const rws=L.map(o=>({attrs:` data-a="projOpen" data-p="${esc(o.pid)}"`,cells:['<b>'+esc(o.p.name)+'</b>','<b>'+esc(o.u.no)+'</b>',esc(o.u.owner)||'—',esc(o.u.type)||'—',esc(o.u.area)||'—',esc(o.u.rooms)||'—',o.u.askRent?fm(o.u.askRent):'—',`<span class="ch ${o.i.st==='rented'?'ok':o.i.st==='avail'?'':'warn'}">${ST[o.i.st]}</span>`,o.i.act?esc(o.i.act.c.tenant)||'—':'—',o.i.act?fs_(o.i.act.c.end):'—']}));
  S.pm={title:'سجل الوحدات',sub:'عدد الوحدات: '+L.length,cols,rows:rws,foot:['الإجمالي: '+L.length,'','','','','','','','','']};
  const o_=(v,arr)=>'<option value="">الكل</option>'+arr.map(x=>`<option${x===v?' selected':''}>${esc(x)}</option>`).join('');
  return `<h1>المشاريع والوحدات</h1><p class="sub">كل الوحدات المرفوعة بكل المشاريع مع فلاتر الحالة والمالك والنوع والمشروع.</p>${propsTabs()}
<div class="bar"><select id="pu_p">${projOpts(F.up,true)}</select><select id="pu_s"><option value="">كل الحالات</option>${Object.entries(ST).map(([k,l])=>`<option value="${k}"${F.us===k?' selected':''}>${l}</option>`).join('')}</select><select id="pu_o" title="المالك">${o_(F.uo,owners).replace('الكل','كل الملاك')}</select><select id="pu_t" title="النوع">${o_(F.ut,types).replace('الكل','كل الأنواع')}</select>
<input type="search" id="pu_q" placeholder="بحث: وحدة، مالك، مستأجر" value="${esc(F.uq||'')}">${pbtn('list')}<button class="btn" data-a="pu_clear">مسح الفلاتر</button></div>
<div class="kpis">${Object.entries(ST).map(([k,l])=>`<div class="kp static"><span>${l}</span><b>${L.filter(o=>o.i.st===k).length}</b></div>`).join('')}<div class="kp static"><span>المعروض</span><b>${L.length}</b></div></div>${T(cols,rws,{foot:S.pm.foot})}`;
}
function vProps(all){
  if(S.pr.tab==='units')return vUnitsTab();
  const q=S.pr.q.toLowerCase(),sm=Object.fromEntries(unitsSummary().map(x=>[x.pid,x]));
  const list=Object.entries(P()).filter(([,p])=>!q||txt(p.name,p.no,p.address).includes(q)).sort((a,b)=>a[1].name.localeCompare(b[1].name,'ar')).map(([pid,p])=>{
    const rs=all.filter(x=>x.pid===pid),m=sm[pid];
    return{pid,p,units:m.total,occ:m.rented,av:m.avail,pd:m.pend,un:m.unavail,act:rs.filter(x=>x.r.st==='ساري').length,tot:sum(rs,x=>x.r.total||0),rem:sum(rs,x=>x.r.rem>0?x.r.rem:0),late:sum(rs,x=>x.r.late)}});
  const cols=[{h:'المشروع',k:'t'},{h:'رقم المشروع',k:'d'},{h:'الوحدات',k:'n'},{h:'مؤجرة',k:'n'},{h:'متاحة',k:'n'},{h:'بانتظار القرار',k:'n'},{h:'غير متاحة',k:'n'},{h:'الإشغال',k:'n'},{h:'عقود سارية',k:'n'},{h:'إجمالي العقود',k:'n'},{h:'المتبقي',k:'n'},{h:'المتأخر',k:'n'}];
  const rws=list.map(o=>({attrs:` data-a="projOpen" data-p="${esc(o.pid)}"`,cells:['<b>'+esc(o.p.name)+'</b>'+(o.p.address?`<small>${esc(o.p.address)}</small>`:''),esc(o.p.no)||'—',o.units,o.occ,'<b>'+o.av+'</b>',o.pd,o.un,o.units?Math.round(o.occ/o.units*100)+'%':'—',o.act,fm(o.tot),fm(o.rem),o.late?fm(o.late):'—']}));
  const foot=['الإجمالي ('+list.length+')','',sum(list,o=>o.units),sum(list,o=>o.occ),sum(list,o=>o.av),sum(list,o=>o.pd),sum(list,o=>o.un),'',sum(list,o=>o.act),fm(sum(list,o=>o.tot)),fm(sum(list,o=>o.rem)),fm(sum(list,o=>o.late))];
  S.pm={title:'تقرير المشاريع والوحدات',sub:'حالة الإشغال والوحدات المتاحة والتحصيل',cols,rows:rws,foot};
  return `<h1>المشاريع والوحدات</h1><p class="sub">سجل الأملاك: المشاريع ووحداتها وحالة الإشغال. تُضاف الوحدات تلقائيًا من العقود، ويمكنك إضافة وحدات متاحة يدويًا.</p>${propsTabs()}
<div class="bar"><button class="btn p" data-a="newProj">+ مشروع جديد</button><input type="search" id="pq" placeholder="بحث باسم المشروع" value="${esc(S.pr.q)}">${pbtn('list')}</div>${T(cols,rws,{foot})}`;
}
function projUnits(pid,print){
  const p=P()[pid],us=[...(p.units||[])].sort((a,b)=>String(a.no).localeCompare(String(b.no),'ar',{numeric:true}));
  return T([{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'النوع',k:'t'},{h:'المساحة',k:'t'},{h:'الغرف',k:'d'},{h:'الإيجار المطلوب',k:'n'},{h:'الحالة',k:'t'},{h:'المستأجر الحالي',k:'t'},{h:'نهاية العقد',k:'d'},{h:'',k:'ac'}],
    us.map(u=>{const i=unitInfo(p,u);return{cells:['<b>'+esc(u.no)+'</b>',esc(u.owner)||'—',esc(u.type)||'—',esc(u.area)||'—',esc(u.rooms)||'—',u.askRent?fm(u.askRent):'—',i.st==='rented'?'<span class="ch ok">مؤجرة</span>':i.st==='pend'?'<span class="ch warn">منتهية — بانتظار القرار</span>':i.st==='unavail'?'<span class="ch warn">غير متاحة</span>'+(u.availNote?`<small>${esc(u.availNote)}</small>`:''):'<span class="ch">متاحة للإيجار</span>',i.act?esc(i.act.c.tenant):'—',i.act?fs_(i.act.c.end):'—',`${i.st==='avail'?`<button class="btn sm p" data-a="rentUnit" data-p="${esc(pid)}" data-i="${esc(u.id)}">تأجير</button> `:''}<button class="btn sm" data-a="editUnit" data-i="${esc(u.id)}">تعديل</button> <button class="btn sm dng" data-a="delUnit" data-i="${esc(u.id)}">حذف</button>`]}}),{print});
}
function projDlg(pid){
  S.pj=pid;const p=P()[pid];if(!p){$('#stm').close();return}
  $('#stm').innerHTML=`<div class="dh"><div><h2>${esc(p.name)}</h2><p>${esc(p.address||'')} ${p.notes?'· '+esc(p.notes):''}</p></div><button class="x" data-a="sclose" aria-label="إغلاق">✕</button></div>
<div class="db"><div class="acts"><button class="btn p" data-a="newUnit">+ وحدة</button><button class="btn" data-a="editProj">تعديل المشروع</button>${pbtn('proj')}<button class="btn dng" data-a="delProj">حذف المشروع وكل عقوده</button></div>${projUnits(pid)}</div>`;
  if(!$('#stm').open)$('#stm').showModal();
}
function projForm(pid){
  const p=pid?P()[pid]:{};
  formDlg({title:pid?'تعديل المشروع':'مشروع جديد',vals:p,fields:[{k:'name',l:'اسم المشروع'},{k:'no',l:'رقم المشروع'},{k:'address',l:'الموقع / العنوان',full:1},{k:'notes',l:'ملاحظات',t:'area',full:1}],
    onSave:o=>{if(!o.name)return 'أدخل اسم المشروع';
      if(Object.entries(P()).some(([k,q])=>k!==pid&&q.name===o.name))return 'يوجد مشروع بنفس الاسم';
      if(pid)mutate(pid,q=>Object.assign(q,{name:o.name,no:o.no,address:o.address,notes:o.notes}));
      else{const id='p'+uid();P()[id]={name:o.name,no:o.no,address:o.address,notes:o.notes,contracts:[],units:[]};persist();render()}
      if(pid&&$('#stm').open)projDlg(pid)}});
}
function unitForm(pid,uid_){
  const p=P()[pid],u=uid_?p.units.find(u=>u.id===uid_):{avail:'auto'};
  formDlg({title:uid_?'تعديل الوحدة':'وحدة جديدة',vals:u,fields:[{k:'no',l:'رقم الوحدة'},{k:'owner',l:'المالك'},{k:'type',l:'النوع (شقة، فيلا، معرض…)'},{k:'area',l:'المساحة'},{k:'rooms',l:'عدد الغرف'},{k:'askRent',l:'الإيجار المطلوب (سنويًا)',t:'number'},
    {k:'avail',l:'الإتاحة للإيجار',t:'select',opts:[['auto','تلقائي: متاحة إن لم يكن لها عقد ساري'],['no','غير متاحة (صيانة، محجوزة، مباعة…)']],def:'auto'},{k:'availNote',l:'سبب عدم الإتاحة'},{k:'notes',l:'ملاحظات',t:'area',full:1}],
    onSave:o=>{if(!o.no)return 'أدخل رقم الوحدة';if(!numOk(o.askRent))return 'الإيجار المطلوب غير صحيح';
      if((p.units||[]).some(x=>x.id!==uid_&&normU(x.no)===normU(o.no)))return 'الوحدة موجودة مسبقًا';
      o.askRent=o.askRent===''?'':Number(o.askRent);
      mutate(pid,q=>{q.units=q.units||[];if(uid_)Object.assign(q.units.find(x=>x.id===uid_),o);else q.units.push({id:'u'+uid(),...o})});if($('#stm').open)projDlg(pid)}});
}

/* ---------- الملاك ---------- */
function vOwners(all){
  const q=S.ow.q.toLowerCase(),list=ownerStatements(all).filter(o=>!q||o.name.toLowerCase().includes(q));
  const cols=[{h:'المالك',k:'t'},{h:'المشاريع',k:'t'},{h:'وحدات',k:'n'},{h:'عقود',k:'n'},{h:'إجمالي الإيجار',k:'n'},{h:'المحصَّل',k:'n'},{h:'المتبقي',k:'n'},{h:'المتأخر',k:'n'},{h:'رسوم الأملاك',k:'n'},{h:'صافي المحصَّل',k:'n'}];
  const rws=list.map(o=>({attrs:` data-a="ownOpen" data-n="${esc(o.name)}"`,cells:['<b>'+esc(o.name)+'</b>',esc(o.projects.join('، ')),o.units,o.contracts,fm(o.total),fm(o.paid),fm(o.rem),o.late?fm(o.late):'—',fm(o.fees),'<b>'+fm(o.net)+'</b>']}));
  const foot=['الإجمالي ('+list.length+' مالكًا)','','','',fm(sum(list,o=>o.total)),fm(sum(list,o=>o.paid)),fm(sum(list,o=>o.rem)),fm(sum(list,o=>o.late)),fm(sum(list,o=>o.fees)),fm(sum(list,o=>o.net))];
  S.pm={title:'تقرير الملاك',sub:'المحصَّل ورسوم الأملاك وصافي المحصَّل لكل مالك',cols,rows:rws,foot,footSpan:0};
  return `<h1>الملاك</h1><p class="sub">كشف حساب لكل مالك: المحصَّل من الإيجارات ناقصًا رسوم الأملاك. انقر على المالك لعرض الكشف وطباعته.</p>
<div class="bar"><input type="search" id="oq" placeholder="بحث باسم المالك" value="${esc(S.ow.q)}">${pbtn('list')}</div>${T(cols,rws,{foot})}`;
}
const ownerRows=name=>rows().filter(x=>(String(x.c.owner||'').trim()||'(بدون مالك)')===name).sort((a,b)=>a.pn.localeCompare(b.pn,'ar')||String(a.c.unit).localeCompare(String(b.c.unit),'ar',{numeric:true}));
function ownerBody(name,print){
  const all=ownerRows(name),o=ownerStatements(all)[0]||{total:0,paid:0,rem:0,late:0,fees:0,net:0};
  return `<div class="sum"><div><span>إجمالي الإيجار</span><b>${fm(o.total)}</b></div><div><span>المحصَّل</span><b>${fm(o.paid)}</b></div><div><span>المتبقي</span><b>${fm(o.rem)}</b></div><div><span>المتأخر</span><b>${fm(o.late)}</b></div><div><span>رسوم الأملاك</span><b>${fm(o.fees)}</b></div><div><span>صافي المحصَّل</span><b>${fm(o.net)}</b></div></div>
<h3>عقود المالك</h3>${T([{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'بداية الإيجار',k:'d'},{h:'نهاية الإيجار',k:'d'},{h:'الإجمالي',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'الرسوم',k:'n'}],
  all.map(x=>({attrs:'',cells:[esc(x.pn),'<b>'+esc(x.c.unit)+'</b>',esc(x.c.tenant)||'—',fs_(x.c.start),fs_(x.c.end),fm(x.r.total),fm(x.r.paid),fm(x.r.rem),fm(x.c.fee)]})),{print,foot:['الإجمالي','','','','',fm(sum(all,x=>x.r.total||0)),fm(sum(all,x=>x.r.paid||0)),fm(sum(all,x=>x.r.rem>0?x.r.rem:0)),fm(sum(all,x=>+x.c.fee||0))],footSpan:0})}`;
}
function ownerDlg(name){
  S.on=name;
  $('#stm').innerHTML=`<div class="dh"><div><h2>${esc(name)}</h2><p>كشف حساب مالك</p></div><button class="x" data-a="sclose" aria-label="إغلاق">✕</button></div><div class="db"><div class="acts">${pbtn('owner')}<button class="btn" data-a="xlsOwner">تصدير Excel</button></div>${ownerBody(name)}</div>`;
  if(!$('#stm').open)$('#stm').showModal();
}

/* ---------- الإعدادات ---------- */
function vSettings(){
  return `<h1>البيانات والنسخ الاحتياطي</h1><p class="sub">تُحفظ البيانات تلقائيًا بعد كل تعديل داخل التطبيق على هذا الجهاز.</p>
<div class="set">
<div class="card"><h3>استيراد وتصدير Excel</h3><p>الاستيراد يقبل «قالب الاستيراد» الفارغ (المشروع والوحدة في عمودين منفصلين) أو ورقة «ورقه المعالجة» المعتمدة. التصدير ينتج ملفًا بنفس التخطيط مع ورقة «الدفعات» ليعود الاستيراد دقيقًا.</p>
<div class="row"><button class="btn p" data-a="imp">استيراد من Excel</button><button class="btn" data-a="expX">تصدير كل العقود (Excel)</button><button class="btn" data-a="tpl">تنزيل قالب الاستيراد الفارغ</button></div></div>
<div class="card"><h3>طريقة احتساب العقود التي تزيد مدتها عن سنة</h3><div class="row"><label>قيمة الإيجار تمثل <select id="mode"><option value="total"${MODE()==='total'?' selected':''}>إجمالي قيمة العقد</option><option value="annual"${MODE()==='annual'?' selected':''}>إيجار سنة واحدة</option></select></label></div></div>
<div class="card"><h3>الإعدادات المالية</h3><div class="row"><label>ضريبة القيمة المضافة % <input type="number" id="set_vat" step="0.01" value="${esc(S.db.settings.vat)}" style="width:90px"></label><label>اسم المشغّل <input id="set_op" value="${esc(S.db.settings.operator)}" style="min-width:260px"></label></div></div>
<div class="card"><h3>النسخ الاحتياطي</h3><p>تؤخذ نسخة تلقائية كل 6 ساعات عند الحفظ، ونسخة قبل كل استيراد أو استعادة.</p>
<div class="row"><button class="btn p" data-a="bkNow">نسخة احتياطية الآن</button><button class="btn" data-a="bkList">استعادة من نسخة سابقة</button></div><div id="bklist"></div></div>
<div class="card"><h3>أيقونة التطبيق (سطح المكتب وشريط المهام)</h3><p>الأيقونة الافتراضية هي شعار كثيب. يمكنك رفع صورة أخرى (PNG أو JPG، يفضَّل مربعة وبحجم 256 بكسل فأكثر). قد يحتاج ويندوز لبضع ثوانٍ أو لإعادة تحميل سطح المكتب (F5) ليُظهر الأيقونة الجديدة.</p>
<div class="row"><img id="iconprev" alt="" style="width:56px;height:56px;border:1px solid var(--line);border-radius:10px;object-fit:contain;background:#fff" src="assets/logo.svg"><button class="btn p" data-a="icoSet">رفع صورة الأيقونة…</button><button class="btn" data-a="icoReset">استعادة شعار كثيب</button></div></div>
<div class="card"><h3>إصدار التطبيق</h3><p>الإصدار الحالي: <b class="num">${esc(S.ver||'')}</b> — يتحقق التطبيق من التحديثات تلقائيًا عند التشغيل.</p><div class="row"><button class="btn" data-a="chkUpd">التحقق من التحديثات الآن</button></div></div>
<div class="card"><h3>موقع التخزين</h3><p class="num" id="dirp" style="direction:ltr;text-align:end">${esc(S.dir)}</p><div class="row"><button class="btn" data-a="openDir">فتح المجلد</button><button class="btn" data-a="chDir">تغيير المجلد (مثلًا OneDrive أو مجلد مشترك)</button></div></div>
</div>`;
}

/* ---------- الاستيراد ---------- */
function impStats(){
  const I=S.imp;if(!I)return'';const m=$('#imode').value;let hit=0;
  if(m==='merge'){hit=applyImp(P(),I,'merge').stats.updated}
  return 'الورقة المقروءة: «'+esc(I.sn)+'». عدد العقود: '+I.n+' في '+Object.keys(I.P).length+' مشاريع.'+(I.authN?' (ملف مُصدَّر من التطبيق: الدفعات بتواريخها ستُستعاد).':'')+(m==='merge'?' سيُحدَّث '+hit+' عقدًا مطابقًا وتُضاف '+(I.n-hit)+' عقدًا جديدًا. الدفعات المسجلة داخل التطبيق بتواريخها تبقى ولا تتكرر.':' ستُحذف عقود المشاريع الحالية ويُستبدل بها محتوى الملف.');
}
function openImp(){
  S.imp=null;
  $('#imp').innerHTML=`<div class="dh"><h2>استيراد من ملف Excel</h2><button class="x" data-a="iclose" aria-label="إغلاق">✕</button></div>
<div class="fg"><div class="full"><p style="margin:0 0 8px;color:var(--mut);font-size:13.5px">اختر ملفًا بنفس تنسيق ورقة «ورقه المعالجة» والعقود في الصفوف.</p><button class="btn" data-a="ipick">اختيار ملف…</button> <span id="iname"></span></div>
<label class="full">طريقة الاستيراد<select id="imode"><option value="merge">دمج: تحديث العقود المطابقة (الوحدة + المستأجر + البداية) وإضافة الجديد</option><option value="replace">استبدال كل بيانات العقود الحالية</option></select></label>
<div class="full" id="ipv" style="font-size:13.5px"></div></div>
<div class="ft"><button class="btn p" id="iapply" data-a="iapply" disabled>تطبيق الاستيراد</button><button class="btn" data-a="iclose">إلغاء</button></div>`;
  $('#imode').onchange=()=>{$('#ipv').innerHTML=impStats()};
  $('#imp').showModal();
}
async function pickImp(){
  const f=await native.openFile([{name:'Excel',extensions:['xlsx','xlsm','xls']}]);if(!f)return;
  try{S.imp=parseWb(XLSX,XLSX.read(f.bytes,{type:'array'}))}catch(x){S.imp=null;toast('تعذّرت قراءة الملف')}
  $('#iname').textContent=f.name;
  $('#ipv').innerHTML=S.imp&&S.imp.n?impStats():'<span class="warnbox" style="display:block">لم أجد عقودًا في الملف. تأكد أن الأعمدة بنفس ترتيب ورقة المعالجة.</span>';
  $('#iapply').disabled=!(S.imp&&S.imp.n);
}
async function applyBtn(b){
  const mode=$('#imode').value;
  const run=async()=>{
    await flush();await native.backupPre('import');
    const{next,stats}=applyImp(P(),S.imp,mode);
    S.db.projects=next;S.imp=null;persist();$('#imp').close();render();
    toast('تم الاستيراد: '+(mode==='merge'?stats.updated+' محدَّث، '+stats.added+' جديد':stats.added+' عقدًا'));
  };
  mode==='replace'?arm(b,run):run();
}

/* ---------- التصدير ---------- */
const csvq=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
async function saveText(name,txt){const f=await native.saveFile(name,new TextEncoder().encode('﻿'+txt));if(f)toast('تم الحفظ')}
async function saveWb(name,wb){const b=XLSX.write(wb,{type:'array',bookType:'xlsx'});const f=await native.saveFile(name,new Uint8Array(b));if(f)toast('تم الحفظ')}
function contractsCsv(){
  const h=['المشروع','الوحدة','المالك','المستأجر','بداية الإيجار','نهاية الإيجار','إجمالي العقد','المسدد','المتبقي','الاستحقاق القادم','مبلغ القادم','المتأخر','الحالة'];
  const l=sorted(rows().filter(passC)).map(({pn,c,r})=>[pn,c.unit,c.owner,c.tenant,c.start,c.end,r.total,r.paid,r.rem,r.next?iso(r.next.date):'',r.next?r.next.due:'',r.late,r.st].map(csvq).join(','));
  return[h.map(csvq).join(','),...l].join('\r\n');
}
function printDoc(k,pdf){
  let html,name;
  if(k==='list'){if(S.view==='due'||S.view==='flow'){const D=S.view==='due'?S.due:S.flow;D.print=true;S.pm=dueModel(rows(),D);D.print=false}html=listDoc();name=safe(S.pm.title)+'.pdf'}
  else if(k==='contract'){const x=cur();if(!x)return;html=contractDoc(x);name='contract-'+safe(x.c.unit)+'.pdf'}
  else if(k==='owner'){html=docHtml({title:'كشف حساب مالك: '+esc(S.on),sub:'بتاريخ '+iso(TODAY),body:ownerBody(S.on,true)});name='statement-'+safe(S.on)+'.pdf'}
  else if(k==='proj'){const p=P()[S.pj];html=docHtml({title:'وحدات مشروع: '+esc(p.name),sub:esc(p.address||''),body:projUnits(S.pj,true)});name='units-'+safe(p.name)+'.pdf'}
  printArea(html,pdf?name:null);
}

/* ---------- الأحداث ---------- */
const act={
  go:b=>go(b.dataset.v),jump:b=>J[b.dataset.j](),
  open:b=>openDet(b.dataset.p,b.dataset.c),close:()=>$('#det').close(),fclose:()=>$('#frm').close(),sclose:()=>$('#stm').close(),
  new:()=>contractForm(false),edit:()=>contractForm(true),
  renewC:()=>{const x=cur();if(x)renewForm(x.pid,x.c)},renewQ:b=>{const c=P()[b.dataset.p].contracts.find(c=>c.id===b.dataset.c);renewForm(b.dataset.p,c)},
  qpay:b=>payForm(b.dataset.p,b.dataset.c,b.dataset.v),
  rentUnit:b=>{const p=P()[b.dataset.p],u=p.units.find(u=>u.id===b.dataset.i);contractForm(false,{pid:b.dataset.p,unit:u.no,owner:u.owner,fee:'',rent:u.askRent||''})},
  editUnit2:b=>{S.pj=b.dataset.p;unitForm(b.dataset.p,b.dataset.i)},
  availProj:b=>{S.av={p:b.dataset.p,q:''};go('avail')},
  availCsv:()=>{const L=availList(),o=[['المشروع','الوحدة','المالك','النوع','المساحة','الغرف','الإيجار المطلوب'].map(csvq).join(','),...L.map(x=>[x.p.name,x.u.no,x.u.owner,x.u.type,x.u.area,x.u.rooms,x.u.askRent].map(csvq).join(','))];saveText('available-units.csv',o.join('\r\n'))},
  print:b=>printDoc(b.dataset.k,false),pdf:b=>printDoc(b.dataset.k,true),
  csv:()=>saveText('rent-contracts.csv',contractsCsv()),
  dueCsv:b=>{const D=b.dataset.d==='fl'?S.flow:S.due,act=D.mode==='act',L=dueList(rows(),D);
    const h=act?['التاريخ','المشروع','الوحدة','المالك','المستأجر','المبلغ','ملاحظة']:['الاستحقاق','المشروع','الوحدة','المالك','المستأجر','القسط','مبلغ القسط','المسدد','المتبقي'];
    const out=[h.map(csvq).join(','),...L.map(o=>(act?[o.t?iso(o.t):'',o.x.pn,o.x.c.unit,o.x.c.owner,o.x.c.tenant,o.amount,o.note]:[o.t?iso(o.t):'',o.x.pn,o.x.c.unit,o.x.c.owner,o.x.c.tenant,o.n,o.amount,o.paid,o.due]).map(csvq).join(','))];
    saveText('cashflow.csv',out.join('\r\n'))},
  dueClear:b=>{Object.assign(b.dataset.d==='fl'?S.flow:S.due,{from:'',to:'',m:''});render()},
  delC:b=>arm(b,()=>{const{pid,cid}=S.cur;$('#det').close();mutate(pid,p=>{p.contracts=p.contracts.filter(c=>c.id!==cid)})}),
  prTab:b=>{S.pr.tab=b.dataset.t;render()},pu_clear:()=>{Object.assign(S.pr,{up:'',us:'',uo:'',ut:'',uq:''});render()},
  endRenew:b=>{const x=P()[b.dataset.p]?.contracts.find(c=>c.id===b.dataset.c);if(x){S.cur={pid:b.dataset.p,cid:x.id};renewForm(b.dataset.p,x)}},
  endExit:b=>exitForm(b.dataset.p,b.dataset.c),
  endUndo:b=>{mutate(b.dataset.p,p=>{const c=p.contracts.find(c=>c.id===b.dataset.c);delete c.exit});toast('أُلغي الإنهاء — عادت الوحدة بانتظار القرار')},
  endCsv:()=>exportXlsx('expired',S.pm),
  addPay:b=>payForm(S.cur.pid,S.cur.cid,b.dataset.v),
  rcOne:b=>{const r=receiptDoc(S.cur.pid,S.cur.cid,b.dataset.i);if(r)printArea(r.html,null)},
  rcPrint:()=>{const r=receiptDoc(S.rc.pid,S.rc.cid,S.rc.payId);$('#frm').close();if(r)printArea(r.html,null)},
  rcPdf:()=>{const r=receiptDoc(S.rc.pid,S.rc.cid,S.rc.payId);$('#frm').close();if(r)printArea(r.html,r.name)},
  delPay:b=>arm(b,()=>mutate(S.cur.pid,pr=>{const c=pr.contracts.find(c=>c.id===S.cur.cid);c.payments=c.payments.filter(p=>p.id!==b.dataset.i)})),
  newProj:()=>projForm(null),projOpen:b=>projDlg(b.dataset.p),editProj:()=>projForm(S.pj),
  delProj:b=>arm(b,()=>{delete P()[S.pj];persist();$('#stm').close();render()}),
  newUnit:()=>unitForm(S.pj,null),editUnit:b=>unitForm(S.pj,b.dataset.i),
  delUnit:b=>arm(b,()=>{mutate(S.pj,p=>{p.units=p.units.filter(u=>u.id!==b.dataset.i)});projDlg(S.pj)}),
  ownOpen:b=>ownerDlg(b.dataset.n),
  xlsOwner:()=>{const all=ownerRows(S.on);
    const aoa=[['المشروع','الوحدة','المستأجر','بداية الإيجار','نهاية الإيجار','الإجمالي','المسدد','المتبقي','الرسوم'],...all.map(x=>[x.pn,x.c.unit,x.c.tenant,x.c.start,x.c.end,x.r.total,x.r.paid,x.r.rem,x.c.fee])];
    const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(aoa);ws['!views']=[{rightToLeft:true}];XLSX.utils.book_append_sheet(wb,ws,'كشف الحساب');saveWb('statement.xlsx',wb)},
  imp:openImp,iclose:()=>$('#imp').close(),ipick:pickImp,iapply:applyBtn,
  expX:()=>saveWb('rent-contracts-export.xlsx',buildWorkbook(XLSX,P(),MODE(),TODAY)),
  tpl:async()=>{const f=await native.saveTemplate();if(f)toast('تم حفظ القالب')},
  bkNow:async()=>{await flush();const f=await native.backupNow();toast(f?'تم إنشاء نسخة احتياطية':'لا توجد بيانات بعد')},
  bkList:async()=>{const l=await native.backups();$('#bklist').innerHTML=l.length?'<div class="tw it" style="margin-top:8px;max-height:260px"><table><tbody>'+l.map(b=>`<tr><td class="n">${esc(b.name)}</td><td class="n">${Math.round(b.size/1024)} KB</td><td class="ac"><button class="btn sm" data-a="restore" data-n="${esc(b.name)}">استعادة</button></td></tr>`).join('')+'</tbody></table></div>':'<p>لا توجد نسخ.</p>'},
  restore:b=>arm(b,async()=>{await flush();await native.backupPre('restore');try{const d=await native.readBackup(b.dataset.n);normalize(d);S.db=d;persist();render();toast('تمت الاستعادة')}catch{toast('تعذّرت الاستعادة')}}),
  icoSet:async()=>{
    const f=await native.openFile([{name:'صور',extensions:['png','jpg','jpeg','ico','bmp','webp']}]);if(!f)return;
    try{
      const ext=f.name.split('.').pop().toLowerCase(),mime=ext==='ico'?'image/x-icon':ext==='jpg'?'image/jpeg':'image/'+ext;
      const bm=await createImageBitmap(new Blob([f.bytes],{type:mime}));
      const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.clearRect(0,0,256,256);
      const k=Math.min(256/bm.width,256/bm.height),w=bm.width*k,h=bm.height*k;g.drawImage(bm,(256-w)/2,(256-h)/2,w,h);
      const png=new Uint8Array(await new Promise(r=>c.toBlob(b=>b.arrayBuffer().then(r),'image/png')));
      const r=await native.setIcon(png);const u=await native.getIcon();if(u)$('#iconprev').src=u;
      toast(r.shortcuts?'تم تغيير الأيقونة واختصارات سطح المكتب':'تم تغيير أيقونة النافذة. تُحدَّث اختصارات سطح المكتب في النسخة المثبّتة');
    }catch(e){toast('تعذّر استخدام الصورة')}
  },
  icoReset:async()=>{await native.resetIcon();$('#iconprev').src='assets/logo.svg';toast('عادت أيقونة كثيب')},
  chkUpd:async()=>{const r=await native.checkUpdate();toast(r.dev?'التحديث التلقائي يعمل في النسخة المثبّتة فقط':r.err?'تعذّر التحقق: '+r.err:(r.v&&r.v!==S.ver?'يوجد إصدار جديد '+r.v+' وجارٍ تنزيله':'أنت على أحدث إصدار'))},
  openDir:()=>native.openDir(),
  chDir:async()=>{const d=await native.changeDir();if(!d)return;S.dir=d;const r=await native.load();if(r.data){normalize(r.data);S.db=r.data}else persist();render();toast('تم تغيير موقع التخزين')}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||!act[b.dataset.a])return;if(b.tagName==='TR'&&e.target.closest('button'))return;act[b.dataset.a](b)});
document.addEventListener('input',e=>{
  const id=e.target.id,v=e.target.value.trim();
  if(id==='fq'){S.f.q=v;render()}else if(id==='en_q'){S.en.q=v;render()}else if(id==='pu_q'){S.pr.uq=v;render()}else if(id==='due_q'){S.due.q=v;render()}else if(id==='fl_q'){S.flow.q=v;render()}else if(id==='av_q'){S.av.q=v;render()}else if(id==='rq'){S.ren.q=v;render()}
  else if(id==='oq'){S.ow.q=v;render()}else if(id==='pq'){S.pr.q=v;render()}
});
document.addEventListener('change',e=>{
  const id=e.target.id,v=e.target.value;
  if(id==='fp'){S.f.p=v;render()}else if(id==='fs'){S.f.s=v;render()}
  else if(id==='due_p'){S.due.p=v;render()}else if(id==='due_s'){S.due.s=v;render()}else if(id==='due_cs'){S.due.cs=v;render()}else if(id==='due_mode'){S.due.mode=v;render()}else if(id==='due_g'){S.due.g=v;render()}
  else if(id==='due_from'){S.due.from=v;S.due.m='';render()}else if(id==='due_to'){S.due.to=v;S.due.m='';render()}
  else if(id==='due_m'){S.due.m=v;S.due.from=v?v+'-01':'';S.due.to=v?mEnd(v):'';render()}
  else if(id==='fl_p'){S.flow.p=v;render()}else if(id==='fl_s'){S.flow.s=v;render()}else if(id==='fl_cs'){S.flow.cs=v;render()}else if(id==='fl_mode'){S.flow.mode=v;render()}else if(id==='fl_g'){S.flow.g=v;render()}
  else if(id==='fl_from'){S.flow.from=v;S.flow.m='';render()}else if(id==='fl_to'){S.flow.to=v;S.flow.m='';render()}
  else if(id==='fl_m'){S.flow.m=v;S.flow.from=v?v+'-01':'';S.flow.to=v?mEnd(v):'';render()}
  else if(id==='av_p'){S.av.p=v;render()}else if(id==='pu_p'){S.pr.up=v;render()}else if(id==='pu_s'){S.pr.us=v;render()}else if(id==='pu_o'){S.pr.uo=v;render()}else if(id==='pu_t'){S.pr.ut=v;render()}else if(id==='en_p'){S.en.p=v;render()}else if(id==='en_s'){S.en.s=v;render()}
  else if(id==='set_vat'){const n=Number(v);if(isFinite(n)&&n>=0&&n<=100){S.db.settings.vat=n;persist();toast('تم حفظ الإعداد')}}else if(id==='set_op'){S.db.settings.operator=v.trim();persist();toast('تم حفظ الإعداد')}
  else if(id==='rp'){S.ren.p=v;render()}else if(id==='rw'){S.ren.win=v;render()}
  else if(id==='mode'){S.db.settings.mode=v;persist();render();toast('تم حفظ الإعداد')}
});
function normalize(d){d.projects=d.projects||{};delete d.maint;d.settings=d.settings||{mode:'total'};d.settings.vat=d.settings.vat??15;d.settings.nextReceipt=d.settings.nextReceipt||1;d.settings.operator=d.settings.operator||'شركة كثيب للتشغيل والصيانة';d.agreements=d.agreements||[];d.parties=d.parties||{owners:[],tenants:[]};d.parties.owners=d.parties.owners||[];d.parties.tenants=d.parties.tenants||[];d.analyses=d.analyses||[];d.v=1;
  for(const p of Object.values(d.projects)){p.contracts=p.contracts||[];p.units=p.units||[];for(const c of p.contracts){c.payments=c.payments||[];ensureUnit(p,c)}}return d}
native.onUpdate(d=>{
  const b=$('#upd');if(!b)return;
  if(d.t==='available'){b.hidden=false;b.textContent='جارٍ تنزيل التحديث '+d.v+'…'}
  else if(d.t==='progress'){b.hidden=false;b.textContent='تنزيل التحديث '+d.pct+'%'}
  else if(d.t==='error'){toast('تعذّر التحقق من التحديث: '+String(d.m).slice(0,120))}
  else if(d.t==='ready'){b.hidden=false;b.innerHTML='تحديث جاهز ('+d.v+') — <b>اضغط لإعادة التشغيل والتثبيت</b>';b.onclick=async()=>{await flush();native.installUpdate()}}
});
(async()=>{
  try{S.ver=await native.version()}catch{}
  try{const r=await native.load();S.dir=r.dir;
    if(r.data){S.db=normalize(r.data);if(r.recovered)toast('الملف الرئيسي تالف، استُعيدت آخر نسخة سليمة: '+r.recovered)}}
  catch(e){toast('تعذّر تحميل البيانات')}
  render();
  try{const u=await native.getIcon();if(u&&$('#iconprev'))$('#iconprev').src=u}catch{}
})();
