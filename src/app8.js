/* العقود الخارجية: إدارة أملاك فقط — لا تدخل في المحصَّل/المتبقي/المتأخر/التنبيهات */
Object.assign(S,{ex:{p:'',q:'',s:'',o:''}});
function extInstTable(x,print){
  return T([{h:'#',k:'d'},{h:'الاستحقاق',k:'d'},{h:'المبلغ',k:'n'},{h:'الحالة',k:'t'}],
    x.r.inst.map(i=>({cells:[i.n,fd(i.date),fm(i.amount),i.date!=null&&i.date<TODAY?'<span class="ch">حلّ موعده</span>':i.date!=null&&i.date<=TODAY+30*DAY?'<span class="ch warn">خلال 30 يومًا</span>':'<span class="ch">لم يحن بعد</span>']})),{print});
}
const exNext=r=>r.inst.find(i=>i.date!=null&&i.date>=TODAY)||null;
const exPass=x=>{const{p,q,s,o}=S.ex;if(p&&x.pid!==p)return false;if(o&&(String(x.c.owner||'').trim()||'(بدون مالك)')!==o)return false;
  if(s==='active'&&x.r.st!=='ساري')return false;if(s==='ended'&&x.r.st!=='منتهي')return false;if(s==='future'&&x.r.st!=='لم يبدأ')return false;
  if(q&&!txt(x.c.unit,x.c.tenant,x.c.owner,x.pn).includes(q.toLowerCase()))return false;return true};
function vExt(all){
  const E=S.ex,list=all.filter(exPass).sort((a,b)=>a.pn.localeCompare(b.pn,'ar')||String(a.c.unit).localeCompare(String(b.c.unit),'ar',{numeric:true}));
  const fee=x=>+x.c.fee||0,rent=x=>x.r.total||0,pct=(f,r)=>r?(f/r*100).toFixed(1)+'%':'—';
  const owners=[...new Set(all.map(x=>String(x.c.owner||'').trim()||'(بدون مالك)'))].sort((a,b)=>a.localeCompare(b,'ar'));
  const cols=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'بداية الإيجار',k:'d'},{h:'نهاية الإيجار',k:'d'},{h:'قيمة الإيجار',k:'n'},{h:'عدد الدفعات',k:'d'},{h:'الدفعة القادمة',k:'d'},{h:'رسوم الإدارة',k:'n'},{h:'النسبة',k:'d'},{h:'الحالة',k:'d'}];
  const rws=list.map(x=>{const n=exNext(x.r);return{attrs:open_(x),cells:[...pu(x),esc(x.c.owner)||'—',esc(x.c.tenant)||'—',fs_(x.c.start),fs_(x.c.end),fm(rent(x)),x.r.k||'—',n?fd(n.date)+'<small class="num">'+fm(n.amount)+'</small>':'—',fm(fee(x)),pct(fee(x),rent(x)),`<span class="ch ${x.r.st==='ساري'?'ok':''}">${x.r.st}</span>`+endBtns(x)]}});
  const tr=sum(list,rent),tf=sum(list,fee),act_=list.filter(x=>x.r.st==='ساري');
  S.pm={title:'تقرير العقود الخارجية (إدارة الأملاك)',sub:'المشروع: '+(E.p?esc(pname(E.p)):'الكل')+(E.o?' — المالك: '+esc(E.o):'')+' — عدد العقود: '+list.length+' — إجمالي الإيجار: '+fm(tr)+' — رسوم الإدارة: '+fm(tf),cols,rows:rws,foot:[list.length+' عقدًا','','','','','',fm(tr),'','',fm(tf),pct(tf,tr),''],footSpan:0};
  const byP={};for(const x of list){const o=byP[x.pn]=byP[x.pn]||{n:0,r:0,f:0};o.n++;o.r+=rent(x);o.f+=fee(x)}
  const sm=Object.keys(byP).length>1?`<h3 style="margin:14px 0 6px">ملخص حسب المشروع</h3>${T([{h:'المشروع',k:'t'},{h:'عدد العقود',k:'n'},{h:'قيمة الإيجار',k:'n'},{h:'رسوم الإدارة',k:'n'},{h:'النسبة',k:'d'}],Object.entries(byP).sort((a,b)=>a[0].localeCompare(b[0],'ar')).map(([n,o])=>({cells:['<b>'+esc(n)+'</b>',o.n,fm(o.r),fm(o.f),pct(o.f,o.r)]})),{foot:['الإجمالي',list.length,fm(tr),fm(tf),pct(tf,tr)],footSpan:0})}`:'';
  const k=(l,v,i)=>`<div class="kp static"><span>${l}</span><b>${v}</b><i>${i||''}</i></div>`;
  return `<h1>العقود الخارجية</h1><p class="sub">عقود يُسدَّد إيجارها من المستأجر إلى المالك مباشرة، وتقتصر مهمتك فيها على إدارة الأملاك. لا تدخل في المحصَّل أو المتبقي أو المتأخر أو التنبيهات.</p>
<div class="bar"><select id="ex_p" aria-label="المشروع">${projOpts(E.p,true)}</select>
<select id="ex_o" aria-label="المالك"><option value="">كل الملاك</option>${owners.map(n=>`<option value="${esc(n)}"${E.o===n?' selected':''}>${esc(n)}</option>`).join('')}</select>
<select id="ex_s" aria-label="الحالة">${[['','كل الحالات'],['active','سارية'],['future','لم تبدأ'],['ended','منتهية']].map(([v,l])=>`<option value="${v}"${E.s===v?' selected':''}>${l}</option>`).join('')}</select>
<input type="search" id="ex_q" placeholder="بحث: وحدة، مستأجر، مالك" value="${esc(E.q)}" aria-label="بحث">
<button class="btn p" data-a="newExt">+ عقد خارجي</button>${pbtn('list')}</div>
<div class="kpis sm">${k('عدد العقود الخارجية',list.length,act_.length+' ساري')}${k('إجمالي قيمة الإيجار',fm(tr),'للمشاريع المعروضة')}${k('رسوم إدارة الأملاك',fm(tf),'ما حصلته من الإدارة')}${k('متوسط النسبة',pct(tf,tr),'رسوم الإدارة ÷ الإيجار')}${k('متوسط الإيجار',list.length?fm(tr/list.length):'—','للعقد الواحد')}</div>
${list.length?T(cols,rws,{foot:S.pm.foot}):'<p class="empty">لا توجد عقود خارجية. أضف عقدًا واختر «نوع العقد: خارجي».</p>'}${sm}`;
}
VF.ext=vExt;
Object.assign(act,{newExt:()=>contractForm(false,{kind:'ext',_new:1,pid:S.ex.p||undefined})});
document.addEventListener('input',e=>{if(e.target.id==='ex_q'){S.ex.q=e.target.value.trim();render()}});
document.addEventListener('change',e=>{const id=e.target.id,v=e.target.value;if(id==='ex_p'){S.ex.p=v;render()}else if(id==='ex_o'){S.ex.o=v;render()}else if(id==='ex_s'){S.ex.s=v;render()}});
