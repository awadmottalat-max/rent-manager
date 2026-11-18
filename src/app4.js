/* الملاك والمستأجرون: سجل قابل للإضافة والتعديل */
'use strict';
Object.assign(S,{tn:{q:''}});
const PR=k=>{S.db.parties=S.db.parties||{owners:[],tenants:[]};S.db.parties[k]=S.db.parties[k]||[];return S.db.parties[k]};
const FKEY={owners:'owner',tenants:'tenant'},PLAB={owners:'مالك',tenants:'مستأجر'};
const nm=v=>String(v||'').trim();
function tenantStatements(all){
  const M=new Map();
  for(const x of all){const n=nm(x.c.tenant)||'(بدون مستأجر)';let o=M.get(n);if(!o){o={name:n,projects:new Set(),units:new Set(),contracts:0,active:0,total:0,paid:0,rem:0,late:0};M.set(n,o)}
    o.projects.add(x.pn);o.units.add(x.pn+' / '+x.c.unit);o.contracts++;if(x.r.st==='ساري')o.active++;o.total+=x.r.total||0;o.paid+=x.r.paid||0;o.rem+=x.r.rem>0?x.r.rem:0;o.late+=x.r.late||0}
  return [...M.values()].map(o=>({...o,projects:[...o.projects],units:o.units.size,unitList:[...o.units]}));
}
function partyList(kind,all){
  const base=kind==='owners'?ownerStatements(all).map(o=>({name:o.name,projects:o.projects,units:o.units,contracts:o.contracts,active:0,total:o.total,paid:o.paid,rem:o.rem,late:o.late,fees:o.fees,net:o.net})):tenantStatements(all);
  const by=new Map(base.map(o=>[o.name,o]));
  for(const r of PR(kind))if(!by.has(nm(r.name)))by.set(nm(r.name),{name:nm(r.name),projects:[],units:0,contracts:0,active:0,total:0,paid:0,rem:0,late:0,fees:0,net:0});
  const reg=Object.fromEntries(PR(kind).map(r=>[nm(r.name),r]));
  return [...by.values()].map(o=>({...o,reg:reg[o.name]||null})).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
}
function vParties(kind,all){
  const q=S[kind==='owners'?'ow':'tn'].q.toLowerCase(),L=partyList(kind,all).filter(o=>!q||txt(o.name,o.reg?.phone,o.reg?.idno,o.projects.join(' ')).includes(q));
  const ow=kind==='owners';
  const cols=[{h:ow?'المالك':'المستأجر',k:'t'},{h:'الجوال',k:'t'},{h:'الهوية / السجل',k:'t'},{h:'المشاريع',k:'t'},{h:'وحدات',k:'n'},{h:'عقود',k:'n'},{h:'إجمالي الإيجار',k:'n'},{h:'المحصَّل',k:'n'},{h:'المتبقي',k:'n'},{h:'المتأخر',k:'n'},...(ow?[{h:'صافي المحصَّل',k:'n'}]:[]),{h:'',k:'ac'}];
  const rws=L.map(o=>({attrs:` data-a="${ow?'ownOpen':'tenOpen'}" data-n="${esc(o.name)}"`,cells:['<b>'+esc(o.name)+'</b>',esc(o.reg?.phone)||'—',esc(o.reg?.idno)||'—',esc(o.projects.join('، '))||'—',o.units,o.contracts,fm(o.total),fm(o.paid),fm(o.rem),o.late?fm(o.late):'—',...(ow?['<b>'+fm(o.net)+'</b>']:[]),
    `<button class="btn sm" data-a="partyEdit" data-k="${kind}" data-n="${esc(o.name)}">تعديل</button>`+(o.contracts?'':` <button class="btn sm dng" data-a="partyDel" data-k="${kind}" data-n="${esc(o.name)}">حذف</button>`)]}));
  const pcols=cols.filter(c=>c.k!=='ac');
  const foot=['الإجمالي ('+L.length+')','','','',sum(L,o=>o.units),sum(L,o=>o.contracts),fm(sum(L,o=>o.total)),fm(sum(L,o=>o.paid)),fm(sum(L,o=>o.rem)),fm(sum(L,o=>o.late)),...(ow?[fm(sum(L,o=>o.net))]:[]),''];
  S.pm={title:ow?'سجل الملاك':'سجل المستأجرين',sub:'عدد: '+L.length,cols:pcols,rows:rws.map(r=>({...r,cells:r.cells.slice(0,pcols.length)})),foot:foot.slice(0,pcols.length)};
  return `<h1>${ow?'الملاك':'المستأجرون'}</h1><p class="sub">${ow?'سجل الملاك مع كشف حساب لكل مالك: المحصَّل من الإيجارات ناقصًا رسوم الأملاك.':'سجل المستأجرين وعقودهم وأرصدتهم، وكشف حساب لكل مستأجر.'} انقر على الاسم لعرض الكشف. «إضافة» لتسجيل ${PLAB[kind]} جديد قبل ربطه بعقد، و«تعديل» لتحديث بياناته (تغيير الاسم يُحدَّث في كل عقوده).</p>
<div class="bar"><button class="btn p" data-a="partyNew" data-k="${kind}">+ إضافة ${PLAB[kind]}</button><input type="search" id="${ow?'oq':'tq'}" placeholder="بحث بالاسم أو الجوال أو الهوية" value="${esc(S[ow?'ow':'tn'].q)}">${pbtn('list')}</div>${T(cols,rws,{foot})}`;
}
VF.owners=a=>vParties('owners',a);VF.tenants=a=>vParties('tenants',a);
function partyForm(kind,name){
  const reg=PR(kind).find(r=>nm(r.name)===name),v=reg||{name:name||''};
  formDlg({title:name?'تعديل '+PLAB[kind]+': '+name:'إضافة '+PLAB[kind]+' جديد',vals:v,fields:[{k:'name',l:'الاسم *'},{k:'phone',l:'الجوال'},{k:'idno',l:kind==='owners'?'رقم الهوية / السجل التجاري':'رقم الهوية / الإقامة / السجل'},{k:'email',l:'البريد الإلكتروني'},{k:'addr',l:'العنوان',full:1},{k:'notes',l:'ملاحظات',t:'area',full:1}],
    onSave:o=>{const n=nm(o.name);if(!n)return 'الاسم إلزامي';
      const all=rows(),exists=partyList(kind,all).some(p=>p.name===n&&p.name!==name);if(exists)return 'الاسم موجود مسبقًا';
      const L=PR(kind);let r=L.find(x=>nm(x.name)===name);
      if(!r){r={id:'r'+uid()};L.push(r)}
      Object.assign(r,{name:n,phone:nm(o.phone),idno:nm(o.idno),email:nm(o.email),addr:nm(o.addr),notes:o.notes});
      if(name&&n!==name){const f=FKEY[kind];
        for(const pid of Object.keys(P()))mutate(pid,p=>{for(const c of p.contracts)if(nm(c[f])===name)c[f]=n;if(kind==='owners')for(const u of p.units||[])if(nm(u.owner)===name)u.owner=n});
        for(const a of S.db.agreements||[])if(nm(a[f])===name)a[f]=n;for(const a of S.db.analyses||[])if(nm(a[f])===name)a[f]=n}
      persist();render();toast('تم حفظ بيانات '+PLAB[kind])}});
}
function tenantDlg(name){S.rp.tab='tenant';S.rp.tenant=name;S.rp.from='';S.rp.to='';go('rep')}
Object.assign(act,{
  partyNew:b=>partyForm(b.dataset.k,''),partyEdit:b=>partyForm(b.dataset.k,b.dataset.n),
  partyDel:b=>arm(b,()=>{S.db.parties[b.dataset.k]=PR(b.dataset.k).filter(r=>nm(r.name)!==b.dataset.n);persist();render()}),
  tenOpen:b=>tenantDlg(b.dataset.n)});
document.addEventListener('input',e=>{if(e.target.id==='tq'){S.tn.q=e.target.value.trim();render()}});
