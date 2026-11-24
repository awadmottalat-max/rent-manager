/* التنبيهات الاستباقية + تذكير السداد عبر واتساب مع سجل التذكيرات */
'use strict';
Object.assign(S,{al:{s:'all',p:'',q:''}});
const RM=()=>S.db.reminders=S.db.reminders||[];
const REM_DEF=()=>`السلام عليكم ورحمة الله وبركاته،
عزيزنا {المستأجر}، نرجو أن تكونوا بخير 🌷
نذكّركم بلطف بسداد دفعة إيجار الوحدة {الوحدة} ({المشروع}) بمبلغ {المبلغ} ريال، {الاستحقاق}.
نشكر لكم تعاونكم، وإن كان السداد قد تمّ فنعتذر عن التذكير.
${S.db.settings.operator||'شركة كثيب لإدارة الأملاك'}`;
const remTpl=()=>S.db.settings.remTpl||REM_DEF();
const money=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
const DAY7=7;
/* رقم الجوال بصيغة دولية لواتساب (السعودية افتراضيًا) */
function waPhone(v){let d=String(v||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g,'');if(!d)return'';if(d.startsWith('00'))d=d.slice(2);
  if(d.startsWith('966'))return d;if(d.startsWith('05')&&d.length===10)return'966'+d.slice(1);if(d.length===9&&d[0]==='5')return'966'+d;return d}
const tenPhone=name=>(PR('tenants').find(r=>nm(r.name)===nm(name))||{}).phone||'';
const lastRem=cid=>RM().find(r=>r.cid===cid);
const agoTxt=t=>{const d=Math.floor((Date.now()-t)/864e5);return d<=0?'اليوم':d===1?'أمس':'قبل '+d+' يومًا'};

/* بنود التنبيه لكل عقد: أقساط متأخرة أو تستحق خلال 7 أيام */
function alertItems(all){
  const late=[],soon=[];
  for(const x of all){if(x.r.st==='منتهي'&&endState(x.pid,x.c)!=='pend')continue;if(x.c.exit&&pd(x.c.exit.date)<=TODAY)continue;
    const L=x.r.inst.filter(i=>i.due>0.005&&i.late),U=x.r.inst.filter(i=>i.due>0.005&&!i.waived&&!i.late&&i.date!=null&&i.date>=TODAY&&i.date-TODAY<=DAY7*DAY);
    if(L.length){const old=Math.min(...L.map(i=>i.date));late.push({x,inst:L,amount:sum(L,i=>i.due),first:old,days:Math.round((TODAY-old)/DAY)})}
    else if(U.length){const f=Math.min(...U.map(i=>i.date));soon.push({x,inst:U,amount:sum(U,i=>i.due),first:f,days:Math.round((f-TODAY)/DAY)})}}
  late.sort((a,b)=>b.days-a.days);soon.sort((a,b)=>a.first-b.first);return{late,soon};
}
function alertCount(all){try{const a=alertItems(all);return a.late.length+a.soon.length+renewalsOpen(all,60).length+(typeof feeAlerts==='function'?feeAlerts().length:0)}catch{return 0}}

/* ===== نافذة تأكيد التذكير ===== */
function fillTpl(t,o){return t.replace(/\{المستأجر\}/g,o.tenant).replace(/\{الوحدة\}/g,o.unit).replace(/\{المشروع\}/g,o.project).replace(/\{المبلغ\}/g,money(o.amount)).replace(/\{الاستحقاق\}/g,o.when)}
function remindDlg(pid,cid){
  const all=rows(),x=all.find(z=>z.pid===pid&&z.c.id===cid);if(!x)return toast('العقد غير موجود');
  const it=[...alertItems([x]).late,...alertItems([x]).soon][0];
  const inst=it?it.inst:x.r.inst.filter(i=>i.due>0.005&&i.status!=='paid').slice(0,1);
  if(!inst.length)return toast('لا أقساط مستحقة على هذا العقد');
  const amount=sum(inst,i=>i.due),first=Math.min(...inst.map(i=>i.date??1e12)),late=inst.some(i=>i.late);
  const when=first>=1e12?'':late?(inst.length>1?'وأقدمها بتاريخ ':'والمستحقة بتاريخ ')+iso(first)+' (متأخرة)':'وتستحق بتاريخ '+iso(first);
  const o={tenant:nm(x.c.tenant)||'المستأجر الكريم',unit:x.c.unit||'',project:x.pn,amount,when:when||'والمستحقة حاليًا'};
  const lr=lastRem(cid),phone=tenPhone(x.c.tenant);
  formDlg({title:'تأكيد إرسال تذكير سداد',save:'نعم، افتح واتساب وأرسل التذكير الآن',vals:{phone,text:fillTpl(remTpl(),o),saveTpl:'no',savePh:phone?'no':'yes'},
    fields:[{t:'info',html:`<div class="sum"><div><span>المستأجر</span><b>${esc(x.c.tenant)||'—'}</b></div><div><span>الوحدة</span><b>${esc(x.c.unit)} — ${esc(x.pn)}</b></div><div><span>المبلغ المطلوب تذكيره</span><b>${fm(amount)}</b></div></div>${lr?`<p class="warnbox" style="display:block;margin:8px 0 0">سبق تذكير هذا المستأجر ${agoTxt(lr.at)}.</p>`:''}<p style="margin:10px 0 0;color:var(--mut);font-size:13px">هل تريد إرسال التذكير الآن؟ عدّل الرسالة كما تشاء، ولن يُرسَل شيء ولن يُسجَّل في سجل التذكيرات إلا بعد ضغط زر التأكيد.</p>`},
      {k:'phone',l:'جوال المستأجر (واتساب)',ph:'05xxxxxxxx'},
      {k:'text',l:'نص الرسالة (قابل للتعديل)',t:'area',full:1},
      {k:'saveTpl',l:'حفظ هذا النص كنص افتراضي للتذكيرات القادمة؟',t:'select',opts:[['no','لا'],['yes','نعم']],def:'no'},
      {k:'savePh',l:'حفظ الرقم في بطاقة المستأجر؟',t:'select',opts:[['yes','نعم'],['no','لا']],def:phone?'no':'yes'}],
    onSave:v=>{const ph=waPhone(v.phone);if(!ph||ph.length<10)return 'أدخل رقم جوال صحيح للواتساب (مثل 05xxxxxxxx)';if(!v.text.trim())return 'نص الرسالة فارغ';
      native.openExt('https://wa.me/'+ph+'?text='+encodeURIComponent(v.text)).then(ok=>{
        if(!ok){toast('تعذّر فتح واتساب');return}
        RM().unshift({id:'m'+uid(),pid,cid,tenant:nm(x.c.tenant),unit:x.c.unit,project:x.pn,phone:ph,amount,inst:inst.map(i=>i.n),at:Date.now(),text:v.text.trim(),ch:'whatsapp'});
        if(v.saveTpl==='yes'){const t=v.text.trim();S.db.settings.remTpl=t}
        if(v.savePh==='yes'&&nm(x.c.tenant)){const L=PR('tenants');let r=L.find(z=>nm(z.name)===nm(x.c.tenant));if(!r){r={id:'r'+uid(),name:nm(x.c.tenant)};L.push(r)}r.phone=v.phone.trim()}
        persist();toast('فُتح واتساب وسُجِّل التذكير');render()});
    }});
  const ta=document.getElementById('ff_text');if(ta)ta.rows=8;
}

/* ===== شاشة التنبيهات ===== */
const ALS={all:'كل التنبيهات',fee:'رسوم إدارة أملاك',late:'أقساط متأخرة',soon:'تستحق خلال 7 أيام',exp:'عقود تنتهي خلال 60 يومًا',pend:'منتهية بانتظار قرار',log:'سجل التذكيرات'};
function vAlerts(all){
  const F=S.al,q=(F.q||'').toLowerCase(),A=alertItems(all.filter(x=>(!F.p||x.pid===F.p)&&(!q||txt(x.c.unit,x.c.tenant,x.c.owner,x.pn).includes(q))));
  const rn=renewalsOpen(all,60).filter(x=>x.days>=0&&(!F.p||x.pid===F.p)&&(!q||txt(x.c.unit,x.c.tenant,x.c.owner,x.pn).includes(q))).sort((a,b)=>a.days-b.days);
  const pend=all.filter(x=>x.r.st==='منتهي'&&endState(x.pid,x.c)==='pend'&&(!F.p||x.pid===F.p)&&(!q||txt(x.c.unit,x.c.tenant,x.c.owner,x.pn).includes(q))).sort((a,b)=>(pd(b.c.end)||0)-(pd(a.c.end)||0));
  const log=RM().filter(r=>(!F.p||r.pid===F.p)&&(!q||txt(r.unit,r.tenant,r.project).includes(q)));
  const FA=feeAlerts().filter(o=>(!F.p||o.x.pid===F.p)&&(!q||txt(o.x.c.unit,o.x.c.tenant,o.x.c.owner,o.x.pn).includes(q)));
  const cnt={fee:FA.length,late:A.late.length,soon:A.soon.length,exp:rn.length,pend:pend.length,log:log.length};
  const show=k=>F.s==='all'?k!=='log':F.s===k;
  const remCell=o=>{const r=lastRem(o.x.c.id);return r?`<span class="ch ok">ذُكِّر ${agoTxt(r.at)}</span>`:'<span class="ch">لم يُذكَّر</span>'};
  const btns=o=>`<button class="btn sm p" data-a="remind" data-p="${esc(o.x.pid)}" data-c="${esc(o.x.c.id)}">تذكير واتساب</button> <button class="btn sm" data-a="qpay" data-p="${esc(o.x.pid)}" data-c="${esc(o.x.c.id)}" data-v="${o.amount}" data-n="${o.inst[0].n}">دفعة</button>`;
  const dueCols=(wl)=>[{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'الجوال',k:'t'},{h:'المبلغ المستحق',k:'n'},{h:wl,k:'d'},{h:'آخر تذكير',k:'t'},{h:'',k:'ac'}];
  const dueRows=(L,late)=>L.map(o=>({cls:late&&o.days>30?'late':'',attrs:open_(o.x),cells:[esc(o.x.pn),'<b>'+esc(o.x.c.unit)+'</b>',esc(o.x.c.tenant)||'—',esc(tenPhone(o.x.c.tenant))||'<small>غير مسجل</small>','<b>'+fm(o.amount)+'</b>',fd(o.first)+'<small>'+(late?'متأخر '+o.days+' يومًا':o.days===0?'اليوم':'بعد '+o.days+' أيام')+'</small>',remCell(o),btns(o)]}));
  const sec=(k,title,body,n)=>show(k)?`<h3 class="alh">${title} <span class="bd2">${n}</span></h3>${body}`:'';
  const empty=m=>`<div class="card empty">${m}</div>`;
  const lateT=A.late.length?T(dueCols('أقدم استحقاق'),dueRows(A.late,true),{foot:['الإجمالي: '+A.late.length+' عقدًا','','','',fm(sum(A.late,o=>o.amount)),'','','']}):empty('لا أقساط متأخرة 🎉');
  const soonT=A.soon.length?T(dueCols('الاستحقاق'),dueRows(A.soon,false)):empty('لا أقساط تستحق خلال 7 أيام.');
  const expT=rn.length?T([{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'نهاية العقد',k:'d'},{h:'المتبقي (يوم)',k:'n'},{h:'الإجراء',k:'ac'}],rn.map(x=>({attrs:open_(x),cells:[esc(x.pn),'<b>'+esc(x.c.unit)+'</b>',esc(x.c.tenant)||'—',fs_(x.c.end),x.days,endBtns(x)]}))):empty('لا عقود تنتهي خلال 60 يومًا.');
  const pendT=pend.length?T([{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'انتهى في',k:'d'},{h:'المتبقي',k:'n'},{h:'الإجراء',k:'ac'}],pend.map(x=>({attrs:open_(x),cells:[esc(x.pn),'<b>'+esc(x.c.unit)+'</b>',esc(x.c.tenant)||'—',fs_(x.c.end),fm(x.r.rem>0?x.r.rem:0),endBtns(x)]}))):empty('لا عقود منتهية بانتظار قرار.');
  const logT=log.length?T([{h:'التاريخ والوقت',k:'t'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'الجوال',k:'t'},{h:'المبلغ',k:'n'},{h:'الرسالة',k:'t'},{h:'',k:'ac'}],log.slice(0,300).map(r=>{const d=new Date(r.at),z=n=>String(n).padStart(2,'0'),ds=d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes());
    return{cells:[`<bdi>${ds}</bdi>`,esc(r.project),'<b>'+esc(r.unit)+'</b>',esc(r.tenant)||'—','<bdi>'+esc(r.phone)+'</bdi>',fm(r.amount),`<small title="${esc(r.text)}">${esc(String(r.text).replace(/\s+/g,' ').slice(0,70))}…</small>`,`<button class="btn sm" data-a="remind" data-p="${esc(r.pid)}" data-c="${esc(r.cid)}">تذكير مجددًا</button>`]}})):empty('لم يُرسَل أي تذكير بعد. يُسجَّل التذكير هنا بعد تأكيدك وفتح واتساب.');
  const feeT=FA.length?T([{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المالك',k:'t'},{h:'الجوال',k:'t'},{h:'رسوم الإدارة المستحقة',k:'n'},{h:'الاستحقاق',k:'d'},{h:'آخر تذكير',k:'t'},{h:'',k:'ac'}],FA.map(o=>({cls:o.late&&o.days>30?'late':'',attrs:open_(o.x),cells:[esc(o.x.pn),'<b>'+esc(o.x.c.unit)+'</b>',esc(o.x.c.owner)||'—',esc(ownPhone(o.x.c.owner))||'<small>غير مسجل</small>','<b>'+fm(o.amount)+'</b>',fd(o.first)+'<small>'+(o.late?'متأخر '+o.days+' يومًا':o.days===0?'اليوم':'بعد '+o.days+' يومًا')+'</small>',remCell(o),`<button class="btn sm p" data-a="feeRemind" data-p="${esc(o.x.pid)}" data-c="${esc(o.x.c.id)}">تذكير واتساب</button> <button class="btn sm" data-a="feePayQ" data-p="${esc(o.x.pid)}" data-c="${esc(o.x.c.id)}" data-v="${o.amount}">سداد</button>`]})),{foot:['الإجمالي: '+FA.length+' عقدًا','','','',fm(sum(FA,o=>o.amount)),'','','']}):empty('لا رسوم إدارة متأخرة أو قريبة الاستحقاق.');
  const kp=(k,l,n,cls='')=>`<button class="kp ${cls}${F.s===k?' on':''}" data-a="alSt" data-s="${k}"><span>${l}</span><b>${n}</b></button>`;
  return `<h1>التنبيهات</h1><p class="sub">ما يحتاج متابعتك اليوم: أقساط متأخرة أو قادمة خلال 7 أيام مع تذكير واتساب بنقرة (بعد تأكيدك فقط)، وعقود تنتهي قريبًا، وسجل بكل تذكير أُرسل.</p>
<div class="bar"><select id="al_p">${projOpts(F.p,true)}</select><input type="search" id="al_q" placeholder="بحث: وحدة، مستأجر، مالك" value="${esc(F.q)}"><button class="btn" data-a="remTpl">تعديل نص التذكير الافتراضي</button></div>
<div class="kpis sm">${kp('all','الكل',cnt.fee+cnt.late+cnt.soon+cnt.exp+cnt.pend)}${kp('fee',ALS.fee,cnt.fee,cnt.fee?'l':'')}${kp('late',ALS.late,cnt.late,'l')}${kp('soon',ALS.soon,cnt.soon)}${kp('exp',ALS.exp,cnt.exp)}${kp('pend',ALS.pend,cnt.pend)}${kp('log',ALS.log,cnt.log)}</div>
${sec('fee','🟣 رسوم إدارة أملاك (عقود خارجية)',feeT,cnt.fee)}${sec('late','🔴 '+ALS.late,lateT,cnt.late)}${sec('soon','🟡 '+ALS.soon,soonT,cnt.soon)}${sec('exp','🟠 '+ALS.exp,expT,cnt.exp)}${sec('pend','⚪ '+ALS.pend,pendT,cnt.pend)}${sec('log','🕘 '+ALS.log,logT,cnt.log)}`;
}
function remTplDlg(){
  formDlg({title:'نص التذكير الافتراضي',vals:{t:remTpl()},fields:[{t:'info',html:'<p style="margin:0;color:var(--mut);font-size:13px">يمكنك استخدام: <bdi>{المستأجر}</bdi> <bdi>{الوحدة}</bdi> <bdi>{المشروع}</bdi> <bdi>{المبلغ}</bdi> <bdi>{الاستحقاق}</bdi> — تُستبدل تلقائيًا عند كل تذكير، وتبقى قابلة للتعديل قبل الإرسال.</p>'},{k:'t',l:'نص الرسالة',t:'area',full:1}],
    onSave:v=>{if(!v.t.trim())return 'النص فارغ';S.db.settings.remTpl=v.t.trim();persist();toast('تم حفظ النص');render()}});
  const ta=document.getElementById('ff_t');if(ta)ta.rows=9;
}
VF.alerts=vAlerts;
Object.assign(act,{remind:b=>remindDlg(b.dataset.p,b.dataset.c),alSt:b=>{S.al.s=b.dataset.s;render()},remTpl:remTplDlg});
document.addEventListener('input',e=>{if(e.target.id==='al_q'){S.al.q=e.target.value.trim();render()}});
document.addEventListener('change',e=>{if(e.target.id==='al_p'){S.al.p=e.target.value;render()}});
