/* حصر الوحدات والملاك: استيراد (مشروع / وحدة / مالك) وتقارير الأعداد */
Object.assign(S,{iv:{tab:'proj',p:'',q:'',s:''}});
const ivKey=u=>String(u||'').replace(/[\s\/\-_]/g,'').toLowerCase();
const ivCanon=u=>{const t=String(u||'').replace(/\s+/g,' ').trim(),m=t.match(/^([A-Za-z])\s*[\/\-]?\s*(\d+)$/);return m?((m[1].toUpperCase()==='S'&&t.includes('-'))?'S-'+m[2]:m[1].toUpperCase()+m[2]):t};
function ivUnits(){
  const out=new Map(),act=new Set();
  for(const[pid,p]of Object.entries(P())){
    const put=(no,owner,src)=>{if(!no)return;const k=pid+'|'+ivKey(no);let o=out.get(k);if(!o){o={pid,pn:p.name,unit:no,owner:'',src,rented:false};out.set(k,o)}if(owner&&!o.owner)o.owner=nm(owner);if(src==='rent')o.src='rent'};
    for(const u of p.units||[])put(u.no,u.owner,'rent');
    const cs=[...(p.contracts||[])].sort((a,b)=>(pd(b.end)||0)-(pd(a.end)||0));
    for(const c of cs){put(c.unit,c.owner,'rent');const o=out.get(pid+'|'+ivKey(c.unit));if(o&&calc(c,MODE(),TODAY).st==='ساري')o.rented=true}
  }
  for(const f of FU()){if(!P()[f.pid])continue;const k=f.pid+'|'+ivKey(f.no);let o=out.get(k);if(!o){o={pid:f.pid,pn:P()[f.pid].name,unit:f.no,owner:'',src:'fee',rented:false};out.set(k,o)}if(f.owner&&!o.owner)o.owner=nm(f.owner)}
  for(const o of out.values())if(/شركه?\s*السليمان\s*العقار/.test(String(o.owner).replace(/ة/g,'ه')))o.owner='';
  return[...out.values()].sort((a,b)=>a.pn.localeCompare(b.pn,'ar')||String(a.unit).localeCompare(String(b.unit),'ar',{numeric:true}));
}
function vInv(){
  const E=S.iv,all=ivUnits(),q=E.q.toLowerCase();
  const L=all.filter(o=>(MS(E.p,o.pid))&&AO(E.s,z=>z==='sold'?o.owner:z==='unsold'?!o.owner:z==='rented'?o.rented:z==='fee'?o.src==='fee':true)&&(!q||txt(o.unit,o.owner,o.pn).includes(q)));
  const sel=(id,v,opts)=>`<select id="${id}">${opts.map(([a,b])=>`<option value="${esc(a)}"${String(a)===String(v)?' selected':''}>${esc(b)}</option>`).join('')}</select>`;
  const tabs=[['proj','حسب المشروع'],['own','حسب المالك'],['units','قائمة الوحدات']];
  const kp=(l,v,i)=>`<div class="kp static"><span>${l}</span><b>${v}</b><i>${i||''}</i></div>`;
  const owners=new Set(all.filter(o=>o.owner).map(o=>nm(o.owner)));
  let body='';
  if(E.tab==='proj'){
    const g=Object.entries(P()).map(([pid,p])=>{const a=all.filter(o=>o.pid===pid);return{n:p.name,t:a.length,s:a.filter(o=>o.owner).length,u:a.filter(o=>!o.owner).length,r:a.filter(o=>o.rented).length,w:new Set(a.filter(o=>o.owner).map(o=>nm(o.owner))).size,f:a.filter(o=>o.src==='fee').length}}).filter(o=>!MSV(E.p).length||MSV(E.p).some(i=>P()[i]&&P()[i].name===o.n)).sort((a,b)=>a.n.localeCompare(b.n,'ar'));
    const cols=[{h:'المشروع',k:'t'},{h:'إجمالي الوحدات',k:'n'},{h:'مباعة (لها مالك)',k:'n'},{h:'غير مباعة',k:'n'},{h:'عدد الملاك',k:'n'},{h:'مؤجرة حاليًا',k:'n'},{h:'للرسوم فقط',k:'n'}];
    const foot=['الإجمالي',sum(g,o=>o.t),sum(g,o=>o.s),sum(g,o=>o.u),new Set(all.filter(o=>(MS(E.p,o.pid))&&o.owner).map(o=>nm(o.owner))).size,sum(g,o=>o.r),sum(g,o=>o.f)];
    const rows=g.map(o=>({cells:['<b>'+esc(o.n)+'</b>',o.t,o.s,o.u,o.w,o.r,o.f]}));
    S.pm={title:'حصر الوحدات حسب المشروع',sub:'إجمالي الوحدات: '+foot[1],cols,rows:g.map(o=>({cells:[o.n,o.t,o.s,o.u,o.w,o.r,o.f]})),foot,footSpan:0};
    body=T(cols,rows,{foot,footSpan:0});
  }else if(E.tab==='own'){
    const m=new Map();for(const o of L){if(!o.owner)continue;const x=m.get(nm(o.owner))||{n:nm(o.owner),u:[],p:new Set};x.u.push(o);x.p.add(o.pn);m.set(x.n,x)}
    const g=[...m.values()].sort((a,b)=>b.u.length-a.u.length||a.n.localeCompare(b.n,'ar'));
    const cols=[{h:'المالك',k:'t'},{h:'عدد الوحدات',k:'n'},{h:'المشاريع',k:'t'},{h:'الوحدات',k:'t'}];
    const sh=a=>a.length>8?a.slice(0,8).join('، ')+' … (+'+(a.length-8)+')':a.join('، ');
    const rows=g.map(o=>({attrs:` data-a="ivOwner" data-n="${esc(o.n)}"`,cells:['<b>'+esc(o.n)+'</b>',o.u.length,esc([...o.p].join('، ')),esc(sh(o.u.map(x=>x.unit)))]}));
    const foot=['الإجمالي ('+g.length+' مالك)',sum(g,o=>o.u.length),'',''];
    S.pm={title:'حصر الوحدات حسب المالك',sub:'عدد الملاك: '+g.length,cols,rows:g.map(o=>({cells:[o.n,o.u.length,[...o.p].join('، '),o.u.map(x=>x.pn+'/'+x.unit).join('، ')]})),foot,footSpan:0};
    body=g.length?T(cols,rows,{foot,footSpan:0}):'<p class="empty">لا توجد نتائج.</p>';
  }else{
    const cols=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'الحالة',k:'d'},{h:'الإيجار',k:'d'},{h:'المصدر',k:'d'}];
    const cell=o=>[o.pn,o.unit,o.owner||'—',o.owner?'مباعة':'غير مباعة',o.rented?'مؤجرة':'—',o.src==='fee'?'للرسوم فقط':'ضمن الإيجار'];
    S.pm={title:'قائمة الوحدات والملاك',sub:'عدد الوحدات: '+L.length,cols,rows:L.map(o=>({cells:cell(o)})),foot:['الإجمالي ('+L.length+')','','','','',''],footSpan:0};
    body=L.length?T(cols,L.map(o=>({cells:cell(o).map((c,i)=>i===1?'<b>'+esc(c)+'</b>':esc(c))})),{foot:S.pm.foot,footSpan:0}):'<p class="empty">لا توجد نتائج.</p>';
  }
  return `<h1>حصر الوحدات والملاك</h1><p class="sub">عدد وحدات كل مشروع وكل مالك، المباعة وغير المباعة. الوحدات التي لا ندير تأجيرها تظهر هنا وفي الرسوم فقط، ولا تظهر في شاشات الإيجار.</p>
<div class="bar"><div class="tabs">${tabs.map(([k,l])=>`<button class="btn sm${E.tab===k?' p':''}" data-a="ivTab" data-t="${k}">${l}</button>`).join('')}</div>
${msel('iv.p',PL(),'كل المشاريع')}${E.tab!=='proj'?msel('iv.s',[['sold','المباعة'],['unsold','غير المباعة'],['rented','المؤجرة حاليًا'],['fee','للرسوم فقط']],'كل الوحدات'):''}${E.tab!=='proj'?`<input type="search" id="iv_q" placeholder="بحث: مالك أو وحدة" value="${esc(E.q)}">`:''}
<button class="btn p" data-a="ivImp">استيراد حصر (Excel)</button>${pbtn('list')}</div>
<div class="kpis sm">${kp('إجمالي الوحدات',all.length)}${kp('مباعة',all.filter(o=>o.owner).length)}${kp('غير مباعة',all.filter(o=>!o.owner).length)}${kp('عدد الملاك',owners.size)}${kp('للرسوم فقط',all.filter(o=>o.src==='fee').length)}</div>${body}`;
}
VF.inv=vInv;
function ivOwnerDlg(name){
  const L=ivUnits().filter(o=>nm(o.owner)===name);
  $('#stm').innerHTML=`<div class="dh"><div><h2>${esc(name)}</h2><p>${L.length} وحدة</p></div><button class="x" data-a="sclose" aria-label="إغلاق">✕</button></div><div class="db">${T([{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'الإيجار',k:'d'}],L.map(o=>({cells:[esc(o.pn),'<b>'+esc(o.unit)+'</b>',o.rented?'مؤجرة':'—']})))}</div>`;
  $('#stm').showModal();
}
/* ===== استيراد ===== */
async function ivImport(pre){
  const f=(pre&&pre.bytes)?pre:await native.openFile([{name:'Excel',extensions:['xlsx','xlsm','xls']}]);if(!f)return;
  let wb;try{wb=XLSX.read(f.bytes,{type:'array'})}catch(e){toast('تعذّرت قراءة الملف');return}
  const projs=Object.entries(P()),pf=n=>{const k=nm(n);if(!k)return null;return projs.find(([,p])=>nm(p.name)===k)||projs.find(([,p])=>nm(p.name).includes(k)||k.includes(nm(p.name)))};
  const rows=[],bad=[];
  for(const sn of wb.SheetNames){
    const R=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:'',raw:true});
    const hi=R.findIndex(r=>r.some(c=>/وحدة/.test(String(c)))&&r.some(c=>/مالك|عميل/.test(String(c))));if(hi<0)continue;
    const H=R[hi].map(c=>String(c).trim()),ci=re=>H.findIndex(h=>re.test(h)),cp=ci(/مشروع/),cu=ci(/وحدة/),co=ci(/مالك|عميل/),ca=ci(/مساحة/),ci_=ci(/هوية|سجل/),ph=ci(/جوال|هاتف/),cv=ci(/سابق|قديم/);
    R.slice(hi+1).forEach((r,i)=>{const u=String(r[cu]??'').trim();if(!u)return;const pn=cp>=0&&String(r[cp]).trim()?String(r[cp]).trim():sn,pr=pf(pn);
      if(!pr){bad.push('ورقة '+sn+' سطر '+(hi+i+2)+': المشروع «'+pn+'» غير موجود في التطبيق');return}
      rows.push({pid:pr[0],pn:pr[1].name,unit:ivCanon(u),owner:nm(String(r[co]??'').replace(/[\t\n]/g,' ')),area:ca>=0?(+r[ca]||''):'',idno:ci_>=0?String(r[ci_]??'').replace(/\D/g,''):'',prev:cv>=0?String(r[cv]??'').trim():'',phone:ph>=0?(d=>d.length===9&&d[0]==='5'?'0'+d:d)(String(r[ph]??'').replace(/\D/g,'')):'',sheet:sn})});
  }
  if(!rows.length){toast(bad[0]||'لم أجد أعمدة (رقم الوحدة، المالك) في الملف');return}
  const seen=new Set(),dup=[],R2=[];for(const r of rows){const k=r.pid+'|'+ivKey(r.unit);if(seen.has(k)){dup.push(r.pn+' / '+r.unit);continue}seen.add(k);R2.push(r)}
  const plan=[];
  for(const r of R2){
    const p=P()[r.pid],k=ivKey(r.unit);
    let un=(p.units||[]).filter(u=>ivKey(u.no)===k),cs=(p.contracts||[]).filter(c=>ivKey(c.unit)===k),fu=FU().find(f=>f.pid===r.pid&&ivKey(f.no)===k);
    if(r.prev&&!un.length&&!cs.length&&!fu){const kp=ivKey(r.prev);un=(p.units||[]).filter(u=>ivKey(u.no)===kp);cs=(p.contracts||[]).filter(c=>ivKey(c.unit)===kp);fu=FU().find(f=>f.pid===r.pid&&ivKey(f.no)===kp)}
    const exists=un.length||cs.length,curNames=[...new Set([...un.map(u=>nm(u.owner)),...cs.map(c=>nm(c.owner)),fu&&nm(fu.owner)].filter(Boolean))];
    const curUnit=(un[0]&&un[0].no)||(cs[0]&&cs[0].unit)||(fu&&fu.no)||'';
    plan.push({...r,exists:!!(exists||fu),inRent:!!exists,fu,un,cs,curNames,rename:(exists||fu)&&curUnit&&curUnit!==r.unit,curUnit,change:r.owner&&curNames.length&&!curNames.includes(r.owner)});
  }
  const planKeys=new Set(plan.map(o=>o.pid+'|'+ivKey(o.unit)));
  for(const pid of new Set(plan.map(o=>o.pid))){const p=P()[pid],pn=p.name,m=new Map();
    for(const u of p.units||[])(m.get(ivKey(u.no))||m.set(ivKey(u.no),{no:u.no,un:[],cs:[]}).get(ivKey(u.no))).un.push(u);
    for(const c of p.contracts||[])(m.get(ivKey(c.unit))||m.set(ivKey(c.unit),{no:c.unit,un:[],cs:[]}).get(ivKey(c.unit))).cs.push(c);
    for(const[k,v]of m){if(planKeys.has(pid+'|'+k))continue;const cn=ivCanon(v.no);if(cn===v.no)continue;
      const clash=[...m.values()].some(z=>z!==v&&z.no===cn);if(clash)continue;
      plan.push({pid,pn,unit:cn,owner:'',exists:true,inRent:true,fu:null,un:v.un,cs:v.cs,curNames:[],rename:true,curUnit:v.no,change:false,extra:true})}}
  const st=a=>({t:a.length,new_:a.filter(o=>!o.exists).length,chg:a.filter(o=>o.change).length,ren:a.filter(o=>o.rename).length,uns:a.filter(o=>!o.owner&&!o.curNames.length).length});
  const byP=[...new Set(plan.map(o=>o.pn))].map(n=>({n,...st(plan.filter(o=>o.pn===n))}));
  const chg=plan.filter(o=>o.change||o.rename),withC=new Set(plan.filter(o=>o.owner&&(o.phone||o.idno)).map(o=>o.owner)).size;
  const html=`<div class="tw"><table><thead><tr><th>المشروع</th><th>وحدات الملف</th><th>جديدة (للحصر)</th><th>تغيير اسم مالك</th><th>تعديل رقم وحدة</th><th>بلا مالك (غير مباعة)</th></tr></thead><tbody>${byP.map(o=>`<tr><td><b>${esc(o.n)}</b></td><td>${o.t}</td><td>${o.new_}</td><td>${o.chg}</td><td>${o.ren}</td><td>${o.uns}</td></tr>`).join('')}</tbody></table></div>
${withC?`<p class="sub">سيتم تحديث الجوال والهوية في سجل الملاك لـ${withC} مالك.</p>`:''}<p class="sub">الوحدات الجديدة تُسجَّل للحصر والرسوم فقط ولا تظهر في شاشات الإيجار. الوحدات الموجودة تُحدَّث أسماء ملاكها (وفي عقودها)، ولا تتكرر.</p>
${chg.length?`<h3>التغييرات (${chg.length})</h3><div class="tw" style="max-height:260px;overflow:auto"><table><thead><tr><th>المشروع</th><th>الوحدة</th><th>التغيير</th></tr></thead><tbody>${chg.slice(0,120).map(o=>`<tr><td>${esc(o.pn)}</td><td><b>${esc(o.unit)}</b></td><td>${o.rename?esc(o.curUnit)+' ← '+esc(o.unit)+' ':''}${o.change?esc(o.curNames.join('، '))+' ← '+esc(o.owner):''}</td></tr>`).join('')}</tbody></table></div>${chg.length>120?'<p class="sub">… والباقي</p>':''}`:''}
${dup.length||bad.length?`<p class="sub" style="color:var(--late)">متجاهَل: ${dup.length?dup.length+' وحدة مكررة في الملف. ':''}${bad.slice(0,6).map(esc).join('<br>')}</p>`:''}`;
  formDlg({title:'مراجعة استيراد الحصر',save:'تطبيق الاستيراد',vals:{},fields:[{t:'info',k:'i',html}],onSave:()=>{
    let nu=0,oc=0,rn=0,skip=0;
    for(const o of plan){
      const p=P()[o.pid];
      if(o.rename){
        const clash=[...(p.units||[]),...FU().filter(f=>f.pid===o.pid).map(f=>({no:f.no,_f:1}))].some(u=>u.no===o.unit&&ivKey(u.no)!==ivKey(o.curUnit))||false;
        if(clash){skip++}else{for(const u of o.un)u.no=o.unit;for(const c of o.cs)c.unit=o.unit;if(o.fu)o.fu.no=o.unit;rn++}
      }
      if(!o.exists){FU().push({id:'f'+uid(),pid:o.pid,no:o.unit,owner:o.owner,phone:o.phone||'',area:o.area||'',amt:0});nu++;continue}
      if(o.change){
        const old=o.curNames;
        for(const u of o.un)u.owner=o.owner;for(const c of o.cs)c.owner=o.owner;if(o.fu)o.fu.owner=o.owner;
        oc++;
        const reg=PR('owners');for(const on of old){const stillUsed=Object.values(P()).some(q=>(q.contracts||[]).some(c=>nm(c.owner)===on)||(q.units||[]).some(u=>nm(u.owner)===on))||FU().some(f=>nm(f.owner)===on);const r=reg.find(x=>nm(x.name)===on);if(r&&!stillUsed&&!reg.some(x=>nm(x.name)===o.owner))r.name=o.owner}
      }else if(o.owner&&!o.curNames.length){
        if(o.fu)o.fu.owner=o.owner;else if(o.un[0])o.un[0].owner=o.owner;
        for(const c of o.cs)if(!c.owner)c.owner=o.owner
      }
    }
    let ra=0,rn_=0;const reg=PR('owners');
    for(const o of plan){
      if(o.area>0){const u=P()[o.pid].units?.find(x=>ivKey(x.no)===ivKey(o.unit));if(u&&!u.area)u.area=o.area;const f=FU().find(x=>x.pid===o.pid&&ivKey(x.no)===ivKey(o.unit));if(f&&!f.area)f.area=o.area}
      if(o.owner&&(o.phone||o.idno)){let r=reg.find(x=>nm(x.name)===o.owner);if(!r){r={id:'r'+uid(),name:o.owner,phone:'',idno:'',email:'',unified:'',tax:'',addr:'',notes:''};reg.push(r);rn_++}
        if(o.phone&&r.phone!==o.phone){r.phone=o.phone;ra++}if(o.idno&&r.idno!==o.idno){r.idno=o.idno;ra++}}}
    persist();render();toast('تم: '+nu+' وحدة جديدة، '+oc+' تحديث مالك، '+rn+' تعديل رقم، '+(ra+rn_?(rn_+' مالك جديد/'+ra+' تحديث جوال وهوية'):'')+(skip?'، '+skip+' تعارض مُتخطى':''))}});
}
Object.assign(act,{ivImp:ivImport,ivTab:b=>{S.iv.tab=b.dataset.t;render()},ivOwner:b=>ivOwnerDlg(b.dataset.n)});
document.addEventListener('input',e=>{if(e.target.id==='iv_q'){S.iv.q=e.target.value.trim();render()}});
document.addEventListener('change',e=>{const m={iv_p:'p',iv_s:'s'}[e.target.id];if(m){S.iv[m]=e.target.value;render()}});
