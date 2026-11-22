/* v1.9: إزالة/إعادة الوحدات، إغلاق النوافذ بالنقر خارجها، فحص سلامة البيانات */
'use strict';
function pickProject(title,cb){
  const L=Object.entries(P()).sort((a,b)=>a[1].name.localeCompare(b[1].name,'ar'));
  if(!L.length)return toast('أضف مشروعًا أولًا');
  if(S.av.p||L.length===1)return cb(S.av.p||L[0][0]);
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
