/* الصيانة والنظافة: طلبات تُنفَّذ عبر شركة كثيب للتشغيل والصيانة — تحمّل المالك / المستأجر / ضمان */
const FU=()=>S.db.feeUnits||(S.db.feeUnits=[]);
const MT=()=>S.db.mreq||(S.db.mreq=[]);
const MT_ST=[['new','جديد'],['prog','قيد التنفيذ'],['wait','بانتظار الموافقة'],['done','مكتمل'],['cancel','ملغي']];
const MT_STL=Object.fromEntries(MT_ST);
const MT_PAYER=[['owner','المالك'],['tenant','المستأجر'],['warranty','ضمان']];
const MT_PL={owner:'المالك',tenant:'المستأجر',warranty:'ضمان'};
const MT_KIND=[['maint','صيانة'],['clean','نظافة']];
const MT_CATS=['سباكة','كهرباء','تكييف','دهان','نجارة وأبواب','أجهزة وتجهيزات','نظافة عامة','نظافة بعد الإخلاء','نظافة قبل التسليم','تنظيف مكيفات','تنظيف خزانات','أخرى'];
const MT_PRIO=[['normal','عادي'],['urgent','عاجل']];
Object.assign(S,{mt:{p:'',k:'',s:'open',y:'',r:'',q:'',c:'',v:'',d:'',o:'new'}});
const mtOpenQ=x=>['new','prog','wait'].includes(x.status);
const mtPaid=x=>r2((x.pays||[]).reduce((a,p)=>a+(+p.amount||0),0));
const mtCost=x=>+x.cost||0;
const mtRem=x=>x.payer==='tenant'&&x.status!=='cancel'?Math.max(0,r2(mtCost(x)-mtPaid(x))):0;
const mtLate=x=>mtRem(x)>0.005&&x.due&&pd(x.due)<TODAY;
const mtPer=(x,f)=>{if(!f)return true;const d=String(x.date||'').slice(0,10),t=iso(TODAY),y=+t.slice(0,4),m=+t.slice(5,7),pm=(yy,mm)=>yy+'-'+String(mm).padStart(2,'0');
  if(f==='m0')return d.slice(0,7)===t.slice(0,7);if(f==='m1')return d.slice(0,7)===(m===1?pm(y-1,12):pm(y,m-1));if(f==='y')return d.slice(0,4)===String(y);if(f==='q')return d>=iso(TODAY-92*DAY);return true};
const mtTime=()=>new Date().toLocaleString('en-GB',{hour12:false}).replace(',','');
const mtUnits=pid=>{const p=P()[pid];if(!p)return[];const m=new Map();for(const u of p.units||[])if(u.no)m.set(normU(u.no),u.no);for(const c of p.contracts||[])if(c.unit&&!m.has(normU(c.unit)))m.set(normU(c.unit),c.unit);for(const f of FU())if(f.pid===pid&&!m.has(normU(f.no)))m.set(normU(f.no),f.no);return[...m.values()].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}))};
function mtCtx(pid,unit){
  const p=P()[pid];if(!p||!unit)return{owners:[],tenants:[],owner:'',tenant:''};const k=normU(unit);
  const cs=(p.contracts||[]).filter(c=>normU(c.unit)===k).map(c=>({c,st:calc(c,MODE(),TODAY).st})).sort((a,b)=>(pd(b.c.end)||0)-(pd(a.c.end)||0));
  const act=cs.filter(z=>z.st==='ساري'),u=(p.units||[]).find(u=>normU(u.no)===k);
  const uniq=a=>[...new Set(a.filter(Boolean))],fu=FU().find(f=>f.pid===pid&&normU(f.no)===k);
  return{owner:(act[0]&&act[0].c.owner)||(cs[0]&&cs[0].c.owner)||(u&&u.owner)||(fu&&fu.owner)||'',tenant:(act[0]&&act[0].c.tenant)||'',
    tenants:uniq([...act.map(z=>z.c.tenant),...cs.map(z=>z.c.tenant)]),hasAct:act.length>0};
}
const mtLog=(x,t)=>{(x.notes=x.notes||[]).push({at:mtTime(),text:t})};
const mtById=id=>MT().find(x=>x.id===id);
const mtKindL=x=>x.kind==='clean'?'نظافة':'صيانة';
function mtForm(id){
  const x=id?mtById(id):null,v=x||{pid:MSV(S.mt.p)[0]||Object.keys(P())[0],kind:'maint',prio:'normal',status:'new',date:iso(TODAY),payer:'owner',vendor:''};
  formDlg({title:x?'تعديل طلب رقم '+x.no:'طلب صيانة / نظافة جديد',save:'حفظ الطلب',vals:v,fields:[
    {k:'pid',l:'المشروع',t:'select',opts:Object.entries(P()).map(([k,p])=>[k,p.name])},{k:'unit',l:'رقم الوحدة (من وحدات المشروع المختار)',dl:mtUnits(v.pid)},
    {k:'kind',l:'النوع',t:'select',opts:MT_KIND},{k:'cat',l:'التصنيف (سباكة، كهرباء، نظافة…)',dl:MT_CATS},
    {k:'prio',l:'الأولوية',t:'select',opts:MT_PRIO},{k:'date',l:'تاريخ الطلب',t:'date'},
    {k:'desc',l:'وصف الطلب',t:'area',full:1},
    {k:'payer',l:'من يتحمل التكلفة',t:'select',opts:MT_PAYER},{k:'cost',l:'التكلفة شاملة ضريبة القيمة المضافة (ريال)',t:'number'},
    {k:'due',l:'تاريخ استحقاق المبلغ على المستأجر (إن كان هو المتحمل)',t:'date'},{k:'status',l:'الحالة',t:'select',opts:MT_ST},
    {k:'vendor',l:'الجهة / الفني المنفذ',ph:'اسم الموظف أو الشركة أو المقاول',dl:[...new Set(MT().map(r=>r.vendor).filter(Boolean))]},{k:'vphone',l:'جوال الفني (واتساب)'},
    {k:'owner',l:'المالك'},{k:'tenant',l:'المستأجر',dl:[]},
    {k:'files',l:'المرفقات (صور قبل / بعد، عرض سعر، فاتورة…)',t:'files'}],
    onSave:o=>{
      if(!o.pid||!P()[o.pid])return 'اختر المشروع';if(!o.unit)return 'أدخل رقم الوحدة';if(!mtUnits(o.pid).some(u=>normU(u)===normU(o.unit)))return 'رقم الوحدة غير موجود في المشروع المختار';if(!o.desc)return 'اكتب وصف الطلب';
      if(!numOk(o.cost))return 'التكلفة غير صحيحة';if(o.payer==='tenant'&&Number(o.cost)>0&&!o.due)o.due=iso(TODAY);
      const cx=mtCtx(o.pid,o.unit),r=x||{id:'m'+uid(),no:(S.db.settings.nextMaint||1),notes:[],pays:[],created:iso(TODAY)};
      if(!x){S.db.settings.nextMaint=r.no+1}
      const old=x?x.status:null;
      Object.assign(r,{pid:o.pid,unit:o.unit,kind:o.kind,cat:o.cat,prio:o.prio,date:o.date||iso(TODAY),desc:o.desc,payer:o.payer,cost:Number(o.cost)||0,due:o.payer==='tenant'?o.due:'',status:o.status,vendor:o.vendor,vphone:o.vphone,owner:o.owner||cx.owner||'',tenant:o.tenant||cx.tenant||'',files:o.files});
      if(o.status==='done'&&!r.done)r.done=iso(TODAY);if(o.status!=='done')r.done='';
      if(!x){MT().unshift(r);mtLog(r,'تم إنشاء الطلب')}else if(old!==r.status)mtLog(r,'الحالة: '+MT_STL[r.status]);
      persist();toast(x?'تم حفظ الطلب':'تم إنشاء الطلب رقم '+r.no);S.mtId=r.id;render();if($('#stm').open||!x)mtDlg(r.id)}});
  mtFormWire();
}
function mtFormWire(isNew){
  const g=i=>document.getElementById('ff_'+i),pidEl=g('pid'),uEl=g('unit'),oEl=g('owner'),tEl=g('tenant');if(!pidEl||!uEl)return;
  const dl=(id,a)=>{const d=document.getElementById('dl_'+id);if(d)d.innerHTML=a.map(o=>`<option value="${esc(o)}">`).join('')};
  let hint=document.getElementById('mt_hint');if(!hint){hint=document.createElement('div');hint.id='mt_hint';hint.className='full sub';tEl.closest('label').after(hint)}
  const fill=force=>{const c=mtCtx(pidEl.value,uEl.value.trim());dl('tenant',c.tenants);
    if(force){oEl.value=c.owner;tEl.value=c.tenant}
    hint.textContent=uEl.value.trim()?(c.hasAct?'':(c.tenants.length?'لا يوجد عقد ساري لهذه الوحدة — اختر المستأجر يدويًا من القائمة إن لزم.':'لا توجد عقود لهذه الوحدة (وحدة شاغرة).')):'';};
  pidEl.addEventListener('change',()=>{dl('unit',mtUnits(pidEl.value));uEl.value='';oEl.value='';tEl.value='';fill(false)});
  const onU=()=>{const k=uEl.value.trim();if(mtUnits(pidEl.value).some(u=>normU(u)===normU(k)))fill(true)};
  uEl.addEventListener('change',onU);uEl.addEventListener('input',onU);
  const show=()=>{const y=g('payer').value;oEl.closest('label').style.display=y==='owner'?'':'none';tEl.closest('label').style.display=y==='tenant'?'':'none';hint.style.display=y==='tenant'?'':'none'};
  g('payer').addEventListener('change',show);show();
  fill(false);
}
function mtDlg(id){
  const x=mtById(id);if(!x)return;S.mtId=id;
  const p=P()[x.pid]||{name:''},pays=[...(x.pays||[])].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const k=(l,v)=>`<div><span>${l}</span><b>${v||'—'}</b></div>`;
  const note=x.payer==='owner'?(x.status==='done'?'تُخصم من كشف حساب المالك (الطلب مكتمل).':'ستُخصم من كشف حساب المالك عند اكتمال الطلب.')
    :x.payer==='warranty'?'طلب على الضمان — تتحمله الشركة المالكة للمشروع ولا يُخصم من المالك أو المستأجر.':'';
  const chip=x.status==='done'?'ok':x.status==='cancel'?'':x.prio==='urgent'?'late':'warn';
  $('#stm').innerHTML=`<div class="dh"><div><h2>طلب ${mtKindL(x)} رقم ${x.no} — وحدة ${esc(x.unit)}</h2><p>${esc(p.name)} · ${esc(x.cat||mtKindL(x))} · <span class="ch ${chip}">${MT_STL[x.status]}</span>${x.prio==='urgent'?' <span class="ch late">عاجل</span>':''}</p></div><button class="x" data-a="sclose" aria-label="إغلاق">✕</button></div>
<div class="db"><div class="acts"><button class="btn p" data-a="mtEdit" data-i="${x.id}">تعديل الطلب</button><button class="btn" data-a="mtWa" data-i="${x.id}">إرسال للفني عبر واتساب</button><button class="btn" data-a="mtAtt" data-i="${x.id}">المرفقات${(x.files||[]).length?' ('+x.files.length+')':''}</button><button class="btn dng" data-a="mtDel" data-i="${x.id}">حذف</button></div>
<h3>الحالة</h3><div class="acts">${MT_ST.map(([s,l])=>`<button class="btn sm${x.status===s?' p':''}" data-a="mtSt" data-i="${x.id}" data-s="${s}">${l}</button>`).join('')}</div>
<h3>بيانات الطلب</h3><div class="mtk">${k('المشروع',esc(p.name))}${k('الوحدة',esc(x.unit))}${k('المالك',esc(x.owner))}${k('المستأجر',esc(x.tenant))}${k('النوع / التصنيف',esc(mtKindL(x)+(x.cat?' — '+x.cat:'')))}${k('الأولوية',x.prio==='urgent'?'عاجل':'عادي')}${k('تاريخ الطلب',fs_(x.date))}${k('تاريخ الإنجاز',x.done?fs_(x.done):'')}${k('الجهة المنفذة',esc(x.vendor))}${k('جوال الفني',esc(x.vphone))}</div>
<p style="margin:10px 0;white-space:pre-wrap">${esc(x.desc)}</p>
<h3>التكلفة ومن يتحملها</h3><div class="sum"><div><span>التكلفة (شاملة الضريبة)</span><b>${fm(mtCost(x))}</b></div><div><span>يتحملها</span><b>${esc(MT_PL[x.payer])}</b></div>${x.payer==='tenant'?`<div><span>المسدد</span><b>${fm(mtPaid(x))}</b></div><div><span>المتبقي على المستأجر</span><b>${fm(mtRem(x))}</b></div><div><span>الاستحقاق</span><b>${fs_(x.due)}</b></div>`:''}</div>
${note?`<p class="sub">${note}</p>`:''}
${x.payer==='tenant'?`<div class="acts"><button class="btn p" data-a="mtPay" data-i="${x.id}">+ تسجيل سداد من المستأجر</button></div>${pays.length?T([{h:'التاريخ',k:'d'},{h:'المبلغ',k:'n'},{h:'ملاحظة',k:'t'},{h:'',k:'ac'}],pays.map(q=>({cells:[fs_(q.date),fm(q.amount),esc(q.note)||'—',`<button class="btn sm dng" data-a="mtPayDel" data-i="${x.id}" data-q="${esc(q.id)}">حذف</button>`]}))):'<div class="tw"><p class="empty">لا توجد دفعات مسجلة.</p></div>'}`:''}
<h3>سجل المتابعة</h3><div class="row"><input id="mt_note" placeholder="أضف ملاحظة متابعة…" style="flex:1;min-width:200px"><button class="btn p" data-a="mtNote" data-i="${x.id}">إضافة</button></div>
${(x.notes||[]).length?`<ul class="mtl">${[...x.notes].reverse().map(n=>`<li><small>${esc(n.at)}</small> ${esc(n.text)}</li>`).join('')}</ul>`:'<p class="empty">لا توجد ملاحظات.</p>'}</div>`;
  if(!$('#stm').open)$('#stm').showModal();
}
const mtRefresh=()=>{persist();render();if($('#stm').open&&S.mtId&&mtById(S.mtId))mtDlg(S.mtId)};
function mtPayForm(id){
  const x=mtById(id);if(!x)return;
  formDlg({title:'تسجيل سداد من المستأجر — طلب '+x.no,save:'تسجيل',vals:{date:iso(TODAY),amount:mtRem(x)||''},fields:[{k:'date',l:'تاريخ السداد',t:'date'},{k:'amount',l:'المبلغ',t:'number'},{k:'note',l:'ملاحظة / رقم الحوالة',full:1}],
    onSave:o=>{const a=+o.amount;if(!(a>0))return 'أدخل مبلغًا صحيحًا';if(!o.date)return 'أدخل تاريخ السداد';(x.pays=x.pays||[]).push({id:'q'+uid(),date:o.date,amount:a,note:o.note});mtLog(x,'سداد من المستأجر: '+fm(a));mtRefresh();toast('تم تسجيل السداد');setTimeout(()=>mtDlg(id),60)}});
  setTimeout(()=>$('#ff_amount')?.focus(),90);
}
function mtWaForm(id){
  const x=mtById(id);if(!x)return;const p=P()[x.pid];const EN=window.LANG==='en';
  const txt=EN?`Work order #${x.no} — ${mtKindL(x)==='نظافة'?'Cleaning':'Maintenance'}${x.cat?' ('+x.cat+')':''}\nProject: ${p.name}\nUnit: ${x.unit}\nPriority: ${x.prio==='urgent'?'URGENT':'Normal'}\nDetails: ${x.desc}\nKathib Operation & Maintenance`
    :`أمر عمل رقم ${x.no} — ${mtKindL(x)}${x.cat?' ('+x.cat+')':''}\nالمشروع: ${p.name}\nالوحدة: ${x.unit}\nالأولوية: ${x.prio==='urgent'?'عاجل':'عادي'}\nالتفاصيل: ${x.desc}\nشركة كثيب للتشغيل والصيانة`;
  formDlg({title:'إرسال الطلب للفني عبر واتساب',save:'فتح واتساب وإرسال',vals:{phone:x.vphone||'',text:txt},fields:[{k:'phone',l:'جوال الفني (واتساب)',ph:'05xxxxxxxx'},{k:'text',l:'نص الرسالة (قابل للتعديل)',t:'area',full:1}],
    onSave:v=>{const ph=waPhone(v.phone);if(!ph||ph.length<10)return 'أدخل رقم جوال صحيح للواتساب (مثل 05xxxxxxxx)';
      native.openExt('https://wa.me/'+ph+'?text='+encodeURIComponent(v.text)).then(ok=>{if(!ok){toast('تعذّر فتح واتساب');return}if(!x.vphone)x.vphone=v.phone;mtLog(x,'أُرسل الطلب للفني عبر واتساب');mtRefresh();toast('فُتح واتساب وسُجِّل الإرسال');setTimeout(()=>mtDlg(id),60)})}});
  const ta=document.getElementById('ff_text');if(ta)ta.rows=8;
}
function vMaint(){
  const E=S.mt,all=MT(),pn=id=>P()[id]?.name||'—';
  const q=E.q.toLowerCase(),L=all.filter(x=>(MS(E.p,x.pid))&&AO(E.k,z=>x.kind===z)&&AO(E.y,z=>x.payer===z)&&AO(E.r,z=>x.prio===z)&&AO(E.c,z=>x.cat===z)&&AO(E.v,z=>x.vendor===z)&&mtPer(x,E.d)&&AO(E.s,z=>z==='open'?mtOpenQ(x):z==='late'?mtLate(x):x.status===z)&&(!q||txt(x.unit,x.tenant,x.owner,x.desc,x.vendor,pn(x.pid),x.no).includes(q)));
  const SO={new:(a,b)=>String(b.date).localeCompare(String(a.date))||b.no-a.no,old:(a,b)=>String(a.date).localeCompare(String(b.date))||a.no-b.no,cost:(a,b)=>mtCost(b)-mtCost(a),urg:(a,b)=>(b.prio==='urgent')-(a.prio==='urgent')||String(a.date).localeCompare(String(b.date))};L.sort(SO[E.o]||SO.new);
  const cats=[...new Set(all.map(x=>x.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')),vens=[...new Set(all.map(x=>x.vendor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const open=all.filter(mtOpenQ),sm=(f,g)=>sum(all.filter(f),g);
  const kp=(l,v,i,c,val)=>val==null?`<div class="kp static ${c||''}"><span>${l}</span><b>${v}</b><i>${i||''}</i></div>`:kpf(l,v,'mt.s',val,{i,cls:c==='lt'?'l':c});
  const cols=[{h:'الرقم',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'النوع',k:'t'},{h:'الوصف',k:'t'},{h:'الأولوية',k:'d'},{h:'الحالة',k:'d'},{h:'يتحملها',k:'d'},{h:'التكلفة',k:'n'},{h:'المتبقي على المستأجر',k:'n'},{h:'تاريخ الطلب',k:'d'},{h:'الجهة المنفذة',k:'t'}];
  const cell=x=>[x.no,esc(pn(x.pid)),'<b>'+esc(x.unit)+'</b>',esc(mtKindL(x)+(x.cat?' — '+x.cat:'')),esc(String(x.desc||'').slice(0,70)),x.prio==='urgent'?'<span class="ch late">عاجل</span>':'عادي',`<span class="ch ${x.status==='done'?'ok':x.status==='cancel'?'':x.status==='wait'?'warn':''}">${MT_STL[x.status]}</span>`,MT_PL[x.payer],fm(mtCost(x)),x.payer==='tenant'?(mtLate(x)?'<span style="color:var(--late)">'+fm(mtRem(x))+'</span>':fm(mtRem(x))):'—',fs_(x.date),esc(x.vendor)||'—'];
  const rws=L.map(x=>({cls:(mtOpenQ(x)&&x.prio==='urgent')||mtLate(x)?'late':x.status==='wait'?'soon':'',attrs:` data-a="mtOpen" data-i="${esc(x.id)}"`,cells:cell(x)}));
  const tc=sum(L,mtCost),tr_=sum(L,mtRem);
  S.pm={title:'تقرير الصيانة والنظافة',sub:'عدد الطلبات: '+L.length+' — إجمالي التكلفة: '+fm(tc)+(E.p?' — المشروع: '+esc(pname(E.p)):''),cols,rows:L.map(x=>({cells:cell(x).map(c=>String(c).replace(/<[^>]+>/g,''))})),foot:['الإجمالي ('+L.length+')','','','','','','','',fm(tc),fm(tr_),'',''],footSpan:0};
  const byY=MT_PAYER.map(([k,l])=>{const a=L.filter(x=>x.payer===k&&x.status!=='cancel');return{l:k==='warranty'?'ضمان (الشركة المالكة)':l,n:a.length,c:sum(a,mtCost)}});
  const byP=Object.entries(L.reduce((o,x)=>{if(x.status==='cancel')return o;const a=o[x.pid]=o[x.pid]||{n:0,c:0};a.n++;a.c+=mtCost(x);return o},{}));
  const smry=L.length?`<div class="mtsm"><div><h3>التكلفة حسب من يتحملها</h3>${T([{h:'الجهة',k:'t'},{h:'الطلبات',k:'n'},{h:'التكلفة',k:'n'}],byY.map(o=>({cells:[o.l,o.n,fm(o.c)]})),{foot:['الإجمالي',sum(byY,o=>o.n),fm(sum(byY,o=>o.c))],footSpan:0})}</div>${byP.length>1?`<div><h3>التكلفة حسب المشروع</h3>${T([{h:'المشروع',k:'t'},{h:'الطلبات',k:'n'},{h:'التكلفة',k:'n'}],byP.map(([id,o])=>({cells:[esc(pn(id)),o.n,fm(o.c)]})),{foot:['الإجمالي',sum(byP,([,o])=>o.n),fm(sum(byP,([,o])=>o.c))],footSpan:0})}</div>`:''}</div>`:'';
  const sel=(id,v,opts)=>`<select id="${id}">${opts.map(([a,b])=>`<option value="${esc(a)}"${String(a)===String(v)?' selected':''}>${esc(b)}</option>`).join('')}</select>`;
  return `<h1>الصيانة والنظافة</h1><p class="sub">طلبات الصيانة والنظافة التي تنفذها شركة كثيب للتشغيل والصيانة. التكلفة يتحملها المالك (تُخصم من كشفه) أو المستأجر (مبلغ مستحق عليه) أو الضمان (على الشركة المالكة للمشروع). اضغط الطلب لعرض تفاصيله ومتابعته.</p>
<div class="bar">${msel('mt.p',PL(),'كل المشاريع')}${msel('mt.k',MT_KIND,'صيانة ونظافة')}${msel('mt.s',[['open','المفتوحة'],...MT_ST,['late','مستحق متأخر على مستأجر']],'كل الحالات')}${msel('mt.y',MT_PAYER.map(([a,b])=>[a,a==='warranty'?'ضمان':b]),'كل من يتحمل')}${msel('mt.r',MT_PRIO,'كل الأولويات')}${msel('mt.c',cats.map(c=>[c,c]),'كل التصنيفات')}${msel('mt.v',vens.map(c=>[c,c]),'كل الجهات المنفذة')}${sel('mt_d',E.d,[['','كل الفترات'],['m0','هذا الشهر'],['m1','الشهر الماضي'],['q','آخر 3 أشهر'],['y','هذه السنة']])}${sel('mt_o',E.o,[['new','الأحدث أولًا'],['old','الأقدم أولًا'],['cost','الأعلى تكلفة'],['urg','العاجل أولًا']])}
<input type="search" id="mt_q" placeholder="بحث: وحدة، مستأجر، وصف، فني" value="${esc(E.q)}"><button class="btn p" data-a="mtNew">+ طلب جديد</button>${pbtn('list')}</div>
<div class="kpis sm">${kp('طلبات مفتوحة',open.length,'جديد وقيد التنفيذ وبانتظار الموافقة','','open')}${kp('عاجلة مفتوحة',open.filter(x=>x.prio==='urgent').length,'','lt')}${kp('بانتظار موافقة',all.filter(x=>x.status==='wait').length,'','','wait')}${kp('مكتملة هذا الشهر',all.filter(x=>x.status==='done'&&String(x.done).slice(0,7)===iso(TODAY).slice(0,7)).length,'','','done')}${kp('مستحق على مستأجرين',fm(sum(all,mtRem)),all.filter(mtLate).length?all.filter(mtLate).length+' متأخر':'','lt','late')}${kp('تكلفة الضمان',fm(sm(x=>x.payer==='warranty'&&x.status!=='cancel',mtCost)),'على الشركة المالكة للمشروع')}</div>
${L.length?T(cols,rws,{foot:S.pm.foot}):'<p class="empty">لا توجد طلبات مطابقة. اضغط «+ طلب جديد» لتسجيل طلب صيانة أو نظافة.</p>'}${smry}`;
}
VF.maint=vMaint;
/* قسم في كشف حساب المالك */
function mtOwnerSec(name,print){
  const L=MT().filter(x=>x.payer==='owner'&&x.status==='done'&&((String(x.owner||'').trim()||'(بدون مالك)')===name));
  if(!L.length)return '';
  const t=sum(L,mtCost),o=ownerStatements(ownerRows(name))[0],net=o?o.net:0;
  return `<h3>الصيانة والنظافة المحمَّلة على المالك</h3>${T([{h:'الرقم',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'النوع',k:'t'},{h:'الوصف',k:'t'},{h:'تاريخ الإنجاز',k:'d'},{h:'التكلفة',k:'n'}],L.map(x=>({cells:[x.no,esc(P()[x.pid]?.name||''),'<b>'+esc(x.unit)+'</b>',esc(mtKindL(x)+(x.cat?' — '+x.cat:'')),esc(String(x.desc||'').slice(0,60)),fs_(x.done),fm(mtCost(x))]})),{print,foot:['الإجمالي','','','','','',fm(t)],footSpan:0})}<div class="sum"><div><span>صافي المحصَّل</span><b>${fm(net)}</b></div><div><span>الصيانة والنظافة</span><b>${fm(t)}</b></div><div><span>الصافي بعد الصيانة والنظافة</span><b>${fm(r2(net-t))}</b></div></div>`;
}
Object.assign(act,{mtNew:()=>mtForm(),mtOpen:b=>mtDlg(b.dataset.i),mtEdit:b=>mtForm(b.dataset.i),mtPay:b=>mtPayForm(b.dataset.i),mtWa:b=>mtWaForm(b.dataset.i),
  mtAtt:b=>{const x=mtById(b.dataset.i);if(x)attDlg('طلب '+x.no,()=>mtById(b.dataset.i))},
  mtSt:b=>{const x=mtById(b.dataset.i);if(!x||x.status===b.dataset.s)return;x.status=b.dataset.s;x.done=x.status==='done'?(x.done||iso(TODAY)):'';mtLog(x,'الحالة: '+MT_STL[x.status]);mtRefresh()},
  mtNote:b=>{const x=mtById(b.dataset.i),el=document.getElementById('mt_note');if(!x||!el||!el.value.trim())return;mtLog(x,el.value.trim());mtRefresh()},
  mtPayDel:b=>arm(b,()=>{const x=mtById(b.dataset.i);if(!x)return;x.pays=(x.pays||[]).filter(q=>q.id!==b.dataset.q);mtLog(x,'حُذفت دفعة مسجلة');mtRefresh()}),
  mtDel:b=>arm(b,()=>{S.db.mreq=MT().filter(x=>x.id!==b.dataset.i);$('#stm').close();persist();render();toast('تم حذف الطلب')})});
document.addEventListener('input',e=>{if(e.target.id==='mt_q'){S.mt.q=e.target.value.trim();render()}});
document.addEventListener('change',e=>{const m={mt_p:'p',mt_k:'k',mt_s:'s',mt_y:'y',mt_r:'r',mt_c:'c',mt_v:'v',mt_d:'d',mt_o:'o'}[e.target.id];if(m){S.mt[m]=e.target.value;render()}});

/* تنظيف وحدات المشروع: وحدات بلا عقود في هذا المشروع (مثل وحدة أُضيفت بالخطأ ثم نُقل عقدها) */
function unitCleanDlg(pid){
  const p=P()[pid];if(!p)return;
  const others=Object.entries(P()).filter(([k])=>k!==pid);
  const L=(p.units||[]).filter(u=>!(p.contracts||[]).some(c=>normU(c.unit)===normU(u.no))).map(u=>({u,els:others.filter(([,q])=>(q.contracts||[]).some(c=>normU(c.unit)===normU(u.no))).map(([,q])=>q.name)}));
  if(!L.length){toast('لا توجد وحدات بلا عقود في هذا المشروع');return}
  const html='<p class="sub">وحدات هذا المشروع التي ليس لها أي عقد فيه. الموجودة بعقود في مشروع آخر محددة مسبقًا لأنها غالبًا أُضيفت بالخطأ. حدّد ما تريد حذفه من هذا المشروع (لا يُحذف أي عقد).</p>'+L.map(o=>`<label class="chk" style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" class="uc" value="${esc(o.u.id)}"${o.els.length?' checked':''}><b>${esc(o.u.no)}</b>${o.els.length?'<small>— لها عقود في: '+esc(o.els.join('، '))+'</small>':'<small>— وحدة متاحة بلا عقود</small>'}</label>`).join('');
  formDlg({title:'تنظيف وحدات '+p.name,save:'حذف المحدد',vals:{},fields:[{t:'info',k:'i',html}],onSave:()=>{
    const ids=[...document.querySelectorAll('#frm .uc:checked')].map(i=>i.value);if(!ids.length)return 'لم تحدد أي وحدة';
    mutate(pid,q=>{q.units=(q.units||[]).filter(u=>!ids.includes(u.id))});toast('تم حذف '+ids.length+' وحدة');setTimeout(()=>projDlg(pid),80)}});
}
act.unitClean=()=>unitCleanDlg(S.pj);
