/* الرسوم والخدمات: رسوم خدمات ومياه سنوية على الملاك أو المستأجرين — مبلغ ومسدد ومتبقٍ وتأخر */
const SV=()=>S.db.svc||(S.db.svc=[]);
const SV_PARTY=[['owner','المالك'],['tenant','المستأجر']];
const SV_PAYEE=[['company','شركة كثيب'],['union','اتحاد الملاك']];
const SV_TYPES=['رسوم خدمات','رسوم مياه'];
const SV_PL=Object.fromEntries(SV_PARTY),SV_YL=Object.fromEntries(SV_PAYEE);
Object.assign(S,{sv:{p:'',t:'',s:'open',y:'',w:'',e:'',q:''}});
const svVat=()=>+S.db.settings.vat||0;
const svTot=b=>r2((+b||0)*(1+svVat()/100));
const svPaid=x=>r2((x.pays||[]).reduce((a,p)=>a+(+p.amount||0),0));
const svRem=x=>Math.max(0,r2((+x.total||0)-svPaid(x)));
const svLate=x=>svRem(x)>0.005&&x.due&&pd(x.due)<TODAY;
const svCarry=x=>svRem(x)>0.005&&+x.year<+iso(TODAY).slice(0,4);
const svById=id=>SV().find(x=>x.id===id);
const svSt=x=>svRem(x)<=0.005?'مسدد':svLate(x)?'متأخر':svPaid(x)>0?'سداد جزئي':'مستحق';
const svCls=x=>({'مسدد':'ok','متأخر':'late','سداد جزئي':'warn','مستحق':''}[svSt(x)]);
const svLog=(x,t)=>{(x.log=x.log||[]).push({at:mtTime(),text:t})};
const svTen=(pid,unit)=>{const c=mtCtx(pid,unit);return c.hasAct?c.tenant:''};
function svPartyName(pid,unit,party){const c=mtCtx(pid,unit);return party==='tenant'?(c.hasAct?c.tenant:''):c.owner}
function svDefs(){const d=S.db.settings.svcDef=S.db.settings.svcDef||{};return d}
function svIssueDlg(){
  const pids=Object.keys(P());if(!pids.length){toast('أضف مشروعًا أولًا');return}
  const yr=+iso(TODAY).slice(0,4),st={rows:[]};
  formDlg({title:'إصدار رسوم سنوية لمشروع',save:'إصدار الرسوم',vals:{pid:MSV(S.sv.p)[0]||pids[0],type:SV_TYPES[0],year:String(yr),party:'owner',due:yr+'-01-01',payee:'company',all:''},fields:[
    {k:'pid',l:'المشروع',t:'select',opts:pids.map(k=>[k,P()[k].name])},{k:'type',l:'نوع الرسم',dl:SV_TYPES},
    {k:'year',l:'السنة',t:'number'},{k:'party',l:'على',t:'select',opts:SV_PARTY},
    {k:'due',l:'تاريخ الاستحقاق',t:'date'},{k:'payee',l:'تُدفع إلى',t:'select',opts:SV_PAYEE},
    {k:'all',l:'مبلغ موحد لكل الوحدات (قبل الضريبة) — يملأ الجدول أدناه',t:'number',full:1},
    {t:'info',k:'rows',html:'<div id="sv_rows"></div>'}],
    onSave:o=>{
      if(!o.type)return 'أدخل نوع الرسم';if(!/^\d{4}$/.test(o.year))return 'السنة غير صحيحة';if(!o.due)return 'أدخل تاريخ الاستحقاق';
      const rows=[...document.querySelectorAll('#sv_rows .svr')].filter(r=>r.querySelector('.svc').checked).map(r=>({unit:r.dataset.u,name:r.dataset.n,base:+r.querySelector('.sva').value}));
      if(!rows.length)return 'حدّد وحدة واحدة على الأقل';if(rows.some(r=>!(r.base>0)))return 'أدخل مبلغًا لكل وحدة محددة';
      let n=0,skip=0;
      for(const r of rows){
        if(SV().some(x=>x.pid===o.pid&&normU(x.unit)===normU(r.unit)&&x.type===o.type&&String(x.year)===o.year&&x.party===o.party)){skip++;continue}
        const no=S.db.settings.nextSvc||1;S.db.settings.nextSvc=no+1;
        SV().push({id:'s'+uid(),no,pid:o.pid,unit:r.unit,type:o.type,year:+o.year,party:o.party,name:r.name,base:r.base,vat:svVat(),total:svTot(r.base),payee:o.payee,due:o.due,pays:[],log:[{at:mtTime(),text:'تم إصدار الرسم'}],created:iso(TODAY)});n++}
      if(o.all)svDefs()[o.pid+'|'+o.type]=+o.all;
      persist();render();toast('تم إصدار '+n+' رسم'+(skip?' وتخطي '+skip+' مكرر':''))}});
  const g=i=>document.getElementById('ff_'+i);
  const build=()=>{
    const pid=g('pid').value,party=g('party').value,type=g('type').value.trim(),def=svDefs()[pid+'|'+type]||'';
    const us=mtUnits(pid).map(u=>({u,n:svPartyName(pid,u,party)})).filter(o=>party==='owner'?true:o.n);
    document.getElementById('sv_rows').innerHTML=us.length?`<div class="tw"><table><thead><tr><th></th><th>الوحدة</th><th>${party==='owner'?'المالك':'المستأجر'}</th><th>المبلغ قبل الضريبة</th></tr></thead><tbody>${us.map(o=>`<tr class="svr" data-u="${esc(o.u)}" data-n="${esc(o.n)}"><td><input type="checkbox" class="svc" checked></td><td><b>${esc(o.u)}</b></td><td>${esc(o.n)||'—'}</td><td><input type="number" step="0.01" class="sva" value="${(FU().find(f=>f.pid===pid&&normU(f.no)===normU(o.u))||{}).amt||def}" style="width:120px"></td></tr>`).join('')}</tbody></table></div><p class="sub">تُضاف ضريبة القيمة المضافة (${svVat()}%) تلقائيًا. للمبالغ المختلفة حسب الوحدة عدّل الخانة بجانب كل وحدة.</p>`:'<p class="empty">لا توجد وحدات مناسبة في هذا المشروع.</p>'};
  const pay=()=>{const d=(S.db.settings.svcPayee||{})[g('pid').value];if(d)g('payee').value=d};
  g('pid').addEventListener('change',()=>{pay();build()});g('party').addEventListener('change',build);g('type').addEventListener('change',build);g('type').addEventListener('input',build);
  g('all').addEventListener('input',()=>{document.querySelectorAll('#sv_rows .sva').forEach(i=>i.value=g('all').value)});
  g('payee').addEventListener('change',()=>{const m=S.db.settings.svcPayee=S.db.settings.svcPayee||{};m[g('pid').value]=g('payee').value});
  pay();build();
}
function svForm(id){
  const x=id?svById(id):null,yr=iso(TODAY).slice(0,4),v=x||{pid:MSV(S.sv.p)[0]||Object.keys(P())[0],type:SV_TYPES[0],year:yr,party:'owner',due:yr+'-01-01',payee:'company'};
  formDlg({title:x?'تعديل الرسم رقم '+x.no:'رسم جديد',save:'حفظ',vals:{...v,base:x?x.base:''},fields:[
    {k:'pid',l:'المشروع',t:'select',opts:Object.entries(P()).map(([k,p])=>[k,p.name])},{k:'unit',l:'رقم الوحدة',dl:mtUnits(v.pid)},
    {k:'type',l:'نوع الرسم',dl:SV_TYPES},{k:'year',l:'السنة',t:'number'},{k:'party',l:'على',t:'select',opts:SV_PARTY},{k:'name',l:'الاسم'},
    {k:'base',l:'المبلغ قبل الضريبة (تُضاف الضريبة تلقائيًا)',t:'number'},{k:'due',l:'تاريخ الاستحقاق',t:'date'},{k:'payee',l:'تُدفع إلى',t:'select',opts:SV_PAYEE}],
    onSave:o=>{
      if(!o.pid||!P()[o.pid])return 'اختر المشروع';if(!o.unit)return 'أدخل رقم الوحدة';if(!mtUnits(o.pid).some(u=>normU(u)===normU(o.unit)))return 'رقم الوحدة غير موجود في المشروع المختار';
      if(!o.type)return 'أدخل نوع الرسم';if(!/^\d{4}$/.test(String(o.year)))return 'السنة غير صحيحة';if(!(+o.base>0))return 'المبلغ غير صحيح';if(!o.due)return 'أدخل تاريخ الاستحقاق';
      const r=x||{id:'s'+uid(),no:S.db.settings.nextSvc||1,pays:[],log:[],created:iso(TODAY)};if(!x){S.db.settings.nextSvc=r.no+1;SV().unshift(r);svLog(r,'تم إنشاء الرسم')}
      Object.assign(r,{pid:o.pid,unit:o.unit,type:o.type,year:+o.year,party:o.party,name:o.name||svPartyName(o.pid,o.unit,o.party),base:+o.base,vat:svVat(),total:svTot(o.base),payee:o.payee,due:o.due});
      persist();render();toast('تم الحفظ');setTimeout(()=>svDlg(r.id),60)}});
  const g=i=>document.getElementById('ff_'+i),nmF=()=>{g('name').value=svPartyName(g('pid').value,g('unit').value.trim(),g('party').value)};
  g('pid').addEventListener('change',()=>{const d=document.getElementById('dl_unit');if(d)d.innerHTML=mtUnits(g('pid').value).map(o=>`<option value="${esc(o)}">`).join('');g('unit').value='';g('name').value=''});
  const on=()=>{if(mtUnits(g('pid').value).some(u=>normU(u)===normU(g('unit').value.trim())))nmF()};
  g('unit').addEventListener('input',on);g('party').addEventListener('change',nmF);
}
function svDlg(id){
  const x=svById(id);if(!x)return;S.svId=id;const p=P()[x.pid]||{name:''};
  const pays=[...(x.pays||[])].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const k=(l,v)=>`<div><span>${l}</span><b>${v||'—'}</b></div>`;
  $('#stm').innerHTML=`<div class="dh"><div><h2>${esc(x.type)} ${x.year} — وحدة ${esc(x.unit)}</h2><p>${esc(p.name)} · على ${SV_PL[x.party]}: ${esc(x.name)||'—'} · <span class="ch ${svCls(x)}">${svSt(x)}</span>${svCarry(x)?' <span class="ch warn">مرحّل من '+x.year+'</span>':''}</p></div><button class="x" data-a="sclose" aria-label="إغلاق">✕</button></div>
<div class="db"><div class="acts"><button class="btn p" data-a="svPay" data-i="${x.id}">+ تسجيل سداد</button><button class="btn" data-a="svWa" data-i="${x.id}">تذكير عبر واتساب</button><button class="btn" data-a="svEdit" data-i="${x.id}">تعديل</button><button class="btn dng" data-a="svDel" data-i="${x.id}">حذف</button></div>
<div class="sum"><div><span>المبلغ قبل الضريبة</span><b>${fm(x.base)}</b></div><div><span>الإجمالي شامل الضريبة (${x.vat}%)</span><b>${fm(x.total)}</b></div><div><span>المسدد</span><b>${fm(svPaid(x))}</b></div><div><span>المتبقي</span><b>${fm(svRem(x))}</b></div></div>
<div class="mtk">${k('المشروع',esc(p.name))}${k('الوحدة',esc(x.unit))}${k('الطرف',SV_PL[x.party]+': '+esc(x.name))}${k('تاريخ الاستحقاق',fs_(x.due))}${k('تُدفع إلى',SV_YL[x.payee])}</div>
<h3>الدفعات</h3>${pays.length?T([{h:'التاريخ',k:'d'},{h:'المبلغ',k:'n'},{h:'ملاحظة',k:'t'},{h:'',k:'ac'}],pays.map(q=>({cells:[fs_(q.date),fm(q.amount),esc(q.note)||'—',`<button class="btn sm dng" data-a="svPayDel" data-i="${x.id}" data-q="${esc(q.id)}">حذف</button>`]}))):'<div class="tw"><p class="empty">لا توجد دفعات مسجلة.</p></div>'}
<h3>سجل المتابعة</h3>${(x.log||[]).length?`<ul class="mtl">${[...x.log].reverse().map(n=>`<li><small>${esc(n.at)}</small> ${esc(n.text)}</li>`).join('')}</ul>`:'<p class="empty">لا توجد ملاحظات.</p>'}</div>`;
  if(!$('#stm').open)$('#stm').showModal();
}
const svRefresh=()=>{persist();render();if($('#stm').open&&S.svId&&svById(S.svId))svDlg(S.svId)};
function svPayForm(id){
  const x=svById(id);if(!x)return;
  formDlg({title:'تسجيل سداد — '+x.type+' '+x.year+' وحدة '+x.unit,save:'تسجيل',vals:{date:iso(TODAY),amount:svRem(x)||''},fields:[{k:'date',l:'تاريخ السداد',t:'date'},{k:'amount',l:'المبلغ (شامل الضريبة)',t:'number'},{k:'note',l:'ملاحظة / رقم الحوالة',full:1}],
    onSave:o=>{const a=+o.amount;if(!(a>0))return 'أدخل مبلغًا صحيحًا';if(!o.date)return 'أدخل تاريخ السداد';if(a>svRem(x)+0.005)return 'المبلغ أكبر من المتبقي ('+fm(svRem(x))+')';
      (x.pays=x.pays||[]).push({id:'q'+uid(),date:o.date,amount:a,note:o.note});svLog(x,'سداد: '+fm(a));svRefresh();toast('تم تسجيل السداد');setTimeout(()=>svDlg(id),60)}});
  setTimeout(()=>document.getElementById('ff_amount')?.focus(),90);
}
function svWaForm(id){
  const x=svById(id);if(!x)return;const p=P()[x.pid],EN=window.LANG==='en',who=x.name||(EN?'Dear customer':'السيد/ة');
  const txt=EN?`Dear ${who},\nThis is a reminder of the ${x.type} ${x.year} for unit ${x.unit} (${p.name}). Total incl. VAT: ${fm(x.total)}; paid: ${fm(svPaid(x))}; remaining: ${fm(svRem(x))}${x.due?'; due date: '+iso(pd(x.due)):''}.\nPayable to: ${SV_YL[x.payee]}.\nThank you.`
    :`السلام عليكم ${who}،\nنذكّركم بـ${x.type} لعام ${x.year} للوحدة ${x.unit} (${p.name}). الإجمالي شامل الضريبة: ${fm(x.total)}، المسدد: ${fm(svPaid(x))}، المتبقي: ${fm(svRem(x))}${x.due?'، تاريخ الاستحقاق: '+iso(pd(x.due)):''}.\nيُسدد إلى: ${SV_YL[x.payee]}.\nشاكرين تعاونكم.`;
  const ph=x.party==='tenant'?tenPhone(x.name):(ownPhone(x.name)||(FU().find(f=>nm(f.owner)===nm(x.name)&&f.phone)||{}).phone||'');
  formDlg({title:'تذكير بالرسوم عبر واتساب',save:'فتح واتساب وإرسال',vals:{phone:ph,text:txt},fields:[{k:'phone',l:'الجوال (واتساب)',ph:'05xxxxxxxx'},{k:'text',l:'نص الرسالة (قابل للتعديل)',t:'area',full:1}],
    onSave:v=>{const n=waPhone(v.phone);if(!n||n.length<10)return 'أدخل رقم جوال صحيح للواتساب (مثل 05xxxxxxxx)';if(!v.text.trim())return 'نص الرسالة فارغ';
      native.openExt('https://wa.me/'+n+'?text='+encodeURIComponent(v.text)).then(ok=>{if(!ok){toast('تعذّر فتح واتساب');return}svLog(x,'أُرسل تذكير عبر واتساب');svRefresh();toast('فُتح واتساب وسُجِّل التذكير');setTimeout(()=>svDlg(id),60)})}});
  const ta=document.getElementById('ff_text');if(ta)ta.rows=8;
}
function vSvc(){
  const E=S.sv,all=SV(),pn=id=>P()[id]?.name||'—',q=E.q.toLowerCase();
  const L=all.filter(x=>(MS(E.p,x.pid))&&AO(E.t,z=>x.type===z)&&AO(E.w,z=>x.party===z)&&AO(E.e,z=>x.payee===z)&&AO(E.y,z=>String(x.year)===String(z))&&AO(E.s,z=>z==='open'?svRem(x)>0.005:z==='late'?svLate(x):z==='carry'?svCarry(x):svRem(x)<=0.005)&&(!q||txt(x.unit,x.name,pn(x.pid),x.type,x.no).includes(q))).sort((a,b)=>(+b.year-+a.year)||String(a.unit).localeCompare(String(b.unit),'ar',{numeric:true}));
  const kp=(l,v,i,c,val)=>val==null?`<div class="kp static ${c||''}"><span>${l}</span><b>${v}</b><i>${i||''}</i></div>`:kpf(l,v,'sv.s',val,{i,cls:c==='lt'?'l':c});
  const cols=[{h:'الرقم',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'النوع',k:'t'},{h:'السنة',k:'d'},{h:'على',k:'t'},{h:'الاسم',k:'t'},{h:'تُدفع إلى',k:'t'},{h:'الإجمالي',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'الاستحقاق',k:'d'},{h:'الحالة',k:'d'}];
  const cell=x=>[x.no,esc(pn(x.pid)),'<b>'+esc(x.unit)+'</b>',esc(x.type),x.year+(svCarry(x)?' <small>مرحّل</small>':''),SV_PL[x.party],esc(x.name)||'—',SV_YL[x.payee],fm(x.total),fm(svPaid(x)),fm(svRem(x)),fs_(x.due),`<span class="ch ${svCls(x)}">${svSt(x)}</span>`];
  const tt=sum(L,x=>+x.total||0),tp=sum(L,svPaid),tr=sum(L,svRem);
  S.pm={title:'تقرير الرسوم والخدمات',sub:'عدد البنود: '+L.length+' — المتبقي: '+fm(tr)+(E.p?' — المشروع: '+esc(pname(E.p)):''),cols,rows:L.map(x=>({cells:cell(x).map(c=>String(c).replace(/<[^>]+>/g,''))})),foot:['الإجمالي ('+L.length+')','','','','','','','',fm(tt),fm(tp),fm(tr),'',''],footSpan:0};
  const rws=L.map(x=>({cls:svLate(x)?'late':'',attrs:` data-a="svOpen" data-i="${esc(x.id)}"`,cells:cell(x)}));
  const grp=(keyF,labF)=>{const m=new Map();for(const x of L){const k=keyF(x),o=m.get(k)||{k,n:0,t:0,p:0,r:0,l:0};o.n++;o.t+=+x.total||0;o.p+=svPaid(x);o.r+=svRem(x);if(svLate(x))o.l+=svRem(x);m.set(k,o)}return[...m.values()]};
  const gt=(h,a,lab)=>T([{h,k:'t'},{h:'البنود',k:'n'},{h:'الإجمالي',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'منه متأخر',k:'n'}],a.map(o=>({cells:[esc(lab(o.k)),o.n,fm(o.t),fm(o.p),fm(o.r),o.l?'<span style="color:var(--late)">'+fm(o.l)+'</span>':'—']})),{foot:['الإجمالي',sum(a,o=>o.n),fm(sum(a,o=>o.t)),fm(sum(a,o=>o.p)),fm(sum(a,o=>o.r)),fm(sum(a,o=>o.l))],footSpan:0});
  const byP=grp(x=>x.pid),byT=grp(x=>x.type+' — '+SV_YL[x.payee]);
  const smry=L.length?`<div class="mtsm"><div><h3>حسب المشروع</h3>${gt('المشروع',byP,pn)}</div><div><h3>حسب النوع وجهة السداد</h3>${gt('النوع',byT,k=>k)}</div></div>`:'';
  const sel=(id,v,opts)=>`<select id="${id}">${opts.map(([a,b])=>`<option value="${esc(a)}"${String(a)===String(v)?' selected':''}>${esc(b)}</option>`).join('')}</select>`;
  const types=[...new Set([...SV_TYPES,...all.map(x=>x.type)])],years=[...new Set(all.map(x=>String(x.year)))].sort().reverse();
  const open=all.filter(x=>svRem(x)>0.005),late=all.filter(svLate);
  return `<h1>الرسوم والخدمات</h1><p class="sub">رسوم الخدمات والمياه السنوية على الملاك أو المستأجرين: الإجمالي شامل الضريبة والمسدد والمتبقي. غير المسدد يبقى مستحقًا ويظهر «مرحّلًا» في السنة التالية. اضغط البند لتسجيل السداد.</p>
<div class="bar">${msel('sv.p',PL(),'كل المشاريع')}${msel('sv.t',types.map(t=>[t,t]),'كل الأنواع')}${msel('sv.s',[['open','غير المسددة'],['late','المتأخرة'],['carry','المرحّلة من سنوات سابقة'],['paid','المسددة']],'كل الحالات')}${msel('sv.w',SV_PARTY,'المالك والمستأجر')}${msel('sv.y',years.map(y=>[y,y]),'كل السنوات')}${msel('sv.e',SV_PAYEE,'كل جهات السداد')}
<input type="search" id="sv_q" placeholder="بحث: وحدة، اسم، مشروع" value="${esc(E.q)}"><button class="btn p" data-a="svIssue">+ إصدار رسوم سنوية</button><button class="btn" data-a="svNew">+ رسم منفرد</button>${pbtn('list')}</div>
<div class="kpis sm">${kp('إجمالي المستحق (شامل الضريبة)',fm(sum(open,x=>+x.total||0)+0),'للبنود غير المسددة بالكامل','','open')}${kp('المسدد',fm(sum(all,svPaid)),'','','paid')}${kp('المتبقي',fm(sum(all,svRem)),open.length+' بند','','open')}${kp('متأخر',fm(sum(late,svRem)),late.length+' بند','lt','late')}${kp('مرحّل من سنوات سابقة',fm(sum(all.filter(svCarry),svRem)),all.filter(svCarry).length+' بند','','carry')}</div>
${L.length?T(cols,rws,{foot:S.pm.foot}):'<p class="empty">لا توجد رسوم مطابقة. اضغط «+ إصدار رسوم سنوية» لإنشاء رسوم الخدمات أو المياه لمشروع.</p>'}${smry}`;
}
VF.svc=vSvc;
function svOwnerSec(name,print){
  const L=SV().filter(x=>x.party==='owner'&&((String(x.name||'').trim()||'(بدون مالك)')===name));
  if(!L.length)return '';
  const t=sum(L,x=>+x.total||0),pd_=sum(L,svPaid),r=sum(L,svRem);
  return `<h3>رسوم الخدمات والمياه على المالك</h3>${T([{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'النوع',k:'t'},{h:'السنة',k:'d'},{h:'الإجمالي',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'الاستحقاق',k:'d'},{h:'الحالة',k:'d'}],L.map(x=>({cells:[esc(P()[x.pid]?.name||''),'<b>'+esc(x.unit)+'</b>',esc(x.type),x.year,fm(x.total),fm(svPaid(x)),fm(svRem(x)),fs_(x.due),svSt(x)]})),{print,foot:['الإجمالي','','','',fm(t),fm(pd_),fm(r),'',''],footSpan:0})}`;
}
const svBadge=()=>SV().filter(svLate).length;
Object.assign(act,{svNew:()=>svForm(),svIssue:()=>svIssueDlg(),svOpen:b=>svDlg(b.dataset.i),svEdit:b=>svForm(b.dataset.i),svPay:b=>svPayForm(b.dataset.i),svWa:b=>svWaForm(b.dataset.i),
  svPayDel:b=>arm(b,()=>{const x=svById(b.dataset.i);if(!x)return;x.pays=(x.pays||[]).filter(q=>q.id!==b.dataset.q);svLog(x,'حُذفت دفعة مسجلة');svRefresh()}),
  svDel:b=>arm(b,()=>{S.db.svc=SV().filter(x=>x.id!==b.dataset.i);$('#stm').close();persist();render();toast('تم حذف الرسم')})});
document.addEventListener('input',e=>{if(e.target.id==='sv_q'){S.sv.q=e.target.value.trim();render()}});
document.addEventListener('change',e=>{const m={sv_p:'p',sv_t:'t',sv_s:'s',sv_w:'w',sv_y:'y',sv_e:'e'}[e.target.id];if(m){S.sv[m]=e.target.value;render()}});

/* ===== Excel: وحدات + ملاك + مبالغ الرسوم (بدون ظهورها في الإيجارات) ===== */
const SV_H=['المشروع','رقم الوحدة','المالك','جوال المالك (اختياري)','المبلغ قبل الضريبة','نوع الرسم (اختياري)','السنة (اختياري)','تاريخ الاستحقاق (اختياري)','تُدفع إلى (اختياري)'];
function svTpl(){
  const yr=+iso(TODAY).slice(0,4),ex=Object.values(P())[0]?.name||'اسم المشروع';
  const ws=XLSX.utils.aoa_to_sheet([SV_H,[ex,'A01','اسم المالك','0500000000',1500,'رسوم خدمات',yr,yr+'-01-01','شركة كثيب'],[ex,'A01','اسم المالك','',300,'رسوم مياه',yr,'','']]);
  ws['!cols']=[28,14,28,20,20,20,12,22,20].map(w=>({wch:w}));ws['!views']=[{rightToLeft:true}];
  const hs=XLSX.utils.aoa_to_sheet([['تعليمات'],['اسم المشروع يجب أن يطابق اسمه المسجل في التطبيق.'],['كل صف = وحدة ومالك ومبلغ رسم. يمكن تكرار الوحدة بصف آخر لنوع رسم مختلف (مثل المياه).'],['المبلغ قبل الضريبة، وتُضاف الضريبة تلقائيًا.'],['الأعمدة الاختيارية: إن تُركت فالافتراضي: رسوم خدمات، السنة الحالية، الاستحقاق 1 يناير، جهة السداد المحفوظة للمشروع (أو شركة كثيب).'],['جهة السداد: شركة كثيب أو اتحاد الملاك.'],['الوحدات والملاك غير المرتبطين بعقود إيجار لا تظهر في شاشات الإيجار، وتبقى للرسوم فقط.'],['المكرر لا يُضاف مرتين (نفس الوحدة والنوع والسنة).']]);
  hs['!cols']=[{wch:110}];hs['!views']=[{rightToLeft:true}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'الرسوم');XLSX.utils.book_append_sheet(wb,hs,'تعليمات');saveWb('قالب-الرسوم-والخدمات.xlsx',wb);
}
async function svImport(pre){
  const f=(pre&&pre.bytes)?pre:await native.openFile([{name:'Excel',extensions:['xlsx','xlsm','xls']}]);if(!f)return;
  let rows;try{const wb=XLSX.read(f.bytes,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]];rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true})}catch(e){toast('تعذّرت قراءة الملف');return}
  const hi=rows.findIndex(r=>r.some(c=>/وحدة/.test(String(c)))&&r.some(c=>/مشروع/.test(String(c))));if(hi<0){toast('لم أجد صف العناوين (المشروع، رقم الوحدة…). استخدم القالب.');return}
  const H=rows[hi].map(c=>String(c).trim()),col=re=>H.findIndex(h=>re.test(h));
  const C={p:col(/مشروع/),u:col(/وحدة/),o:col(/مالك/),ph:col(/جوال|هاتف/),a:col(/مبلغ/),t:col(/نوع/),y:col(/سنة/),d:col(/استحقاق/),e:col(/تُدفع|جهة|تدفع/)};
  const projs=Object.entries(P()),pf=n=>{const k=nm(n);return projs.find(([,p])=>nm(p.name)===k)||projs.find(([,p])=>nm(p.name).includes(k)||k.includes(nm(p.name)))};
  const dt=v=>{if(v===''||v==null)return '';if(typeof v==='number'){const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,10)}const m=String(v).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);return m?m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'):''};
  const yr0=iso(TODAY).slice(0,4),good=[],bad=[],seen=new Set();let dupRow=0;
  rows.slice(hi+1).forEach((r,i)=>{
    const g=k=>C[k]>=0?String(r[C[k]]??'').trim():'';if(!g('p')&&!g('u'))return;const n=hi+i+2;
    const pr=pf(g('p'));if(!pr){bad.push('سطر '+n+': المشروع «'+g('p')+'» غير موجود');return}
    if(!g('u')){bad.push('سطر '+n+': رقم الوحدة فارغ');return}
    const amt=g('a')===''?0:Number(String(g('a')).replace(/[,٬\s]/g,'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
    if(g('a')!==''&&!(amt>=0)){bad.push('سطر '+n+': المبلغ غير صحيح');return}
    const y=g('y')?String(g('y')).replace(/\D/g,'').slice(0,4):yr0;if(!/^\d{4}$/.test(y)){bad.push('سطر '+n+': السنة غير صحيحة');return}
    const e=/اتحاد/.test(g('e'))?'union':/كثيب|شركة/.test(g('e'))?'company':((S.db.settings.svcPayee||{})[pr[0]]||'company');
    const type=g('t')||'رسوم خدمات',key=pr[0]+'|'+normU(g('u'))+'|'+type+'|'+y;
    if(seen.has(key)){dupRow++;return}seen.add(key);
    good.push({pid:pr[0],pn:pr[1].name,unit:g('u'),owner:g('o'),phone:g('ph'),amt,type,year:+y,due:dt(C.d>=0?r[C.d]:'')||y+'-01-01',payee:e});
  });
  if(!good.length){toast(bad.length?bad[0]:'لا توجد صفوف صالحة');return}
  const exist=o=>{const p=P()[o.pid];return(p.units||[]).some(u=>normU(u.no)===normU(o.unit))||(p.contracts||[]).some(c=>normU(c.unit)===normU(o.unit))};
  const uk=new Map();good.forEach(o=>uk.set(o.pid+'|'+normU(o.unit),o));
  const inRent=[...uk.values()].filter(exist).length,fuOld=[...uk.values()].filter(o=>!exist(o)&&FU().some(f=>f.pid===o.pid&&normU(f.no)===normU(o.unit))).length,fuNew=uk.size-inRent-fuOld;
  const dupFee=good.filter(o=>o.amt>0&&SV().some(x=>x.pid===o.pid&&normU(x.unit)===normU(o.unit)&&x.type===o.type&&x.year===o.year&&x.party==='owner')).length;
  const owners=new Set(good.map(o=>nm(o.owner)).filter(Boolean)).size,toIssue=good.filter(o=>o.amt>0).length-dupFee;
  const html=`<div class="sum"><div><span>صفوف صالحة</span><b>${good.length}</b></div><div><span>وحدات جديدة (للرسوم فقط)</span><b>${fuNew}</b></div><div><span>وحدات موجودة مسبقًا</span><b>${inRent+fuOld}</b></div><div><span>ملاك في الملف</span><b>${owners}</b></div><div><span>رسوم ستُصدَر</span><b>${toIssue}</b></div><div><span>رسوم مكررة ستُتخطى</span><b>${dupFee+dupRow}</b></div></div><p class="sub">الوحدات الجديدة تُسجَّل للرسوم فقط ولا تظهر في شاشات الإيجار. الوحدات الموجودة في الإيجار تُستخدم كما هي دون تكرار.</p>${bad.length?'<p class="sub" style="color:var(--late)">صفوف متجاهلة ('+bad.length+'):<br>'+bad.slice(0,8).map(esc).join('<br>')+(bad.length>8?'<br>…':'')+'</p>':''}`;
  formDlg({title:'مراجعة استيراد الرسوم',save:'استيراد',vals:{},fields:[{t:'info',k:'i',html}],onSave:()=>{
    let nu=0,uu=0,ni=0;
    for(const o of good){
      const ex=exist(o);
      if(!ex||FU().some(f=>f.pid===o.pid&&normU(f.no)===normU(o.unit))){
        let fu=FU().find(f=>f.pid===o.pid&&normU(f.no)===normU(o.unit));
        if(!fu){fu={id:'f'+uid(),pid:o.pid,no:o.unit,owner:'',phone:'',amt:0};FU().push(fu);nu++}else uu++;
        if(o.owner)fu.owner=o.owner;if(o.phone)fu.phone=o.phone;if(o.amt>0&&o.type===SV_TYPES[0])fu.amt=o.amt;
      }
      if(o.amt>0){
        if(SV().some(x=>x.pid===o.pid&&normU(x.unit)===normU(o.unit)&&x.type===o.type&&x.year===o.year&&x.party==='owner'))continue;
        const no=S.db.settings.nextSvc||1;S.db.settings.nextSvc=no+1;
        SV().push({id:'s'+uid(),no,pid:o.pid,unit:o.unit,type:o.type,year:o.year,party:'owner',name:o.owner||svPartyName(o.pid,o.unit,'owner'),base:o.amt,vat:svVat(),total:svTot(o.amt),payee:o.payee,due:o.due,pays:[],log:[{at:mtTime(),text:'تم الاستيراد من Excel'}],created:iso(TODAY)});ni++}
    }
    persist();render();toast('تم: '+nu+' وحدة جديدة، '+ni+' رسم')}});
}
Object.assign(act,{svTpl,svImp:svImport});
