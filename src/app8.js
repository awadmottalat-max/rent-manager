/* العقود الخارجية: إدارة أملاك فقط — لا تدخل في المحصَّل/المتبقي/المتأخر/التنبيهات */
Object.assign(S,{ex:{p:'',q:'',s:'',o:'',f:'',m:''}});
function extInstTable(x,print){
  return T([{h:'#',k:'d'},{h:'الاستحقاق',k:'d'},{h:'المبلغ',k:'n'},{h:'الحالة',k:'t'}],
    x.r.inst.map(i=>({cells:[i.n,fd(i.date),fm(i.amount),i.date!=null&&i.date<TODAY?'<span class="ch">حلّ موعده</span>':i.date!=null&&i.date<=TODAY+30*DAY?'<span class="ch warn">خلال 30 يومًا</span>':'<span class="ch">لم يحن بعد</span>']})),{print});
}
const feeSt=x=>{const f=x.f;return !(f.total>0)?'<span class="ch">بلا رسوم</span>':f.late_n?`<span class="ch late">متأخر ${f.late_n}</span>`:f.rem<=0.005?'<span class="ch ok">مسدد</span>':f.paid>0?'<span class="ch warn">مسدد جزئيًا</span>':'<span class="ch warn">غير مسدد</span>'};
const exPass=x=>{const{p,q,s,o,f}=S.ex;if(p&&x.pid!==p)return false;if(o&&(String(x.c.owner||'').trim()||'(بدون مالك)')!==o)return false;
  if(s==='active'&&x.r.st!=='ساري')return false;if(s==='ended'&&x.r.st!=='منتهي')return false;if(s==='future'&&x.r.st!=='لم يبدأ')return false;
  if(f==='late'&&!x.f.late_n)return false;if(f==='open'&&!(x.f.rem>0.005))return false;if(f==='paid'&&!(x.f.total>0&&x.f.rem<=0.005))return false;
  if(q&&!txt(x.c.unit,x.c.tenant,x.c.owner,x.pn).includes(q.toLowerCase()))return false;return true};
function extFeeDetail(x){
  const f=x.f,c=x.c,ps=[...(c.feePays||[])].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  const ch=i=>i.status==='paid'?'<span class="ch ok">مسددة</span>':i.late?'<span class="ch late">متأخرة</span>':i.status==='partial'?'<span class="ch warn">جزئي</span>':i.soon?'<span class="ch warn">خلال 30 يومًا</span>':'<span class="ch">لم تحن</span>';
  return `<h3>رسوم إدارة الأملاك ${c.feeMode==='once'?'<small>(دفعة واحدة)</small>':'<small>(مربوطة بدفعات الإيجار)</small>'}</h3>
${f.inst.length?T([{h:'#',k:'d'},{h:'الاستحقاق',k:'d'},{h:'المبلغ',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'الحالة',k:'t'}],f.inst.map(i=>({cls:i.late?'late':i.soon?'soon':'',cells:[i.n,fd(i.date),fm(i.amount),fm(i.paid),fm(i.due),ch(i)]}))):'<p class="empty">لا توجد رسوم إدارة مسجلة — عدّل العقد وأدخل «رسوم إدارة الأملاك».</p>'}
<div class="acts"><button class="btn p" data-a="feePay" data-v="${f.next?f.next.due:''}">+ تسجيل سداد رسوم</button></div>
${ps.length?T([{h:'التاريخ',k:'d'},{h:'المبلغ',k:'n'},{h:'ملاحظة',k:'t'},{h:'',k:'ac'}],ps.map(p=>({cells:[fs_(p.date),fm(p.amount),esc([p.method,p.note].filter(Boolean).join(' — '))||'—',`<button class="btn sm dng" data-a="feeDel" data-i="${esc(p.id)}">حذف</button>`]}))):'<div class="tw"><p class="empty">لا توجد دفعات رسوم مسجلة.</p></div>'}`;
}
function feePayForm(amount){
  const x=curX();if(!x)return;const pid=x.pid,cid=x.c.id;
  formDlg({title:'تسجيل سداد رسوم الإدارة — '+esc(x.c.unit)+' / '+esc(x.c.tenant),save:'تسجيل',vals:{date:iso(TODAY),amount:amount??''},
    fields:[{k:'date',l:'تاريخ السداد',t:'date'},{k:'amount',l:'المبلغ',t:'number'},{k:'method',l:'طريقة الدفع',t:'select',opts:[['','—'],['نقدًا','نقدًا'],['حوالة بنكية','حوالة بنكية'],['شيك','شيك'],['شبكة','شبكة / بطاقة']]},{k:'note',l:'ملاحظة / رقم الحوالة'}],
    onSave:o=>{const a=+o.amount;if(!(a>0))return 'أدخل مبلغًا صحيحًا';if(!o.date)return 'أدخل تاريخ السداد';
      mutate(pid,p=>{const c=p.contracts.find(c=>c.id===cid);(c.feePays=c.feePays||[]).push({id:'f'+uid(),date:o.date,amount:a,method:o.method,note:o.note})});toast('تم تسجيل سداد الرسوم')}});
  setTimeout(()=>$('#ff_amount')?.focus(),90);
}
function vExtMonth(all,list,E){
  const[y,mo]=E.m.split('-').map(Number),ms=Date.UTC(y,mo-1,1),me=Date.UTC(y,mo,1)-DAY,inM=t=>t!=null&&t>=ms&&t<=me;
  const MN=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][mo-1]+' '+y;
  const R=list.map(x=>{const due=sum(x.f.inst.filter(i=>inM(i.date)),i=>i.amount),pays=(x.c.feePays||[]).filter(p=>inM(pd(p.date))),col=sum(pays,p=>+p.amount||0);return{x,due,col,pays}}).filter(o=>o.due>0||o.col>0||o.x.f.late>0);
  const td=sum(R,o=>o.due),tc=sum(R,o=>o.col),tl=sum(R,o=>o.x.f.late),tr=sum(R,o=>o.x.r.total||0);
  const cols=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'قيمة الإيجار',k:'n'},{h:'مستحق الشهر',k:'n'},{h:'المحصَّل خلال الشهر',k:'n'},{h:'المتأخر حتى اليوم',k:'n'},{h:'الحالة',k:'d'}];
  const rws=R.map(o=>({cls:o.x.f.late_n?'late':'',attrs:open_(o.x),cells:[...pu(o.x),esc(o.x.c.owner)||'—',esc(o.x.c.tenant)||'—',fm(o.x.r.total||0),fm(o.due),fm(o.col),o.x.f.late?'<span style="color:var(--late)">'+fm(o.x.f.late)+'</span>':'—',feeSt(o.x)]}));
  const pl=R.flatMap(o=>o.pays.map(p=>({o,p}))).sort((a,b)=>String(a.p.date).localeCompare(String(b.p.date)));
  const post=pl.length?`<h3 style="margin:16px 0 6px">الرسوم المحصَّلة خلال ${MN}</h3>${T([{h:'التاريخ',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المبلغ',k:'n'},{h:'ملاحظة',k:'t'}],pl.map(({o,p})=>({cells:[fs_(p.date),esc(o.x.pn),'<b>'+esc(o.x.c.unit)+'</b>',esc(o.x.c.owner)||'—',fm(p.amount),esc([p.method,p.note].filter(Boolean).join(' — '))||'—']})),{print:true,foot:['الإجمالي','','','',fm(tc),''],footSpan:0})}`:'';
  S.pm={title:'التقرير الشهري لإدارة الأملاك — '+MN,sub:'المشروع: '+(E.p?esc(pname(E.p)):'الكل')+(E.o?' — المالك: '+esc(E.o):'')+' — عقود الشهر: '+R.length,cols,rows:rws,foot:['الإجمالي ('+R.length+')','','','',fm(tr),fm(td),fm(tc),fm(tl),''],footSpan:0,post:`<p style="margin:12px 0"><b>نسبة التحصيل من مستحق الشهر:</b> ${td?Math.round(Math.min(tc,td)/td*100)+'%':'—'}</p>`+post};
  const k=(l,v,i,c)=>`<div class="kp static ${c||''}"><span>${l}</span><b>${v}</b><i>${i||''}</i></div>`;
  return `<div class="kpis sm">${k('عقود الشهر',R.length,MN)}${k('رسوم مستحقة في الشهر',fm(td))}${k('المحصَّل خلال الشهر',fm(tc),td?Math.round(Math.min(tc,td)/td*100)+'% من المستحق':'')}${k('المتأخر حتى اليوم',fm(tl),'','lt')}</div>
${R.length?T(cols,rws,{foot:S.pm.foot}):'<p class="empty">لا استحقاقات أو تحصيلات رسوم في هذا الشهر.</p>'}${post}`;
}
function vExt(all){
  const E=S.ex,list=all.filter(exPass).sort((a,b)=>a.pn.localeCompare(b.pn,'ar')||String(a.c.unit).localeCompare(String(b.c.unit),'ar',{numeric:true}));
  if(E.m)S.exM=1;else S.exM=0;
  const rent=x=>x.r.total||0,pct=(f,r)=>r?(f/r*100).toFixed(1)+'%':'—';
  const owners=[...new Set(all.map(x=>String(x.c.owner||'').trim()||'(بدون مالك)'))].sort((a,b)=>a.localeCompare(b,'ar'));
  const cols=[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'المستأجر',k:'t'},{h:'بداية الإيجار',k:'d'},{h:'نهاية الإيجار',k:'d'},{h:'قيمة الإيجار',k:'n'},{h:'رسوم الإدارة',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'المتأخر',k:'n'},{h:'الاستحقاق القادم',k:'d'},{h:'حالة الرسوم',k:'d'}];
  const rws=list.map(x=>{const f=x.f,n=f.next;return{cls:f.late_n?'late':f.next&&f.next.soon?'soon':'',attrs:open_(x),cells:[...pu(x),esc(x.c.owner)||'—',esc(x.c.tenant)||'—',fs_(x.c.start),fs_(x.c.end),fm(rent(x)),fm(f.total),fm(f.paid),'<b>'+fm(f.rem)+'</b>',f.late?'<span style="color:var(--late)">'+fm(f.late)+'</span>':'—',n?fd(n.date)+'<small class="num">'+fm(n.due)+'</small>':'—',feeSt(x)+endBtns(x)]}});
  const S_=(g)=>sum(list,g),tr=S_(rent),tf=S_(x=>x.f.total),tp=S_(x=>x.f.paid),trm=S_(x=>x.f.rem),tl=S_(x=>x.f.late);
  S.pm={title:'تقرير العقود الخارجية — رسوم إدارة الأملاك',sub:'المشروع: '+(E.p?esc(pname(E.p)):'الكل')+(E.o?' — المالك: '+esc(E.o):'')+' — عدد العقود: '+list.length+' — إجمالي الإيجار: '+fm(tr)+' — رسوم الإدارة: '+fm(tf)+' — المحصَّل: '+fm(tp)+' — المتبقي: '+fm(trm),cols,rows:rws,foot:[list.length+' عقدًا','','','','','',fm(tr),fm(tf),fm(tp),fm(trm),fm(tl),'',''],footSpan:0};
  const byP={};for(const x of list){const o=byP[x.pn]=byP[x.pn]||{n:0,r:0,f:0,p:0,m:0,l:0};o.n++;o.r+=rent(x);o.f+=x.f.total;o.p+=x.f.paid;o.m+=x.f.rem;o.l+=x.f.late}
  const sm=Object.keys(byP).length>1?`<h3 style="margin:14px 0 6px">ملخص حسب المشروع</h3>${T([{h:'المشروع',k:'t'},{h:'العقود',k:'n'},{h:'قيمة الإيجار',k:'n'},{h:'رسوم الإدارة',k:'n'},{h:'المسدد',k:'n'},{h:'المتبقي',k:'n'},{h:'المتأخر',k:'n'}],Object.entries(byP).sort((a,b)=>a[0].localeCompare(b[0],'ar')).map(([n,o])=>({cells:['<b>'+esc(n)+'</b>',o.n,fm(o.r),fm(o.f),fm(o.p),fm(o.m),fm(o.l)]})),{foot:['الإجمالي',list.length,fm(tr),fm(tf),fm(tp),fm(trm),fm(tl)],footSpan:0})}`:'';
  const k=(l,v,i,c)=>`<div class="kp static ${c||''}"><span>${l}</span><b>${v}</b><i>${i||''}</i></div>`;
  return `<h1>العقود الخارجية</h1><p class="sub">عقود يُسدَّد إيجارها من المستأجر إلى المالك مباشرة، وتتابع فيها رسوم إدارة الأملاك فقط (استحقاقها وسدادها). لا تدخل في إجماليات الإيجارات ولا تنبيهاتها.</p>
<div class="bar"><select id="ex_p" aria-label="المشروع">${projOpts(E.p,true)}</select>
<select id="ex_o" aria-label="المالك"><option value="">كل الملاك</option>${owners.map(n=>`<option value="${esc(n)}"${E.o===n?' selected':''}>${esc(n)}</option>`).join('')}</select>
<select id="ex_s" aria-label="حالة العقد">${[['','كل العقود'],['active','سارية'],['future','لم تبدأ'],['ended','منتهية']].map(([v,l])=>`<option value="${v}"${E.s===v?' selected':''}>${l}</option>`).join('')}</select>
<select id="ex_f" aria-label="حالة الرسوم">${[['','كل حالات الرسوم'],['late','رسوم متأخرة'],['open','عليها متبقٍ'],['paid','مسددة']].map(([v,l])=>`<option value="${v}"${E.f===v?' selected':''}>${l}</option>`).join('')}</select>
<input type="search" id="ex_q" placeholder="بحث: وحدة، مستأجر، مالك" value="${esc(E.q)}" aria-label="بحث">
<label class="mlb">تقرير شهري <input type="month" id="ex_m" value="${esc(E.m)}"></label>${E.m?'<button class="btn" data-a="exM0">عرض كل الفترات</button>':''}
<button class="btn p" data-a="newExt">+ عقد خارجي</button>${pbtn('list')}</div>
${E.m?vExtMonth(all,list,E):''}${E.m?'':`<div class="kpis sm">${k('العقود الخارجية',list.length,'إيجارها '+fm(tr))}${k('رسوم الإدارة المستحقة',fm(tf),pct(tf,tr)+' من الإيجار')}${k('المحصَّل من الرسوم',fm(tp),tf?Math.round(tp/tf*100)+'% من المستحق':'')}${k('المتبقي من الرسوم',fm(trm))}${k('المتأخر من الرسوم',fm(tl),'','lt')}</div>
${list.length?T(cols,rws,{foot:S.pm.foot}):'<p class="empty">لا توجد عقود خارجية. أضف عقدًا واختر «نوع العقد: خارجي».</p>'}${sm}`}`;
}
VF.ext=vExt;
Object.assign(act,{exM0:()=>{S.ex.m='';render()},feePay:b=>feePayForm(b.dataset.v!==''?+b.dataset.v:''),feeDel:b=>arm(b,()=>{const{pid,cid}=S.cur;mutate(pid,p=>{const c=p.contracts.find(c=>c.id===cid);c.feePays=(c.feePays||[]).filter(z=>z.id!==b.dataset.i)});if(cur())fillDet()}),newExt:()=>contractForm(false,{kind:'ext',_new:1,pid:S.ex.p||undefined})});
document.addEventListener('input',e=>{if(e.target.id==='ex_q'){S.ex.q=e.target.value.trim();render()}});
document.addEventListener('change',e=>{const id=e.target.id,v=e.target.value;if(id==='ex_p'){S.ex.p=v;render()}else if(id==='ex_o'){S.ex.o=v;render()}else if(id==='ex_s'){S.ex.s=v;render()}else if(id==='ex_f'){S.ex.f=v;render()}else if(id==='ex_m'){S.ex.m=v;render()}});

/* ===== تنبيهات رسوم الإدارة وتذكيرها ===== */
const ownPhone=name=>(PR('owners').find(r=>nm(r.name)===nm(name))||{}).phone||'';
function feeAlerts(){
  const out=[];
  for(const x of rows().filter(z=>z.ext)){const f=x.f;if(!(f.total>0))continue;
    if(x.r.st==='منتهي'&&endState(x.pid,x.c)!=='pend'&&!f.late_n)continue;
    const L=f.inst.filter(i=>i.due>0.005&&i.late),U=f.inst.filter(i=>i.due>0.005&&!i.late&&i.date!=null&&i.date>=TODAY&&i.date-TODAY<=7*DAY);
    if(L.length){const o=Math.min(...L.map(i=>i.date));out.push({x,late:true,amount:sum(L,i=>i.due),first:o,days:Math.round((TODAY-o)/DAY),inst:L})}
    else if(U.length){const o=Math.min(...U.map(i=>i.date));out.push({x,late:false,amount:sum(U,i=>i.due),first:o,days:Math.round((o-TODAY)/DAY),inst:U})}}
  return out.sort((a,b)=>(b.late-a.late)||(b.days*(b.late?1:-1))-(a.days*(a.late?1:-1)));
}
const FEE_TPL=()=>S.db.settings.remTplFee||`السلام عليكم ورحمة الله وبركاته،
عزيزنا {المستلم}، نرجو أن تكونوا بخير 🌷
نذكّركم بلطف باستحقاق رسوم إدارة الأملاك للوحدة {الوحدة} ({المشروع}) بمبلغ {المبلغ} ريال، {الاستحقاق}.
نشكر لكم تعاونكم، وإن كان السداد قد تمّ فنعتذر عن التذكير.
${S.db.settings.operator||'شركة كثيب لإدارة الأملاك'}`;
function feeRemindDlg(pid,cid){
  const x=rows().find(z=>z.pid===pid&&z.c.id===cid&&z.ext);if(!x)return toast('العقد غير موجود');
  const it=feeAlerts().find(o=>o.x.pid===pid&&o.x.c.id===cid),inst=it?it.inst:x.f.inst.filter(i=>i.due>0.005).slice(0,1);
  if(!inst.length)return toast('لا رسوم مستحقة على هذا العقد');
  const amount=sum(inst,i=>i.due),first=Math.min(...inst.map(i=>i.date??1e12)),late=inst.some(i=>i.late);
  const when=first>=1e12?'والمستحقة حاليًا':late?'وأقدمها بتاريخ '+iso(first)+' (متأخرة)':'وتستحق بتاريخ '+iso(first);
  const who=t=>t==='ten'?(nm(x.c.tenant)||'المستأجر الكريم'):(nm(x.c.owner)||'المالك الكريم'),ph=t=>t==='ten'?tenPhone(x.c.tenant):ownPhone(x.c.owner);
  const mk=t=>FEE_TPL().replace(/\{المستلم\}/g,who(t)).replace(/\{الوحدة\}/g,x.c.unit||'').replace(/\{المشروع\}/g,x.pn).replace(/\{المبلغ\}/g,money(amount)).replace(/\{الاستحقاق\}/g,when);
  formDlg({title:'تأكيد إرسال تذكير برسوم الإدارة',save:'نعم، افتح واتساب وأرسل التذكير الآن',vals:{to:'own',phone:ph('own'),text:mk('own'),saveTpl:'no'},
    fields:[{t:'info',html:`<div class="sum"><div><span>الوحدة</span><b>${esc(x.c.unit)} — ${esc(x.pn)}</b></div><div><span>الرسوم المطلوب تذكيرها</span><b>${fm(amount)}</b></div></div>`},
      {k:'to',l:'إرسال إلى',t:'select',opts:[['own','المالك: '+(nm(x.c.owner)||'—')],['ten','المستأجر: '+(nm(x.c.tenant)||'—')]]},
      {k:'phone',l:'الجوال (واتساب)',ph:'05xxxxxxxx'},{k:'text',l:'نص الرسالة (قابل للتعديل)',t:'area',full:1},
      {k:'saveTpl',l:'حفظ هذا النص كنص افتراضي لتذكير الرسوم؟',t:'select',opts:[['no','لا'],['yes','نعم']],def:'no'}],
    onSave:v=>{const p=waPhone(v.phone);if(!p||p.length<10)return 'أدخل رقم جوال صحيح للواتساب (مثل 05xxxxxxxx)';if(!v.text.trim())return 'نص الرسالة فارغ';
      native.openExt('https://wa.me/'+p+'?text='+encodeURIComponent(v.text)).then(ok=>{if(!ok){toast('تعذّر فتح واتساب');return}
        RM().unshift({id:'m'+uid(),pid,cid,tenant:(v.to==='ten'?'':'المالك: ')+who(v.to),unit:x.c.unit,project:x.pn,phone:p,amount,inst:inst.map(i=>i.n),at:Date.now(),text:v.text.trim(),ch:'whatsapp',fee:true});
        if(v.saveTpl==='yes')S.db.settings.remTplFee=v.text.trim();persist();toast('فُتح واتساب وسُجِّل التذكير');render()})}});
  const sel=document.getElementById('ff_to');if(sel)sel.onchange=()=>{const t=sel.value;document.getElementById('ff_phone').value=ph(t);document.getElementById('ff_text').value=mk(t)};
  const ta=document.getElementById('ff_text');if(ta)ta.rows=8;
}
Object.assign(act,{feeRemind:b=>feeRemindDlg(b.dataset.p,b.dataset.c),feePayQ:b=>{S.cur={pid:b.dataset.p,cid:b.dataset.c};feePayForm(+b.dataset.v||'')}});
