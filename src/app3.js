/* التقارير + تصدير Excel */
'use strict';
Object.assign(S,{rp:{tab:'ov',p:'',owner:'',tenant:'',from:'',to:'',rep:'pay',fo:'',ft:'',kd:''}});
const plain=h=>{const d=document.createElement('div');d.innerHTML=String(h??'');return d.textContent.replace(/\s+/g,' ').trim()};
async function exportXlsx(name,m){
  if(!m){toast('لا يوجد تقرير لتصديره');return}
  const cols=m.cols.filter(c=>c.k!=='ac'),aoa=[[tr(m.title)],[tr(plain(m.sub||''))],[],cols.map(c=>tr(plain(c.h)))];
  const cv=(c,h)=>{const t=tr(plain(h));if(c&&c.k==='n'){const n=Number(t.replace(/[,٬\s]/g,''));if(t!==''&&isFinite(n))return n}return t};
  for(const r of m.rows){const sp=r.span||0;let cells=r.cells;
    if(sp>1)cells=[cells[0],...Array(sp-1).fill(''),...cells.slice(1)];
    aoa.push(cols.map((c,i)=>cv(c,cells[i]??'')))}
  if(m.foot){let f=m.foot;if(m.footSpan>1)f=[f[0],...Array(m.footSpan-1).fill(''),...f.slice(1)];aoa.push(cols.map((c,i)=>cv(c,f[i]??'')))}
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=cols.map((c,i)=>({wch:Math.min(38,Math.max(10,...aoa.slice(3).map(r=>String(r[i]??'').length+2)))}));
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:Math.max(0,cols.length-1)}},{s:{r:1,c:0},e:{r:1,c:Math.max(0,cols.length-1)}}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,plain(m.title).slice(0,28)||'تقرير');
  wb.Workbook={Views:[{RTL:true}]};
  await saveWb(safe(name)+'-'+iso(TODAY)+'.xlsx',wb);
}
/* ===== رسوم بيانية ===== */
const CLR=['#14234b','#4aa8e8','#9ec9ef','#c9d6e8'];
function barSvg(labels,A,B,la,lb){
  const W=760,H=230,pl=46,pb=30,pt=14,n=labels.length,mx=Math.max(1,...A,...B),bw=(W-pl)/n;
  const y=v=>pt+(H-pt-pb)*(1-v/mx);
  let g='';for(let i=0;i<=4;i++){const v=mx*i/4,yy=y(v);g+=`<line x1="${pl}" x2="${W}" y1="${yy}" y2="${yy}" stroke="#e3ecf7"/><text x="${pl-6}" y="${yy+4}" text-anchor="end" font-size="10" fill="#56637e">${v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?Math.round(v/1e3)+'K':Math.round(v)}</text>`}
  labels.forEach((l,i)=>{const x=pl+i*bw+bw*.14,w=bw*.34;
    g+=`<rect x="${x}" y="${y(A[i])}" width="${w}" height="${H-pb-y(A[i])}" rx="3" fill="${CLR[1]}"><title>${esc(la)}: ${fm(A[i])}</title></rect><rect x="${x+w+2}" y="${y(B[i])}" width="${w}" height="${H-pb-y(B[i])}" rx="3" fill="${CLR[0]}"><title>${esc(lb)}: ${fm(B[i])}</title></rect><text x="${pl+i*bw+bw/2}" y="${H-10}" text-anchor="middle" font-size="10" fill="#56637e">${esc(l)}</text>`});
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;direction:ltr" role="img">${g}</svg><div class="lg"><i style="background:${CLR[1]}"></i>${esc(la)}<i style="background:${CLR[0]}"></i>${esc(lb)}</div>`;
}
function donut(parts){
  const tot=Math.max(1,sum(parts,p=>p.v)),R=52,C=2*Math.PI*R;let off=0,seg='';
  for(const p of parts){const l=C*p.v/tot;seg+=`<circle r="${R}" cx="70" cy="70" fill="none" stroke="${p.c}" stroke-width="20" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${esc(p.l)}: ${p.v}</title></circle>`;off+=l}
  return `<div class="dn"><svg viewBox="0 0 140 140" width="140" height="140">${seg}<text x="70" y="66" text-anchor="middle" font-size="22" font-weight="700" fill="#14234b">${tot}</text><text x="70" y="84" text-anchor="middle" font-size="10" fill="#56637e">وحدة</text></svg><ul>${parts.map(p=>`<li><i style="background:${p.c}"></i>${esc(p.l)} <b>${p.v}</b></li>`).join('')}</ul></div>`;
}
function hbars(list,fmt){
  const mx=Math.max(1,...list.map(x=>Math.max(x.a,x.b)));
  return list.map(x=>`<div class="hb"><div class="t"><span>${esc(x.l)}</span><b>${fmt(x.b)} / ${fmt(x.a)}</b></div><div class="pb"><i style="width:${x.a?Math.min(100,x.b/x.a*100):0}%"></i></div></div>`).join('');
}
/* ===== مساعدات ===== */
const rpIn=(t,D)=>{const f=pd(D.from),e=pd(D.to);return t!=null&&(f==null||t>=f)&&(e==null||t<=e)};
const mkey=t=>iso(t).slice(0,7);
function setPm(title,sub,cols,rws,foot){S.pm={title,sub,cols,rows:rws,foot};return T(cols,rws,{foot})}
function bucketAge(d){return d<=30?0:d<=90?1:d<=180?2:3}
const AGE=['0–30 يومًا','31–90 يومًا','91–180 يومًا','أكثر من 180'];
/* ===== التبويبات ===== */
function nameBar(){const D=S.rp;return `<div class="bar"><input id="rp_fo" list="dl_rpo" placeholder="فلتر باسم المالك…" value="${esc(D.fo)}"><input id="rp_ft" list="dl_rpt" placeholder="فلتر باسم المستأجر…" value="${esc(D.ft)}">${msel('rp.p',PL(),'كل المشاريع')}${(D.fo||D.ft||D.p)?'<button class="btn" data-a="rpClear">مسح الفلاتر</button>':''}<datalist id="dl_rpo">${ownerNames(ALLR).map(n=>`<option value="${esc(n)}">`).join('')}</datalist><datalist id="dl_rpt">${tenantNames(ALLR).map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div>`}
let ALLR=[];
const nf=(a,k,v)=>!v||String(a.c[k]||'').toLowerCase().includes(v.toLowerCase());
function tabOv(all){all=all.filter(x=>(MS(S.rp.p,x.pid))&&nf(x,'owner',S.rp.fo)&&nf(x,'tenant',S.rp.ft));
  const T_=sum(all,x=>x.r.total||0),P_=sum(all,x=>x.r.paid||0),R_=sum(all,x=>x.r.rem>0?x.r.rem:0),L_=sum(all,x=>x.r.late),US=unitsSummary(),
    us=k=>sum(US,m=>m[k]);
  const months=[];for(let i=11;i>=0;i--){const d=new Date(TODAY+0);const t=new Date(Date.UTC(new Date(TODAY).getUTCFullYear(),new Date(TODAY).getUTCMonth()-i,1));months.push(t.toISOString().slice(0,7))}
  const exp=Object.fromEntries(months.map(m=>[m,0])),col=Object.fromEntries(months.map(m=>[m,0]));
  for(const x of all){for(const i of x.r.inst){const k=mkey(i.date);if(k in exp)exp[k]+=i.amount}for(const p of x.c.payments||[]){const t=pd(p.date);if(t!=null){const k=mkey(t);if(k in col)col[k]+=+p.amount||0}}}
  const age=[0,0,0,0];for(const x of all)for(const i of x.r.inst)if(i.late)age[bucketAge(Math.round((TODAY-i.date)/DAY))]+=i.due;
  const byP=Object.entries(P()).map(([pid,p])=>{const rs=all.filter(x=>x.pid===pid);return{l:p.name,a:sum(rs,x=>x.r.total||0),b:sum(rs,x=>x.r.paid||0)}}).sort((a,b)=>b.a-a.a);
  const KD=S.rp.kd,k=(l,v,i,c,key)=>`<button class="kp ${c||''}${KD===key?' on':''}" data-a="rpKd" data-k="${key}" title="اضغط لعرض كشف التفاصيل"><span>${l}</span><b>${v}</b><i>${i||''}</i></button>`;
  S.pm=null;
  const kdv=KD?(()=>{const m=kdModel(ALLR,KD);setPm(m.title,m.sub,m.cols,m.rows,m.foot);S.pm.footSpan=m.footSpan;S.pm.pre=m.pre;S.pm.post=m.post;return `<div class="row" style="margin:4px 0 10px;justify-content:space-between"><h3 style="margin:0">${esc(m.title)} <span class="bd2">${m.n}</span></h3><span><button class="btn" data-a="rpKd" data-k="">← عودة للنظرة العامة</button> ${pbtn('list')}</span></div>${m.pre}${m.noSch.length?`<div class="warnbox" style="display:block;margin-bottom:10px"><details><summary><b>${m.noSch.length} عقدًا بلا جدول أقساط</b> (دورة الدفع أو التواريخ ناقصة) فلا تظهر دفعاتها في هذا الكشف — اضغط لعرضها وإكمالها من «تعديل العقد»</summary><p style="margin:8px 0 0">${m.noSch.map(x=>`<button class="link"${open_(x)}>${esc(x.pn)} / ${esc(x.c.unit)}</button>`).join('، ')}</p></details></div>`:''}${m.n?T(m.cols,m.rows,{foot:m.foot,footSpan:m.footSpan})+m.post:'<div class="card empty">لا توجد بنود ضمن الفلاتر الحالية.</div>'}`})():'';
  return `<div class="kpis">${k('إجمالي قيمة العقود',fm(T_),all.length+' عقدًا','','total')}${k('المحصَّل',fm(P_),T_?Math.round(P_/T_*100)+'% من الإجمالي':'','','paid')}${k('المتبقي',fm(R_),'','','rem')}${k('المتأخر',fm(L_),all.filter(x=>x.r.late_n).length+' عقدًا','l','late')}${k('نسبة الإشغال',us('total')?Math.round(us('rented')/us('total')*100)+'%':'—',us('rented')+' من '+us('total')+' وحدة','','occ')}${k('متاحة للإيجار',us('avail'),'منتهية بانتظار القرار: '+us('pend'),'','avail')}</div>
${KD?kdv:`<div class="g2"><div class="card"><h3>التحصيل مقابل المتوقع — آخر 12 شهرًا</h3>${barSvg(months.map(m=>m.slice(5)+'/'+m.slice(2,4)),months.map(m=>exp[m]),months.map(m=>col[m]),'المتوقع','المحصَّل')}</div>
<div class="card"><h3>الإشغال</h3>${donut([{l:'مؤجرة',v:us('rented'),c:CLR[0]},{l:'متاحة',v:us('avail'),c:CLR[1]},{l:'منتهية بانتظار القرار',v:us('pend'),c:'#e6b94d'},{l:'غير متاحة',v:us('unavail'),c:CLR[3]}])}</div></div>
<div class="g2"><div class="card"><h3>المحصَّل / إجمالي العقود حسب المشروع</h3>${hbars(byP,fm)}</div>
<div class="card"><h3>أعمار المتأخرات</h3>${barSvg(AGE,age,age.map(()=>0),'المتأخر','')}<p class="sub" style="margin:4px 0 0">إجمالي المتأخر ${fm(sum(age,v=>v))}</p></div></div>`}`;
}

/* ===== تفاصيل بطاقات النظرة العامة (كشف جاهز للطباعة والإرسال) ===== */
const KD_LAB={total:'إجمالي قيمة العقود',paid:'المحصَّل (الدفعات)',rem:'المتبقي',late:'المتأخر',occ:'الوحدات المؤجرة (الإشغال)',avail:'الوحدات المتاحة للإيجار'};
function kdModel(all,kd){
  const D=S.rp;
  const ownF=x=>nf(x,'owner',D.fo),tenF=x=>nf(x,'tenant',D.ft),proF=x=>MS(D.p,x.pid);
  const filt=all.filter(x=>proF(x)&&ownF(x)&&tenF(x));
  const base=[{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'بداية العقد',k:'d'},{h:'نهاية العقد',k:'d'}];
  const bc=x=>[esc(x.c.owner)||'—',esc(x.c.tenant)||'—',esc(x.pn),'<b>'+esc(x.c.unit)+'</b>',fs_(x.c.start),fs_(x.c.end)];
  const own=x=>String(x.c.owner||'').trim()||'(بدون مالك)';
  let cols,rows=[],title=KD_LAB[kd],note='';
  if(kd==='late'||kd==='rem'){
    cols=[...base,{h:'استحقاق الدفعة',k:'d'},{h:'رقم القسط',k:'d'},{h:'قيمة القسط',k:'n'},{h:'المسدد',k:'n'},...(kd==='late'?[{h:'المتأخر',k:'n'},{h:'أيام التأخر',k:'d'}]:[{h:'المتبقي',k:'n'},{h:'منه المتأخر',k:'n'},{h:'الحالة',k:'d'}])];
    for(const x of filt)for(const i of x.r.inst){if(!(i.due>0.005)||i.waived)continue;if(kd==='late'&&!i.late)continue;
      const days=i.date!=null?Math.round((TODAY-i.date)/DAY):0;
      rows.push({k:own(x),cid:x.pid+x.c.id,late:i.late?i.due:0,days:i.late?days:0,srt:[x.pn,String(x.c.unit),i.date??0],attrs:open_(x),cls:i.late?'late':'',v:{},cells:[...bc(x),i.date!=null?fd(i.date):'بلا تاريخ',i.n+' / '+x.r.k,fm(i.amount),fm(i.paid),'<b>'+fm(i.due)+'</b>',...(kd==='late'?[days]:[i.late?'<span style="color:var(--late)">'+fm(i.due)+'</span>':'—',i.late?'متأخر '+days+' يومًا':i.soon?'خلال 30 يومًا':'لم يحن بعد'])],
        _n:kd==='late'?[i.amount,i.paid,i.due]:[i.amount,i.paid,i.due,i.late?i.due:0]})}
    note=kd==='late'?'الأقساط المستحقة وغير المسددة بعد تاريخ استحقاقها':'كل الأقساط غير المسددة (متأخرة وقادمة)';
  }else if(kd==='total'){
    cols=[...base,{h:'أقدم/أقرب دفعة غير مسددة',k:'d'},{h:'رقم القسط',k:'d'},{h:'قيمة العقد',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'المتأخر',k:'n'},{h:'الحالة',k:'t'}];
    for(const x of filt){const nx=x.r.inst.find(i=>i.due>0.005&&!i.waived);
      rows.push({k:own(x),attrs:open_(x),cls:x.r.late_n?'late':'',cells:[...bc(x),nx&&nx.date!=null?fd(nx.date):'—',nx?nx.n+' / '+x.r.k:'—',fm(x.r.total),fm(x.r.paid),'<b>'+fm(x.r.rem>0?x.r.rem:0)+'</b>',x.r.late?'<span style="color:var(--late)">'+fm(x.r.late)+'</span>':'—',esc(x.r.st)],cid:x.pid+x.c.id,late:x.r.late||0,_n:[x.r.total||0,x.r.paid||0,x.r.rem>0?x.r.rem:0,x.r.late||0],srt:[x.pn,String(x.c.unit),pd(x.c.start)||0]})}
    note='كل العقود ضمن الفلاتر الحالية بقيمها ومسدّدها ومتبقيها';
  }else if(kd==='paid'){
    cols=[...base,{h:'تاريخ التحصيل',k:'d'},{h:'السند',k:'d'},{h:'المبلغ المحصَّل',k:'n'},{h:'طريقة السداد',k:'t'},{h:'ملاحظة',k:'t'}];
    for(const x of filt)for(const p of x.c.payments||[]){const t=pd(p.date);
      rows.push({k:own(x),cid:x.pid+x.c.id,attrs:open_(x),cells:[...bc(x),t!=null?fd(t):'—',p.rno?String(p.rno).padStart(5,'0'):'—','<b>'+fm(+p.amount||0)+'</b>',esc(p.method)||'—',esc(p.note)||'—'],_n:[+p.amount||0],srt:[x.pn,String(x.c.unit),t||0]})}
    note='كل الدفعات المحصَّلة مرتبة بالمالك ثم الوحدة ثم التاريخ';
  }else if(kd==='occ'){
    cols=[...base,{h:'الدفعة القادمة',k:'d'},{h:'مبلغها',k:'n'},{h:'إجمالي العقد',k:'n'},{h:'المتبقي',k:'n'},{h:'المتأخر',k:'n'}];
    for(const x of filt){if(x.r.st!=='ساري')continue;const nx=x.r.inst.find(i=>i.due>0.005);
      rows.push({k:own(x),attrs:open_(x),cells:[...bc(x),nx&&nx.date!=null?fd(nx.date):'—',nx?fm(nx.due):'—',fm(x.r.total),fm(x.r.rem>0?x.r.rem:0),x.r.late?'<span style="color:var(--late)">'+fm(x.r.late)+'</span>':'—'],cid:x.pid+x.c.id,late:x.r.late||0,_n:[nx?nx.due:0,x.r.total||0,x.r.rem>0?x.r.rem:0,x.r.late||0],srt:[x.pn,String(x.c.unit),0]})}
    note='الوحدات المؤجرة حاليًا بعقود سارية';
  }else{
    cols=[{h:'المالك',k:'t'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'النوع',k:'t'},{h:'آخر مستأجر',k:'t'},{h:'بداية آخر عقد',k:'d'},{h:'نهاية آخر عقد',k:'d'},{h:'شاغرة منذ (يوم)',k:'d'},{h:'الإيجار المطلوب',k:'n'}];
    for(const[pid,p]of Object.entries(P())){if(!MS(D.p,pid))continue;
      for(const u of p.units||[]){const i=unitInfo(p,u);if(i.st!=='avail')continue;const l=i.last;
        if(D.fo&&!String(u.owner||l?.c.owner||'').toLowerCase().includes(D.fo.toLowerCase()))continue;if(D.ft&&!String(l?.c.tenant||'').toLowerCase().includes(D.ft.toLowerCase()))continue;
        const e=l?pd(l.c.end):null,days=e!=null&&e<TODAY?Math.round((TODAY-e)/DAY):0;
        rows.push({k:String(u.owner||l?.c.owner||'').trim()||'(بدون مالك)',attrs:'',cells:[esc(u.owner||l?.c.owner)||'—',esc(p.name),'<b>'+esc(u.no)+'</b>',esc(u.type)||'—',l?esc(l.c.tenant)||'—':'لم تؤجَّر بعد',l?fs_(l.c.start):'—',l?fs_(l.c.end):'—',days||'—',u.askRent?fm(u.askRent):'—'],_n:[u.askRent||0],srt:[p.name,String(u.no),0]})}}
    note='الوحدات التي لا عقد ساريًا أو قادمًا لها';
  }
  const fi=cols.findIndex(c=>c.k==='n'),ncols=cols.map((c,j)=>c.k==='n'?j:-1).filter(j=>j>=0);
  const srt=(a,b)=>a.k.localeCompare(b.k,'ar')||a.srt[0].localeCompare(b.srt[0],'ar')||a.srt[1].localeCompare(b.srt[1],'ar',{numeric:true})||(a.srt[2]-b.srt[2]);
  rows.sort(srt);
  const out=rows.map(r=>({attrs:r.attrs,cls:r.cls,cells:r.cells}));
  const tot=ncols.map((j,ix)=>sum(rows,r=>r._n[ix]||0));
  const foot=['الإجمالي ('+rows.length+' بندًا)',...cols.slice(fi).map((c,j)=>{const ix=ncols.indexOf(fi+j);return ix>=0?fm(tot[ix]):''})];
  const owners=new Set(rows.map(r=>r.k)).size,cts=new Set(rows.map(r=>r.cid).filter(Boolean)).size,maxD=Math.max(0,...rows.map(r=>r.days||0));
  const tl=(l,v,c)=>`<div${c?` class="${c}"`:''}><span>${l}</span><b>${v}</b></div>`;
  const TL={late:[tl('عدد الأقساط المتأخرة',rows.length),tl('عدد العقود',cts),tl('عدد الملاك',owners),tl('أقدم تأخر (يوم)',maxD),tl('إجمالي المتأخر',fm(tot[2]),'lt')],
    rem:[tl('عدد الأقساط غير المسددة',rows.length),tl('إجمالي المتبقي',fm(tot[2])),tl('منه المتأخر',fm(tot[3]),'lt'),tl('منه لم يحن بعد',fm(tot[2]-tot[3])),tl('عدد العقود',cts)],
    total:[tl('عدد العقود',rows.length),tl('قيمة العقود',fm(tot[0])),tl('المسدد',fm(tot[1])),tl('المتبقي',fm(tot[2])),tl('منه المتأخر',fm(tot[3]),'lt')],
    paid:[tl('عدد الدفعات',rows.length),tl('إجمالي المحصَّل',fm(tot[0])),tl('عدد العقود',cts),tl('عدد الملاك',owners)],
    occ:[tl('الوحدات المؤجرة',rows.length),tl('إجمالي العقود',fm(tot[1])),tl('المتبقي',fm(tot[2])),tl('منه المتأخر',fm(tot[3]),'lt')],
    avail:[tl('الوحدات المتاحة',rows.length),tl('عدد الملاك',owners),tl('إجمالي الإيجار المطلوب',fm(tot[0]))]}[kd]||[];
  const HOW={late:'المتأخر هو ما مضى تاريخ استحقاقه ولم يُسدَّد بعد. الأسطر الحمراء أقساط تأخرت أكثر من 30 يومًا.',rem:'المتبقي = المتأخر + ما لم يحن موعده بعد. عمود «منه المتأخر» يبيّن الجزء الذي مضى تاريخ استحقاقه.',total:'قيمة العقد = المسدد + المتبقي، والمتأخر جزء من المتبقي.',paid:'كل دفعة محصَّلة بتاريخها ورقم سندها.',occ:'وحدات عليها عقد ساري حاليًا مع دفعتها القادمة.',avail:'وحدات لا عقد ساريًا أو قادمًا لها.'}[kd]||'';
  const summ=(keyF,label)=>{const M=new Map();for(const r of rows){const k=keyF(r);if(!M.has(k))M.set(k,[]);M.get(k).push(r)}
    const keys=[...M.keys()].sort((a,b)=>a.localeCompare(b,'ar')),hd=cols.filter(c=>c.k==='n');
    const rr=keys.map(k=>{const L=M.get(k);return{cells:['<b>'+esc(k)+'</b>',L.length,...ncols.map((j,ix)=>fm(sum(L,r=>r._n[ix]||0)))]}});
    return T([{h:label,k:'t'},{h:'البنود',k:'n'},...hd],rr,{foot:['الإجمالي',rows.length,...tot.map(fm)]})};
  const nProj=new Set(rows.map(r=>r.srt[0])).size;
  const pre=(TL.length?`<div class="sum" style="grid-template-columns:repeat(${TL.length},1fr)">${TL.join('')}</div>`:'')+(HOW?`<p class="sub" style="margin:8px 0">${HOW}</p>`:'');
  const post=rows.length?`<div style="break-inside:avoid"><h3 style="margin:16px 0 6px">ملخص حسب المالك</h3>${summ(r=>r.k,'المالك')}</div>`+(nProj>1?`<div style="break-inside:avoid"><h3 style="margin:16px 0 6px">ملخص حسب المشروع</h3>${summ(r=>r.srt[0],'المشروع')}</div>`:''):'';
  const subT=[D.p?'المشروع: '+pname(D.p):'كل المشاريع',D.fo?'المالك: '+D.fo:'',D.ft?'المستأجر: '+D.ft:'','بتاريخ '+iso(TODAY)].filter(Boolean).join(' — ');
  const noSch=filt.filter(x=>!x.r.inst.length&&['late','rem','total'].includes(kd));
  return{noSch,pre,post,title:'كشف — '+title,sub:subT+' — '+note,cols,rows:out,foot,footSpan:fi,n:rows.length};
}
function ownerNames(all){return [...new Set(all.map(x=>String(x.c.owner||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'))}
function tenantNames(all){return [...new Set(all.map(x=>String(x.c.tenant||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'))}
function subFilt(kind){const D=S.rp,own=kind==='owner';
  return `${msel('rp.p',PL(),'كل المشاريع')}<input id="${own?'rp_ft':'rp_fo'}" list="${own?'dl_rpt':'dl_rpo'}" placeholder="${own?'فلتر باسم المستأجر…':'فلتر باسم المالك…'}" value="${esc(own?D.ft:D.fo)}"><datalist id="${own?'dl_rpt':'dl_rpo'}">${(own?tenantNames(ALLR):ownerNames(ALLR)).map(n=>`<option value="${esc(n)}">`).join('')}</datalist>${(D.p||(own?D.ft:D.fo))?'<button class="btn" data-a="rpClear">مسح الفلاتر</button>':''}`}
function tabOwner(all){
  const D=S.rp;all=all.filter(x=>(MS(D.p,x.pid))&&nf(x,'tenant',D.ft));const names=ownerNames(all);
  const sel=`<div class="bar"><input id="rp_owner" list="dl_rpo" placeholder="ابحث باسم المالك أو اخترْه…" value="${esc(D.owner)}" style="min-width:260px"><datalist id="dl_rpo">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>${subFilt('owner')}${rpRange(D)}${D.owner?pbtn('list'):''}</div>`;
  if(!D.owner){S.pm=null;return sel+'<div class="card empty">اختر المالك لعرض كشف حسابه.</div>'}
  const exactO=names.includes(D.owner),mine=all.filter(x=>exactO?String(x.c.owner||'').trim()===D.owner:String(x.c.owner||'').toLowerCase().includes(D.owner.toLowerCase())),mv=[];
  for(const x of mine)for(const p of x.c.payments||[]){const t=pd(p.date);if(t!=null&&!rpIn(t,D))continue;mv.push({t:t??0,d:p.date||'',desc:'تحصيل دفعة'+(p.rno?' — سند '+String(p.rno).padStart(5,'0'):'')+(p.note?' — '+p.note:''),pn:x.pn,unit:x.c.unit,ten:x.c.tenant,cr:+p.amount||0,dr:0})}
  for(const a of S.db.analyses||[]){if(!(exactO?String(a.owner||'').trim()===D.owner:String(a.owner||'').toLowerCase().includes(D.owner.toLowerCase())))continue;if(!MS(D.p,a.pid))continue;if(D.ft&&!String(a.tenant||'').toLowerCase().includes(D.ft.toLowerCase()))continue;const t=pd(a.date);if(!rpIn(t,D))continue;const k=Fin.anaCalc(a,VATP());mv.push({t:t??0,d:a.date,desc:'خصومات التحليل المالي (إدارة وخدمات وضريبة وصيانة…)',pn:pname(a.pid),unit:a.unit,ten:a.tenant,cr:0,dr:k.totalDed})}
  mv.sort((a,b)=>a.t-b.t);let bal=0;
  const cols=[{h:'التاريخ',k:'d'},{h:'البيان',k:'t'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'محصَّل',k:'n'},{h:'مخصوم',k:'n'},{h:'الرصيد المستحق للمالك',k:'n'}];
  const rws=mv.map(m=>{bal=Fin.r2(bal+m.cr-m.dr);return{cells:[fs_(m.d),esc(m.desc),esc(m.pn),'<b>'+esc(m.unit)+'</b>',esc(m.ten)||'—',m.cr?fm(m.cr):'—',m.dr?fm(m.dr):'—','<b>'+fm(bal)+'</b>']}});
  const tc=sum(mv,m=>m.cr),td=sum(mv,m=>m.dr);
  const proj=[...new Set(mine.map(x=>x.pn))].join('، ');
  const t1=setPm('كشف حساب مالك — '+D.owner,'المشاريع: '+proj+(D.from||D.to?' — الفترة: '+(D.from||'…')+' إلى '+(D.to||'…'):''),cols,rws,['الإجمالي','','','','',fm(tc),fm(td),fm(tc-td)]);
  const ccols=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'بداية',k:'d'},{h:'نهاية',k:'d'},{h:'قيمة العقد',k:'n'},{h:'المحصَّل',k:'n'},{h:'المتبقي',k:'n'},{h:'الحالة',k:'t'}];
  const t2=T(ccols,mine.map(x=>({attrs:open_(x),cells:[esc(x.pn),'<b>'+esc(x.c.unit)+'</b>',esc(x.c.tenant)||'—',fs_(x.c.start),fs_(x.c.end),fm(x.r.total),fm(x.r.paid),fm(x.r.rem>0?x.r.rem:0),esc(x.r.st)]})));
  return sel+`<div class="kpis"><div class="kp static"><span>إجمالي المحصَّل</span><b>${fm(tc)}</b></div><div class="kp static"><span>إجمالي الخصومات</span><b>${fm(td)}</b></div><div class="kp static"><span>صافي المستحق للمالك</span><b>${fm(tc-td)}</b></div><div class="kp static"><span>عدد العقود</span><b>${mine.length}</b></div></div><h3>حركة الحساب</h3>${t1}<h3>عقود المالك</h3>${t2}`;
}
function tabTenant(all){
  const D=S.rp;all=all.filter(x=>(MS(D.p,x.pid))&&nf(x,'owner',D.fo));const names=tenantNames(all);
  const sel=`<div class="bar"><input id="rp_tenant" list="dl_rpt" placeholder="ابحث باسم المستأجر أو اخترْه…" value="${esc(D.tenant)}" style="min-width:260px"><datalist id="dl_rpt">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>${subFilt('tenant')}${rpRange(D)}${D.tenant?pbtn('list'):''}</div>`;
  if(!D.tenant){S.pm=null;return sel+'<div class="card empty">اختر المستأجر لعرض كشف حسابه.</div>'}
  const exactT=names.includes(D.tenant),mine=all.filter(x=>exactT?String(x.c.tenant||'').trim()===D.tenant:String(x.c.tenant||'').toLowerCase().includes(D.tenant.toLowerCase())),mv=[];
  for(const x of mine){
    for(const i of x.r.inst){if(!rpIn(i.date,D))continue;mv.push({t:i.date,o:0,d:iso(i.date),desc:'قسط مستحق '+i.n+' / '+x.r.k,pn:x.pn,unit:x.c.unit,dr:i.amount,cr:0})}
    for(const p of x.c.payments||[]){const t=pd(p.date);if(t!=null&&!rpIn(t,D))continue;mv.push({t:t??0,o:1,d:p.date||'',desc:'دفعة'+(p.rno?' — سند '+String(p.rno).padStart(5,'0'):'')+(p.method?' — '+p.method:'')+(p.note?' — '+p.note:''),pn:x.pn,unit:x.c.unit,dr:0,cr:+p.amount||0})}
  }
  mv.sort((a,b)=>a.t-b.t||a.o-b.o);let bal=0;
  const cols=[{h:'التاريخ',k:'d'},{h:'البيان',k:'t'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'مدين (مستحق)',k:'n'},{h:'دائن (مسدد)',k:'n'},{h:'الرصيد',k:'n'}];
  const rws=mv.map(m=>{bal=Fin.r2(bal+m.dr-m.cr);return{cells:[fs_(m.d),esc(m.desc),esc(m.pn),'<b>'+esc(m.unit)+'</b>',m.dr?fm(m.dr):'—',m.cr?fm(m.cr):'—','<b>'+fm(bal)+'</b>']}});
  const td=sum(mv,m=>m.dr),tc=sum(mv,m=>m.cr);
  const html=setPm('كشف حساب مستأجر — '+D.tenant,'الوحدات: '+[...new Set(mine.map(x=>x.pn+' / '+x.c.unit))].join('، ')+(D.from||D.to?' — الفترة: '+(D.from||'…')+' إلى '+(D.to||'…'):''),cols,rws,['الإجمالي','','','',fm(td),fm(tc),fm(td-tc)]);
  return sel+`<div class="kpis"><div class="kp static"><span>إجمالي المستحق</span><b>${fm(td)}</b></div><div class="kp static"><span>إجمالي المسدد</span><b>${fm(tc)}</b></div><div class="kp ${td>tc?'l':''} static"><span>الرصيد المتبقي على المستأجر</span><b>${fm(td-tc)}</b></div><div class="kp static"><span>عدد العقود</span><b>${mine.length}</b></div></div>${html}`;
}
const REPS={pay:'سجل الدفعات المحصَّلة',age:'أعمار الديون لكل عقد',proj:'ملخص المشاريع',own:'ملخص الملاك',ded:'خصومات التحليل المالي',units:'سجل الوحدات والإشغال'};
function tabTables(all){
  const D=S.rp;let html='';
  const bar=`<div class="bar"><select id="rp_rep">${Object.entries(REPS).map(([k,l])=>`<option value="${k}"${D.rep===k?' selected':''}>${l}</option>`).join('')}</select>${msel('rp.p',PL(),'كل المشاريع')}<input id="rp_fo" list="dl_rpo" placeholder="فلتر باسم المالك…" value="${esc(D.fo)}"><input id="rp_ft" list="dl_rpt" placeholder="فلتر باسم المستأجر…" value="${esc(D.ft)}"><datalist id="dl_rpo">${ownerNames(all).map(n=>`<option value="${esc(n)}">`).join('')}</datalist><datalist id="dl_rpt">${tenantNames(all).map(n=>`<option value="${esc(n)}">`).join('')}</datalist>${rpRange(D)}${pbtn('list')}</div>`;
  const per=(D.from||D.to?' — الفترة: '+(D.from||'…')+' إلى '+(D.to||'…'):'')+(D.p?' — المشروع: '+pname(D.p):'');
  const A=all.filter(x=>(MS(D.p,x.pid))&&nf(x,'owner',D.fo)&&nf(x,'tenant',D.ft));
  if(D.rep==='pay'){
    const L=[];for(const x of A)for(const p of x.c.payments||[]){const t=pd(p.date);if(t!=null&&!rpIn(t,D))continue;if(t==null&&(D.from||D.to))continue;L.push({x,p,t:t??0})}L.sort((a,b)=>b.t-a.t);
    html=setPm(REPS.pay,per.slice(3)||'كل الفترات',[{h:'تاريخ التحصيل',k:'d'},{h:'سند',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'المبلغ',k:'n'},{h:'استحقاق من',k:'d'},{h:'استحقاق إلى',k:'d'},{h:'طريقة الدفع',k:'t'}],
      L.map(({x,p})=>({cells:[fs_(p.date),p.rno?String(p.rno).padStart(5,'0'):'—',esc(x.pn),'<b>'+esc(x.c.unit)+'</b>',esc(x.c.owner)||'—',esc(x.c.tenant)||'—',fm(p.amount),fs_(p.from),fs_(p.to),esc(p.method)||'—']})),['الإجمالي: '+L.length,'','','','','',fm(sum(L,o=>+o.p.amount||0)),'','','']);
  }else if(D.rep==='age'){
    const L=A.filter(x=>x.r.late_n).map(x=>{const b=[0,0,0,0];for(const i of x.r.inst)if(i.late)b[bucketAge(Math.round((TODAY-i.date)/DAY))]+=i.due;return{x,b}}).sort((a,b)=>sum(b.b,v=>v)-sum(a.b,v=>v));
    html=setPm(REPS.age,per.slice(3)||'كل المشاريع',[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},...AGE.map(h=>({h,k:'n'})),{h:'الإجمالي',k:'n'}],
      L.map(({x,b})=>({attrs:open_(x),cells:[esc(x.pn),'<b>'+esc(x.c.unit)+'</b>',esc(x.c.tenant)||'—',...b.map(v=>v?fm(v):'—'),'<b>'+fm(sum(b,v=>v))+'</b>']})),['الإجمالي: '+L.length,'','',...[0,1,2,3].map(i=>fm(sum(L,o=>o.b[i]))),fm(sum(L,o=>sum(o.b,v=>v)))]);
  }else if(D.rep==='proj'){
    const US=Object.fromEntries(unitsSummary().map(m=>[m.pid,m]));const L=Object.entries(P()).filter(([k])=>MS(D.p,k)).map(([pid,p])=>{const rs=all.filter(x=>x.pid===pid),m=US[pid];return{n:p.name,m,act:rs.filter(x=>x.r.st==='ساري').length,t:sum(rs,x=>x.r.total||0),pd:sum(rs,x=>x.r.paid||0),rem:sum(rs,x=>x.r.rem>0?x.r.rem:0),late:sum(rs,x=>x.r.late)}});
    html=setPm(REPS.proj,'كل المشاريع',[{h:'المشروع',k:'t'},{h:'الوحدات',k:'n'},{h:'مؤجرة',k:'n'},{h:'متاحة',k:'n'},{h:'بانتظار القرار',k:'n'},{h:'عقود سارية',k:'n'},{h:'إجمالي العقود',k:'n'},{h:'المحصَّل',k:'n'},{h:'المتبقي',k:'n'},{h:'المتأخر',k:'n'}],
      L.map(o=>({cells:['<b>'+esc(o.n)+'</b>',o.m.total,o.m.rented,o.m.avail,o.m.pend,o.act,fm(o.t),fm(o.pd),fm(o.rem),fm(o.late)]})),['الإجمالي',sum(L,o=>o.m.total),sum(L,o=>o.m.rented),sum(L,o=>o.m.avail),sum(L,o=>o.m.pend),sum(L,o=>o.act),fm(sum(L,o=>o.t)),fm(sum(L,o=>o.pd)),fm(sum(L,o=>o.rem)),fm(sum(L,o=>o.late))]);
  }else if(D.rep==='own'){
    const L=ownerStatements(A);
    html=setPm(REPS.own,per.slice(3)||'كل الملاك',[{h:'المالك',k:'t'},{h:'المشاريع',k:'t'},{h:'الوحدات',k:'n'},{h:'العقود',k:'n'},{h:'قيمة العقود',k:'n'},{h:'المحصَّل',k:'n'},{h:'المتبقي',k:'n'},{h:'المتأخر',k:'n'}],
      L.map(o=>({cells:['<b>'+esc(o.name)+'</b>',esc(o.projects.join('، ')),o.units,o.contracts,fm(o.total),fm(o.paid),fm(o.rem),fm(o.late)]})),['الإجمالي: '+L.length,'',sum(L,o=>o.units),sum(L,o=>o.contracts),fm(sum(L,o=>o.total)),fm(sum(L,o=>o.paid)),fm(sum(L,o=>o.rem)),fm(sum(L,o=>o.late))]);
  }else if(D.rep==='ded'){
    const L=(S.db.analyses||[]).filter(a=>(MS(D.p,a.pid))&&rpIn(pd(a.date),D)).map(a=>({a,k:Fin.anaCalc(a,VATP())}));
    html=setPm(REPS.ded,per.slice(3)||'كل الفترات',[{h:'التاريخ',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'الدفعة',k:'n'},{h:'إدارة وخدمات وعقد',k:'n'},{h:'الضريبة',k:'n'},{h:'خصومات أخرى',k:'n'},{h:'إجمالي الخصم',k:'n'},{h:'صافي المالك',k:'n'}],
      L.map(({a,k})=>({cells:[fs_(a.date),esc(pname(a.pid)),'<b>'+esc(a.unit)+'</b>',esc(a.owner)||'—',fm(k.payment),fm(k.taxBase),fm(k.vat),fm(k.nonTax),fm(k.totalDed),fm(k.netOwner)]})),['الإجمالي: '+L.length,'','','',...[k=>k.payment,k=>k.taxBase,k=>k.vat,k=>k.nonTax,k=>k.totalDed,k=>k.netOwner].map(f=>fm(sum(L,o=>f(o.k))))]);
  }else{
    const L=[];for(const[pid,p]of Object.entries(P())){if(!MS(D.p,pid))continue;for(const u of p.units||[]){const i=unitInfo(p,u);L.push({p,u,i})}}
    const ST={rented:'مؤجرة',avail:'متاحة للإيجار',pend:'منتهية بانتظار القرار',unavail:'غير متاحة'};
    html=setPm(REPS.units,per.slice(3)||'كل المشاريع',[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'النوع',k:'t'},{h:'الحالة',k:'t'},{h:'المستأجر الحالي',k:'t'},{h:'نهاية العقد',k:'d'},{h:'الإيجار السنوي الحالي',k:'n'}],
      L.map(({p,u,i})=>({cells:[esc(p.name),'<b>'+esc(u.no)+'</b>',esc(u.owner)||'—',esc(u.type)||'—',ST[i.st],i.act?esc(i.act.c.tenant):'—',i.act?fs_(i.act.c.end):'—',i.act?fm(i.act.r.total):'—']})),['الإجمالي: '+L.length,'','','','','','','']);
  }
  return bar+html;
}
function rpRange(D){return `<label>من ${dateField('rp_from',D.from)}</label><label>إلى ${dateField('rp_to',D.to)}</label>`}
const RT=[['ov','نظرة عامة'],['owner','كشف حساب مالك'],['tenant','كشف حساب مستأجر'],['tab','تقارير جدولية']];
function vRep(all){
  const D=S.rp;ALLR=all;const body=D.tab==='ov'?nameBar()+tabOv(all):D.tab==='owner'?tabOwner(all):D.tab==='tenant'?tabTenant(all):tabTables(all);
  return `<h1>التقارير</h1><p class="sub">داشبورد شامل لتفاصيل الإيجارات، وكشوف حساب للمالك والمستأجر بكل حركاتهم، وتقارير جدولية جاهزة. كل تقرير يُطبع ويُحفظ PDF ويُصدَّر Excel.</p>
<div class="tabs">${RT.map(([k,l])=>`<button data-a="rpTab" data-t="${k}" class="${D.tab===k?'on':''}">${l}</button>`).join('')}</div>${body}`;
}
VF.rep=vRep;
Object.assign(act,{rpKd:b=>{S.rp.kd=b.dataset.k||'';render()},rpClear:()=>{Object.assign(S.rp,{fo:'',ft:'',p:''});render()},rpTab:b=>{S.rp.tab=b.dataset.t;render()},xlsx:()=>exportXlsx(S.pm?.title||'report',S.pm)});
document.addEventListener('change',e=>{
  const id=e.target.id,v=e.target.value,D=S.rp;
  if(id==='rp_owner')D.owner=v;else if(id==='rp_tenant')D.tenant=v;else if(id==='rp_from')D.from=v;else if(id==='rp_to')D.to=v;else if(id==='rp_p')D.p=v;else if(id==='rp_rep')D.rep=v;else if(id==='rp_fo')D.fo=v.trim();else if(id==='rp_ft')D.ft=v.trim();else return;
  render();
});
