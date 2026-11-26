/* التقارير المجدولة: كشف شهري لكل مالك + تقرير تحصيل أسبوعي، تُحفظ PDF على الجهاز في مجلد «reports» */
'use strict';
const SC_KEY='repCfg';
const scCfg=()=>{let c={};try{c=JSON.parse(localStorage.getItem(SC_KEY)||'{}')}catch{}return{m:{on:false,day:1,...(c.m||{})},w:{on:false,dow:0,...(c.w||{})},last:c.last||{}}};
const scSave=c=>{try{localStorage.setItem(SC_KEY,JSON.stringify(c))}catch{}};
const SC_DOW=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
function scOwnerNames(){return ownerStatements(rowsI()).map(o=>o.name).filter(n=>n&&n!=='(بدون مالك)').sort((a,b)=>a.localeCompare(b,'ar'))}
function scOwnerHtml(name){
  return docHtml({title:'كشف حساب مالك: '+esc(name),sub:'كشف شهري بتاريخ '+iso(TODAY),body:ownerBody(name,true)+(typeof mtOwnerSec==='function'?mtOwnerSec(name,true):'')});
}
async function scGenMonthly(manual){
  const names=scOwnerNames(),ym=iso(TODAY).slice(0,7);let ok=0,fail=0;
  for(const n of names){try{await native.reportSave(scOwnerHtml(n),'كشوف الملاك/'+ym,'كشف-'+n);ok++}catch(e){fail++}}
  return{ok,fail,dir:'كشوف الملاك/'+ym};
}
function scWeeklyHtml(){
  const to=TODAY,from=TODAY-6*DAY,inR=d=>{const t=pd(d);return t!=null&&t>=from&&t<=to};
  const pn=id=>(P()[id]||{}).name||'';
  const L=[];
  for(const x of rowsI())for(const p of x.c.payments||[])if(inR(p.date))L.push({d:p.date,pn:x.pn,unit:x.c.unit,who:x.c.tenant||'',k:'إيجار',a:+p.amount||0,m:p.method||'',n:p.rno?'سند '+p.rno:''});
  for(const x of SV())for(const p of x.pays||[])if(inR(p.date))L.push({d:p.date,pn:pn(x.pid),unit:x.unit,who:x.name||'',k:x.type||'رسوم',a:+p.amount||0,m:'',n:p.ap?'اعتماد '+p.ap:''});
  for(const x of MT())for(const p of x.pays||[])if(inR(p.date))L.push({d:p.date,pn:pn(x.pid),unit:x.unit,who:x.tenant||'',k:'صيانة',a:+p.amount||0,m:'',n:x.no?'طلب '+x.no:''});
  L.sort((a,b)=>String(a.d).localeCompare(String(b.d))||a.pn.localeCompare(b.pn,'ar'));
  const tot=sum(L,x=>x.a),byK={};for(const x of L)byK[x.k]=(byK[x.k]||0)+x.a;
  const byP={};for(const x of L)(byP[x.pn]=byP[x.pn]||{n:0,a:0}),byP[x.pn].n++,byP[x.pn].a+=x.a;
  const R=rowsI(),late=R.filter(x=>x.r.late_n).sort((a,b)=>b.r.late-a.r.late),next7=[];
  for(const x of R)for(const i of x.r.inst)if(i.status!=='paid'&&i.date!=null&&i.date>to&&i.date<=to+7*DAY)next7.push({x,i});
  next7.sort((a,b)=>a.i.date-b.i.date);
  const ap=(typeof S.ap!=='undefined'&&S.cl&&S.cl.on)?S.ap.list.filter(r=>r.status==='pending').length:null;
  const kp=(l,v)=>`<div><span>${l}</span><b>${v}</b></div>`;
  const body=`<div class="sum">${kp('إجمالي المحصَّل خلال الأسبوع',fm(tot))}${kp('عدد الدفعات',L.length)}${kp('إجمالي المتأخر الحالي',fm(sum(late,x=>x.r.late)))}${kp('عقود متأخرة',late.length)}</div>
${Object.keys(byK).length?'<p>'+Object.entries(byK).map(([k,v])=>esc(k)+': <b>'+fm(v)+'</b>').join(' &nbsp;|&nbsp; ')+'</p>':''}
<h3>المحصَّل حسب المشروع</h3>${T([{h:'المشروع',k:'t'},{h:'عدد الدفعات',k:'n'},{h:'المحصَّل',k:'n'}],Object.entries(byP).sort((a,b)=>b[1].a-a[1].a).map(([k,v])=>({cells:[esc(k),v.n,fm(v.a)]})),{print:true,foot:['الإجمالي',L.length,fm(tot)]})}
<h3>تفاصيل الدفعات</h3>${L.length?T([{h:'التاريخ',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'الاسم',k:'t'},{h:'النوع',k:'t'},{h:'المبلغ',k:'n'},{h:'طريقة / مرجع',k:'t'}],L.map(x=>({cells:[fs_(x.d),esc(x.pn),'<b>'+esc(x.unit)+'</b>',esc(x.who)||'—',esc(x.k),fm(x.a),esc([x.m,x.n].filter(Boolean).join(' — '))||'—']})),{print:true}):'<p>لا توجد دفعات مسجَّلة خلال الأسبوع.</p>'}
<h3>أكبر المتأخرات</h3>${late.length?T([{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'المتأخر',k:'n'},{h:'المتبقي',k:'n'}],late.slice(0,15).map(x=>({cells:[esc(x.pn),'<b>'+esc(x.c.unit)+'</b>',esc(x.c.tenant)||'—',fm(x.r.late),fm(x.r.rem)]})),{print:true}):'<p>لا متأخرات.</p>'}
<h3>أقساط تستحق خلال الأسبوع القادم</h3>${next7.length?T([{h:'الاستحقاق',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'المبلغ',k:'n'}],next7.slice(0,25).map(({x,i})=>({cells:[fd(i.date),esc(x.pn),'<b>'+esc(x.c.unit)+'</b>',esc(x.c.tenant)||'—',fm(i.due??i.amount)]})),{print:true}):'<p>لا أقساط.</p>'}
${ap!=null?'<p>طلبات الاعتماد المعلّقة حاليًا: <b>'+ap+'</b></p>':''}`;
  return docHtml({title:'تقرير التحصيل الأسبوعي',sub:'من '+iso(from)+' إلى '+iso(to),body});
}
async function scGenWeekly(){return native.reportSave(scWeeklyHtml(),'تقارير التحصيل الأسبوعية','تحصيل-'+iso(TODAY))}
function scNotify(t,b){try{const n=new Notification(t,{body:b});n.onclick=()=>{window.focus()}}catch{}}
let scBusy=false;
async function scTick(){
  if(scBusy||!S.db||(S.cl&&S.cl.on&&!S.cl.base))return;
  const c=scCfg(),now=iso(TODAY),ym=now.slice(0,7);let ch=false;scBusy=true;
  try{
    if(c.m.on){const d=Math.min(28,Math.max(1,+c.m.day||1)),due=ym+'-'+String(d).padStart(2,'0');
      if(now>=due&&c.last.m!==ym){const r=await scGenMonthly();c.last.m=ym;ch=true;scNotify('كشوف الملاك الشهرية جاهزة',r.ok+' كشفًا في مجلد التقارير'+(r.fail?' (تعذّر '+r.fail+')':''));toast('تم توليد كشوف الملاك الشهرية: '+r.ok)}}
    if(c.w.on){const t=pd(now),back=(new Date(t).getUTCDay()-(+c.w.dow||0)+7)%7,dueD=iso(t-back*DAY);
      if(c.last.w!==dueD){await scGenWeekly();c.last.w=dueD;ch=true;scNotify('تقرير التحصيل الأسبوعي جاهز','تم حفظه في مجلد التقارير');toast('تم توليد تقرير التحصيل الأسبوعي')}}
  }catch(e){console.error('sched',e)}finally{scBusy=false;if(ch)scSave(c)}
}
function schedCard(){
  const c=scCfg();
  return `<div class="card" data-t="d"><h3>التقارير المجدولة (PDF على هذا الجهاز)</h3><p class="sub">تُولَّد الملفات تلقائيًا في مجلد «التقارير» عند موعدها أو عند أول فتح للتطبيق بعده، مع تنبيه ويندوز. فعِّلها على الجهاز الذي تريد حفظ التقارير عليه.</p>
<div class="row"><label><input type="checkbox" id="sc_m"${c.m.on?' checked':''}> كشف شهري لكل مالك — يوم</label><select id="sc_md">${Array.from({length:28},(_,i)=>`<option value="${i+1}"${+c.m.day===i+1?' selected':''}>${i+1}</option>`).join('')}</select><span class="mut">من كل شهر${c.last.m?' · آخر توليد: '+esc(c.last.m):''}</span></div>
<div class="row"><label><input type="checkbox" id="sc_w"${c.w.on?' checked':''}> تقرير تحصيل أسبوعي — كل</label><select id="sc_wd">${SC_DOW.map((d,i)=>`<option value="${i}"${+c.w.dow===i?' selected':''}>${d}</option>`).join('')}</select>${c.last.w?'<span class="mut">آخر توليد: '+esc(c.last.w)+'</span>':''}</div>
<div class="row"><button class="btn" data-a="scNowM">توليد كشوف الملاك الآن</button><button class="btn" data-a="scNowW">توليد تقرير التحصيل الأسبوعي الآن</button><button class="btn" data-a="scDir">فتح مجلد التقارير</button></div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;if(!t.id||!/^sc_(m|md|w|wd)$/.test(t.id))return;
  const c=scCfg();if(t.id==='sc_m')c.m.on=t.checked;else if(t.id==='sc_md')c.m.day=+t.value;else if(t.id==='sc_w')c.w.on=t.checked;else c.w.dow=+t.value;
  scSave(c);toast('تم حفظ الجدولة');setTimeout(scTick,200)});
Object.assign(act,{
  scNowM:async b=>{b.disabled=true;toast('جارٍ توليد كشوف الملاك…');try{const r=await scGenMonthly();toast('تم توليد '+r.ok+' كشفًا'+(r.fail?' وتعذّر '+r.fail:'')+' — مجلد التقارير/'+r.dir)}catch(e){toast('تعذّر التوليد')}b.disabled=false},
  scNowW:async b=>{b.disabled=true;try{await scGenWeekly();toast('تم توليد التقرير في مجلد التقارير')}catch(e){toast('تعذّر التوليد')}b.disabled=false},
  scDir:()=>native.reportDir()
});
setInterval(()=>scTick(),30*60e3);setTimeout(()=>scTick(),9000);
