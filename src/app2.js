/* اتفاقيات التأجير والتحليل المالي */
'use strict';
Object.assign(S,{agr:{p:'',q:'',s:'',o:'',m:''},fin:{p:'',q:'',m:'',d:'',o:'',v:''}});
const VATP=()=>Number(S.db.settings.vat??15);
const A_=()=>S.db.agreements=S.db.agreements||[];
const N_=()=>S.db.analyses=S.db.analyses||[];
const cOf=(pid,cid)=>P()[pid]?.contracts.find(c=>c.id===cid);
const rv=id=>document.getElementById(id)?.value??'';
const nv=id=>{const v=rv(id).trim();return v===''?'':Number(v)};
const MG_LAB={pct:'نسبة مئوية من الإيجار السنوي',fixed:'مبلغ مقطوع'};
const FM_LAB={owner:'يدفعها المالك مباشرة (لا تُخصم)',company:'تدفعها الشركة وتُخصم من دفعة'};
const DEF_CLAUSES=`1. يلتزم الطرف الأول (المالك) بتسليم العين المؤجرة للطرف الثاني (المستأجر) صالحة للاستخدام، ويلتزم الطرف الثاني بسداد الأجرة في مواعيدها المبينة أدناه.
2. يفوّض المالك الطرف الثالث (المشغّل) بإدارة العين المؤجرة وتحصيل الأجرة ومتابعة الصيانة والنظافة والخدمات، مقابل رسوم الإدارة المبينة أدناه.
3. تُخصم رسوم الإدارة وما يترتب عليها من ضريبة القيمة المضافة من الدفعات المحددة أدناه قبل تحويل الصافي إلى المالك.
4. رسوم توثيق عقد الإيجار مبلغ مقطوع وفق ما هو مبين أدناه، وتُسدَّد وفق الطريقة المحددة.
5. تُضاف ضريبة القيمة المضافة النظامية على الرسوم الخاضعة لها وفق الأنظمة المعمول بها.
6. تُخصم تكاليف الصيانة والنظافة والمرافق التي يتكبدها المشغّل نيابة عن المالك من الدفعات بموجب كشف تحليل مالي يُسلَّم للمالك.
7. تسري هذه الاتفاقية طوال مدة عقد الإيجار، وتُرفع أي منازعة للجهات المختصة في المملكة العربية السعودية.`;

/* ===== اتفاقيات التأجير ===== */
const AGST={act:'سارية',fut:'لم تبدأ',end:'منتهية',nod:'بلا تواريخ'};
function agrSt(a){const s=pd(a.start),e=pd(a.end);if(s==null&&e==null)return'nod';if(s!=null&&s>TODAY)return'fut';if(e!=null&&e<TODAY)return'end';return'act'}
function agrFilters(){
  const ow=[...new Set(A_().map(a=>String(a.owner||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')),F=S.agr,o=(v,l,c)=>`<option value="${esc(v)}"${c===v?' selected':''}>${esc(l)}</option>`;
  return `${msel('agr.s',Object.entries(AGST),'كل الحالات')}${msel('agr.o',ow.map(x=>[x,x]),'كل الملاك')}${msel('agr.m',[['pct','نسبة مئوية'],['fixed','مبلغ مقطوع']],'كل أنواع الرسوم')}${(F.p||F.s||F.o||F.m||F.q)?'<button class="btn" data-a="agrReset">مسح الفلاتر</button>':''}`;
}
function agrRows(){
  const q=S.agr.q.toLowerCase(),F=S.agr;
  return A_().filter(a=>(MS(F.p,a.pid))&&AO(F.o,z=>nm(a.owner)===nm(z))&&AO(F.m,z=>a.mgmt?.type===z)&&AO(F.s,z=>agrSt(a)===z)&&(!q||txt(a.no,a.unit,a.owner,a.tenant,pname(a.pid)).includes(q)));
}
function vAgr(){
  const L=agrRows(),cols=[{h:'رقم',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'الإيجار السنوي',k:'n'},{h:'رسوم الإدارة',k:'t'},{h:'إجمالي الإدارة بالضريبة',k:'n'},{h:'رسوم العقد',k:'t'},{h:'',k:'ac'}];
  const rws=L.map(a=>{const k=Fin.agrCalc(a,VATP());
    return{cells:[esc(a.no),'<b>'+esc(pname(a.pid))+'</b>','<b>'+esc(a.unit)+'</b>',esc(a.tenant)||'—',fm(a.annualRent),a.mgmt.type==='fixed'?fm(a.mgmt.value)+' مقطوع':fm(a.mgmt.value)+'%',fm(k.mgmtTotal),a.fee.amount?fm(a.fee.amount)+' — '+(a.fee.mode==='company'?'تخصمها الشركة':'يدفعها المالك'):'—',
      `<button class="btn sm p" data-a="agrPrint" data-i="${esc(a.id)}">طباعة</button> <button class="btn sm" data-a="agrPdf" data-i="${esc(a.id)}">PDF</button> <button class="btn sm" data-a="agrEdit" data-i="${esc(a.id)}">تعديل</button> <button class="btn sm" data-a="finFromAgr" data-i="${esc(a.id)}">تحليل</button> <button class="btn sm dng" data-a="agrDel" data-i="${esc(a.id)}">حذف</button>`]}});
  S.pm={title:'اتفاقيات التأجير',sub:'ثلاثية: المالك والمستأجر والمشغّل',cols,rows:rws,foot:['الإجمالي: '+L.length,'','','',fm(sum(L,a=>+a.annualRent||0)),'',fm(sum(L,a=>Fin.agrCalc(a,VATP()).mgmtTotal)),'','']};
  return `<h1>اتفاقيات التأجير</h1><p class="sub">اتفاقية ثلاثية بين المالك والمستأجر و${esc(S.db.settings.operator)}، تحدد الإيجار السنوي ورسوم إدارة الأملاك (نسبة أو مبلغ مقطوع) ورسوم عقد الإيجار والدفعات التي تُخصم منها. تُربط تلقائيًا بالتحليل المالي.</p>
<div class="bar"><button class="btn p" data-a="agrNew">+ اتفاقية جديدة</button>${msel('agr.p',PL(),'كل المشاريع')}${agrFilters()}<input type="search" id="ag_q" placeholder="بحث: وحدة، مالك، مستأجر" value="${esc(S.agr.q)}">${pbtn('list')}</div>
${rws.length?T(cols,rws,{foot:S.pm.foot}):'<div class="tw"><p class="empty">لا توجد اتفاقيات بعد. اضغط «اتفاقية جديدة» واختر العقد لتعبئة البيانات تلقائيًا.</p></div>'}`;
}
function agrInstRow(x,i,mode){
  return `<tr data-ir="${i}"><td class="d">${i+1}</td><td>${dateField('ai_d'+i,x.date||'','ai_d')}</td><td><input type="number" step="0.01" class="ai_a" value="${esc(x.amount??'')}"></td>
<td><input type="checkbox" class="ai_m"${x.mg?' checked':''}></td><td><input type="number" step="0.01" class="ai_s" value="${esc(x.mshare??'')}"${mode==='manual'?'':' disabled'}></td><td><button class="btn sm dng" data-a="agrRowDel" data-r="${i}">✕</button></td></tr>`;
}
function agrCollect(){
  const inst=[...document.querySelectorAll('#ag_inst tr[data-ir]')].map(tr=>({date:tr.querySelector('.ai_d').value,amount:tr.querySelector('.ai_a').value===''?0:Number(tr.querySelector('.ai_a').value),mg:tr.querySelector('.ai_m').checked,mshare:tr.querySelector('.ai_s').value===''?'':Number(tr.querySelector('.ai_s').value)}));
  return{no:rv('ag_no').trim(),date:rv('ag_date'),pid:rv('ag_pid'),cid:rv('ag_cid'),unit:rv('ag_unit').trim(),owner:rv('ag_owner').trim(),tenant:rv('ag_tenant').trim(),start:rv('ag_start'),end:rv('ag_end'),
    annualRent:Number(rv('ag_rent')||0),mgmt:{type:rv('ag_mt'),value:Number(rv('ag_mv')||0)},mgmtVat:rv('ag_mvat')==='1',mgmtAlloc:rv('ag_malloc'),
    inst,fee:{amount:Number(rv('ag_fa')||0),vat:rv('ag_fvat')==='1',mode:rv('ag_fm'),at:Number(rv('ag_fat')||1)},clauses:rv('ag_cl'),notes:rv('ag_notes').trim()};
}
function agrPreview(){
  const el=document.getElementById('ag_prev');if(!el)return;
  const a=agrCollect(),k=Fin.agrCalc(a,VATP());
  el.innerHTML=`<div class="sum"><div><span>رسوم الإدارة (قبل الضريبة)</span><b>${fm(k.mgmtEx)}</b></div><div><span>ضريبة الإدارة</span><b>${fm(k.mgmtVat)}</b></div><div><span>إجمالي الإدارة</span><b>${fm(k.mgmtTotal)}</b></div><div><span>رسوم العقد بالضريبة</span><b>${fm(k.feeTotal)}</b></div></div>`+(k.warn.length?`<p class="warnbox">${k.warn.map(esc).join('<br>')}</p>`:'');
  document.querySelectorAll('.ai_s').forEach(e=>e.disabled=a.mgmtAlloc!=='manual');
}
function agrForm(id,pre){
  const a=id?A_().find(x=>x.id===id):{no:'AG-'+String(A_().length+1).padStart(3,'0'),date:iso(TODAY),mgmt:{type:'pct',value:10},mgmtVat:true,mgmtAlloc:'equal',inst:[],fee:{amount:125,vat:true,mode:'owner',at:1},clauses:DEF_CLAUSES,...(pre||{})};
  const cs=[];for(const[pid,p]of Object.entries(P()))for(const c of p.contracts)cs.push([pid+'|'+c.id,p.name+' — '+c.unit+' — '+(c.tenant||'')]);
  const f=(l,el,full)=>`<label class="${full?'full':''}">${l}${el}</label>`,inp=(i,v,t='text')=>t==='date'?dateField(i,v):`<input id="${i}" type="${t}" ${t==='number'?'step="0.01"':''} value="${esc(v??'')}">`,sel=(i,o,v)=>`<select id="${i}">${o.map(([x,y])=>`<option value="${esc(x)}"${String(x)===String(v)?' selected':''}>${esc(y)}</option>`).join('')}</select>`;
  $('#frm').innerHTML=`<div class="dh"><h2>${id?'تعديل الاتفاقية':'اتفاقية تأجير جديدة'}</h2><button class="x" data-a="fclose" aria-label="إغلاق">✕</button></div>
<div class="fg">${f('تصفية العقود حسب المشروع',`<select id="ag_pf">${projOpts('',true)}</select>`)}${f('بحث عن عقد (وحدة، مستأجر، مالك)',`<input id="ag_ps" type="search" placeholder="اكتب للتصفية">`)}
${f('تعبئة من عقد قائم',`<select id="ag_pick"><option value="">— اختر عقدًا —</option>${cs.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`,1)}
${f('رقم الاتفاقية',inp('ag_no',a.no))}${f('تاريخ الاتفاقية',inp('ag_date',a.date,'date'))}
${f('المشروع',`<select id="ag_pid">${projOpts(a.pid,false)}</select>`)}${f('الوحدة',inp('ag_unit',a.unit))}${f('المالك (الطرف الأول)',inp('ag_owner',a.owner))}${f('المستأجر (الطرف الثاني)',inp('ag_tenant',a.tenant))}
${f('بداية الإيجار',inp('ag_start',a.start,'date'))}${f('نهاية الإيجار',inp('ag_end',a.end,'date'))}
${f('الإيجار السنوي الكامل',inp('ag_rent',a.annualRent,'number'))}<input type="hidden" id="ag_cid" value="${esc(a.cid||'')}">
${f('رسوم إدارة الأملاك',sel('ag_mt',Object.entries(MG_LAB),a.mgmt.type))}${f('القيمة (% أو مبلغ)',inp('ag_mv',a.mgmt.value,'number'))}
${f('ضريبة على رسوم الإدارة',sel('ag_mvat',[['1','تُضاف ('+VATP()+'%)'],['0','لا تُضاف']],a.mgmtVat===false?'0':'1'))}${f('توزيع رسوم الإدارة على الدفعات',sel('ag_malloc',[['equal','بالتساوي على الدفعات المحددة'],['manual','يدويًا لكل دفعة']],a.mgmtAlloc))}
${f('رسوم عقد الإيجار (مبلغ مقطوع)',inp('ag_fa',a.fee.amount,'number'))}${f('ضريبة على رسوم العقد',sel('ag_fvat',[['1','تُضاف ('+VATP()+'%)'],['0','لا تُضاف']],a.fee.vat===false?'0':'1'))}
${f('طريقة سداد رسوم العقد',sel('ag_fm',Object.entries(FM_LAB),a.fee.mode))}${f('تُخصم من الدفعة رقم',inp('ag_fat',a.fee.at||1,'number'))}
<div class="full"><div class="row" style="justify-content:space-between"><b>الدفعات (حدّد الدفعات التي تُخصم منها رسوم الإدارة)</b><span><button class="btn sm" data-a="agrRowAdd">+ دفعة</button> <button class="btn sm" data-a="agrGen">توليد دفعات متساوية</button> <label style="display:inline">عددها <input id="ag_n" type="number" min="1" max="24" value="2" style="width:60px"></label></span></div>
<table class="t" id="ag_inst"><thead><tr><th>#</th><th>التاريخ</th><th>المبلغ</th><th>تُخصم منها الإدارة</th><th>حصة الإدارة (يدوي)</th><th></th></tr></thead><tbody>${(a.inst||[]).map((x,i)=>agrInstRow(x,i,a.mgmtAlloc)).join('')}</tbody></table></div>
<div class="full" id="ag_prev"></div>
<div class="full"><span class="fl">المرفقات (الاتفاقية الموقّعة، الهويات، سجل تجاري…)</span>${attField('ag',a.files)}</div>
${f('بنود الاتفاقية (قابلة للتعديل)',`<textarea id="ag_cl" rows="9">${esc(a.clauses||DEF_CLAUSES)}</textarea>`,1)}${f('ملاحظات',inp('ag_notes',a.notes),1)}</div>
<div class="ft"><button class="btn p" id="ag_save">حفظ الاتفاقية</button><button class="btn" data-a="fclose">إلغاء</button></div>`;
  if(a.pid)$('#ag_pid').value=a.pid;
  if(!$('#frm').open)$('#frm').showModal();
  $('#ag_save').onclick=()=>{const o=agrCollect();
    if(!o.unit)return toast('أدخل رقم الوحدة');if(!o.pid)return toast('اختر المشروع');if(!(o.annualRent>0))return toast('أدخل الإيجار السنوي');
    o.files=attGet('ag');
    if(S.cl&&S.cl.on&&S.cl.role==='officer'){
      if(id)return toast('لا يمكن تعديل الاتفاقية مباشرة');
      if(!o.files.length)return toast('المرفقات إلزامية للاتفاقية');
      attCommit();$('#frm').close();
      apSubmit('agreement',o.pid,'اتفاقية تأجير — وحدة '+o.unit+(o.tenant?' / '+o.tenant:''),o.annualRent,{obj:{id:'g'+uid(),...o}},o.files);return}
    attCommit();
    if(id)Object.assign(A_().find(x=>x.id===id),o);else A_().push({id:'g'+uid(),...o});
    persist();$('#frm').close();render();toast('تم حفظ الاتفاقية')};
  agrPreview();
}
function agrPickList(){
  const pf=rv('ag_pf'),q=rv('ag_ps').toLowerCase(),el=document.getElementById('ag_pick');if(!el)return;let h='<option value="">— اختر عقدًا —</option>',n=0;
  for(const[pid,p]of Object.entries(P())){if(pf&&pid!==pf)continue;for(const c of p.contracts){if(q&&!txt(c.unit,c.tenant,c.owner,p.name).includes(q))continue;n++;h+=`<option value="${esc(pid+'|'+c.id)}">${esc(p.name+' — '+c.unit+' — '+(c.tenant||''))}</option>`}}
  el.innerHTML=h;if(n===1){el.selectedIndex=1;agrPick(el.value)}}
function agrPick(v){
  const[pid,cid]=v.split('|'),c=cOf(pid,cid);if(!c)return;
  const r=calc(c,MODE(),TODAY),ann=r.m&&r.m!==12?(r.total/r.m*12):r.total;
  $('#ag_pid').value=pid;$('#ag_cid').value=cid;$('#ag_unit').value=c.unit||'';$('#ag_owner').value=c.owner||'';$('#ag_tenant').value=c.tenant||'';setDate('ag_start',c.start||'');setDate('ag_end',c.end||'');
  $('#ag_rent').value=Fin.r2(r.total||0);
  const ins=r.inst.map(i=>({date:iso(i.date),amount:i.amount,mg:false}));
  document.querySelector('#ag_inst tbody').innerHTML=ins.map((x,i)=>agrInstRow(x,i,rv('ag_malloc'))).join('');
  agrPreview();
}
function agrGen(){
  const n=Math.max(1,Math.min(24,Math.round(Number(rv('ag_n'))||1))),rent=Number(rv('ag_rent')||0),s=pd(rv('ag_start')),mo=12/n,L=[];let acc=0;
  for(let i=0;i<n;i++){const amt=i===n-1?Fin.r2(rent-acc):Fin.r2(rent/n);acc=Fin.r2(acc+amt);L.push({date:s!=null?iso(edate(s,Math.round(mo*i))):'',amount:amt,mg:i===0})}
  document.querySelector('#ag_inst tbody').innerHTML=L.map((x,i)=>agrInstRow(x,i,rv('ag_malloc'))).join('');agrPreview();
}
function agrDoc(a){
  const k=Fin.agrCalc(a,VATP()),op=esc(S.db.settings.operator),pn=esc(pname(a.pid));
  const kv=(x,y)=>`<tr><th style="width:32%">${x}</th><td>${y}</td></tr>`;
  const cl=String(a.clauses||'').split('\n').filter(Boolean).map(l=>`<p style="margin:3px 0">${esc(l)}</p>`).join('');
  const body=`<p style="margin:6px 0 12px">أُبرمت هذه الاتفاقية بتاريخ <bdi>${esc(a.date)}</bdi> بين كل من:</p>
<table class="kv">${kv('الطرف الأول (المالك)',esc(a.owner)||'—')}${kv('الطرف الثاني (المستأجر)',esc(a.tenant)||'—')}${kv('الطرف الثالث (المشغّل)',op)}${kv('المشروع / الوحدة',pn+' — '+esc(a.unit))}${kv('مدة الإيجار','من <bdi>'+esc(a.start||'—')+'</bdi> إلى <bdi>'+esc(a.end||'—')+'</bdi>')}${kv('الإيجار السنوي الكامل','<b>'+fm(a.annualRent)+'</b> ريال')}</table>
<h3>الرسوم</h3><table class="kv">${kv('رسوم إدارة الأملاك',(a.mgmt.type==='fixed'?'مبلغ مقطوع '+fm(a.mgmt.value):fm(a.mgmt.value)+'% من الإيجار السنوي')+' = <b>'+fm(k.mgmtEx)+'</b>')}${kv('ضريبة القيمة المضافة على الإدارة',a.mgmtVat===false?'غير مضافة':fm(k.mgmtVat)+' ('+VATP()+'%)')}${kv('إجمالي رسوم الإدارة','<b>'+fm(k.mgmtTotal)+'</b> ريال')}
${kv('رسوم عقد الإيجار',a.fee.amount?fm(k.feeEx)+(a.fee.vat===false?'':' + ضريبة '+fm(k.feeVat)+' = <b>'+fm(k.feeTotal)+'</b>')+' — '+(k.feeCompany?'تدفعها الشركة وتُخصم من الدفعة رقم '+(a.fee.at||1):'يدفعها المالك مباشرة ولا تُخصم'):'—')}</table>
<h3>جدول الدفعات والخصومات</h3>${T([{h:'#',k:'d'},{h:'تاريخ الدفعة',k:'d'},{h:'قيمة الدفعة',k:'n'},{h:'رسوم الإدارة',k:'n'},{h:'ضريبة الإدارة',k:'n'},{h:'رسوم العقد',k:'n'},{h:'ضريبة العقد',k:'n'},{h:'إجمالي الخصم',k:'n'},{h:'الصافي للمالك',k:'n'}],
  k.rows.map(x=>({cells:[x.n,fs_(x.date),fm(x.amount),x.mgEx?fm(x.mgEx):'—',x.mgVat?fm(x.mgVat):'—',x.feeEx?fm(x.feeEx):'—',x.feeVat?fm(x.feeVat):'—',x.ded?fm(x.ded):'—','<b>'+fm(x.net)+'</b>']})),{print:true,foot:['','الإجمالي',fm(k.totals.amount),fm(k.totals.mgEx),fm(k.totals.mgVat),fm(k.totals.feeEx),fm(k.totals.feeVat),fm(k.totals.ded),fm(k.totals.net)]})}
<h3>البنود</h3><div style="font-size:13px;line-height:1.9">${cl}</div>${a.notes?`<p><b>ملاحظات:</b> ${esc(a.notes)}</p>`:''}
<div style="display:flex;justify-content:space-between;margin-top:42px;text-align:center"><div style="width:30%">الطرف الأول (المالك)<br>${esc(a.owner)}<br><br>............................</div><div style="width:30%">الطرف الثاني (المستأجر)<br>${esc(a.tenant)}<br><br>............................</div><div style="width:30%">الطرف الثالث (المشغّل)<br>${op}<br><br>............................</div></div>`;
  return docHtml({title:'اتفاقية تأجير ثلاثية',sub:'رقم '+esc(a.no)+' — '+pn+' / '+esc(a.unit),body});
}

/* ===== التحليل المالي ===== */
const AN_LAB={service:'رسوم الخدمات',mgmt:'إدارة الأملاك',contract:'رسوم عقد الإيجار',prev:'مبالغ سابقة',maint:'صيانة (نهائي)',clean:'نظافة (نهائي)',elec:'كهرباء',net:'إنترنت',other:'أخرى'};
function anaFor(an){return Fin.anaCalc(an,VATP())}
function findAgr(an){const L=A_();return L.find(a=>an.aid&&a.id===an.aid)||L.find(a=>a.pid===an.pid&&an.cid&&a.cid===an.cid)||L.find(a=>a.pid===an.pid&&String(a.unit).trim()===String(an.unit).trim())}
function vFin(all){
  const q=S.fin.q.toLowerCase(),per=(a,f)=>{if(!f)return true;const d=String(a.date||'').slice(0,10),t=iso(TODAY),y=+t.slice(0,4),m=+t.slice(5,7);if(f==='m0')return d.slice(0,7)===t.slice(0,7);if(f==='m1'){const pm=m===1?(y-1)+'-12':y+'-'+String(m-1).padStart(2,'0');return d.slice(0,7)===pm}if(f==='q')return d>=iso(TODAY-92*DAY);if(f==='y')return d.slice(0,4)===String(y);return true},
  owners=[...new Set(N_().map(a=>String(a.owner||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')),
  L=N_().filter(a=>(MS(S.fin.p,a.pid))&&AO(S.fin.o,z=>String(a.owner||'').trim()===z)&&per(a,S.fin.d)&&(!MSV(S.fin.v).length||anaFor(a).over)&&(!q||txt(a.unit,a.owner,a.tenant,pname(a.pid),a.sap).includes(q))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const cols=[{h:'التاريخ',k:'d'},{h:'المشروع',k:'t'},{h:'الوحدة',k:'t'},{h:'المستأجر',k:'t'},{h:'الدفعة',k:'n'},{h:'إدارة+خدمات+عقد',k:'n'},{h:'الضريبة',k:'n'},{h:'خصومات أخرى',k:'n'},{h:'إجمالي الخصم',k:'n'},{h:'صافي المالك',k:'n'},{h:'',k:'ac'}];
  const rws=L.map(a=>{const k=anaFor(a);return{cls:k.over?'late':'',cells:[fs_(a.date),'<b>'+esc(pname(a.pid))+'</b>','<b>'+esc(a.unit)+'</b>',esc(a.tenant)||'—',fm(k.payment),fm(k.taxBase),fm(k.vat),fm(k.nonTax),fm(k.totalDed),'<b>'+fm(k.netOwner)+'</b>',
    `<button class="btn sm p" data-a="finPrint" data-i="${esc(a.id)}">طباعة</button> <button class="btn sm" data-a="finPdf" data-i="${esc(a.id)}">PDF</button> <button class="btn sm" data-a="finEdit" data-i="${esc(a.id)}">تعديل</button> <button class="btn sm dng" data-a="finDel" data-i="${esc(a.id)}">حذف</button>`]}});
  const ks=L.map(anaFor),foot=['الإجمالي: '+L.length,'','','',fm(sum(ks,k=>k.payment)),fm(sum(ks,k=>k.taxBase)),fm(sum(ks,k=>k.vat)),fm(sum(ks,k=>k.nonTax)),fm(sum(ks,k=>k.totalDed)),fm(sum(ks,k=>k.netOwner)),''];
  S.pm={title:'التحليل المالي للدفعات',sub:S.fin.p?'المشروع: '+esc(pname(S.fin.p)):'كل المشاريع',cols,rows:rws,foot};
  return `<h1>التحليل المالي</h1><p class="sub">تحليل الدفعات المسددة وخصوماتها: رسوم الخدمات وإدارة الأملاك ورسوم العقد (تُضاف عليها ضريبة ${VATP()}%)، والصيانة والنظافة والكهرباء والإنترنت والمبالغ السابقة (بدون ضريبة). إن وُجدت اتفاقية للوحدة تُسحب منها رسوم الإدارة والعقد ويمكن تعديلها يدويًا.</p>
<div class="bar"><button class="btn p" data-a="finNew">+ تحليل جديد</button>${msel('fin.p',PL(),'كل المشاريع')}${msel('fin.o',owners.map(o=>[o,o]),'كل الملاك')}<select id="fn_d">${[['','كل الفترات'],['m0','هذا الشهر'],['m1','الشهر الماضي'],['q','آخر 3 أشهر'],['y','هذه السنة']].map(([a,b])=>`<option value="${a}"${a===S.fin.d?' selected':''}>${b}</option>`).join('')}</select>${msel('fin.v',[['over','الخصومات تتجاوز الدفعة']],'كل التحليلات')}<input type="search" id="fn_q" placeholder="بحث: وحدة، مالك، مستأجر" value="${esc(S.fin.q)}">${pbtn('list')}</div>
${rws.length?T(cols,rws,{foot}):'<div class="tw"><p class="empty">لا توجد تحليلات. اضغط «تحليل جديد» واختر العقد والدفعة.</p></div>'}`;
}
function anCollect(){
  const o={id:rv('an_id'),date:rv('an_date'),pid:rv('an_pid'),cstart:rv('an_cs'),cend:rv('an_ce'),ejar:rv('an_ejar').trim(),sap:rv('an_sap').trim(),cid:rv('an_cid'),aid:rv('an_aid'),payId:rv('an_pay'),unit:rv('an_unit').trim(),owner:rv('an_owner').trim(),tenant:rv('an_tenant').trim(),
    payment:nv('an_payment')||0,annualRent:nv('an_annual')||0,mgmt:{type:rv('an_mt'),value:nv('an_mv')||0,base:rv('an_mb')},mgmtManual:rv('an_mman')==='1',ctype:rv('an_ctype'),prevNote:rv('an_pnote').trim(),no:rv('an_no'),mgmtAmt:nv('an_mamt'),vatManual:rv('an_vman')==='1',vatAmt:nv('an_vamt'),note:rv('an_note').trim()};
  for(const[k]of Fin.ANA_LINES)if(k!=='mgmt')o[k]=nv('an_'+k)||0;
  return o;
}
function anPreview(){
  const el=document.getElementById('an_prev');if(!el)return;const a=anCollect(),k=anaFor(a);
  el.innerHTML=`<div class="sum"><div><span>الدفعة</span><b>${fm(k.payment)}</b></div><div><span>إدارة الأملاك (محسوبة)</span><b>${fm(k.lines.mgmt)}</b></div><div><span>ضريبة ${VATP()}% على ${fm(k.taxBase)}</span><b>${fm(k.vat)}</b></div><div><span>إجمالي الخصم</span><b>${fm(k.totalDed)}</b></div><div><span>صافي المالك</span><b>${fm(k.netOwner)}</b></div></div>${k.over?'<p class="warnbox">إجمالي الخصومات يتجاوز قيمة الدفعة</p>':''}`;
  document.getElementById('an_mamt').disabled=!a.mgmtManual;document.getElementById('an_vamt').disabled=!a.vatManual;
}
function anPrefill(){
  const pid=rv('an_pid'),cid=rv('an_cid'),c=cOf(pid,cid);if(!c)return;
  const a=findAgr({pid,cid,unit:c.unit});
  const ps=[...(c.payments||[])].sort((x,y)=>String(x.date).localeCompare(String(y.date)));
  const pm=ps.find(p=>p.id===rv('an_pay'))||ps[ps.length-1],idx=pm?ps.indexOf(pm):-1;
  if(pm){$('#an_payment').value=pm.amount;setDate('an_date',pm.date||$('#an_date').value)}
  $('#an_unit').value=c.unit||'';$('#an_owner').value=c.owner||'';$('#an_tenant').value=c.tenant||'';setDate('an_cs',c.start||'');setDate('an_ce',c.end||'');$('#an_ejar').value=c.ejar||'';$('#an_sap').value=c.sap||'';
  const r=calc(c,MODE(),TODAY);$('#an_annual').value=a?a.annualRent:Fin.r2(r.total||0);
  if(a){$('#an_aid').value=a.id;$('#an_mt').value=a.mgmt.type;$('#an_mv').value=a.mgmt.value;$('#an_mb').value='annual';
    const k=Fin.agrCalc(a,VATP()),row=k.rows[idx]||k.rows.find(x=>Math.abs(x.amount-(pm?.amount||0))<0.01);
    // رسوم الإدارة حسب حصة هذه الدفعة في الاتفاقية، ورسوم العقد إن كانت تُخصم من هذه الدفعة
    $('#an_mman').value='1';$('#an_mamt').value=row?row.mgEx:0;$('#an_contract').value=row?row.feeEx:0;
    toast('رُبط التحليل بالاتفاقية '+a.no)}
  else{$('#an_aid').value='';$('#an_mman').value='0'}
  anPreview();
}
function anPickList(pid,st){const cs=[['','— اختر العقد —']];for(const[k,p]of Object.entries(P())){if(pid&&k!==pid)continue;for(const c of p.contracts){const s_=calc(c,MODE(),TODAY).st;if(st&&s_!==st)continue;cs.push([k+'|'+c.id,(pid?'':p.name+' — ')+c.unit+' — '+(c.tenant||'')+(s_==='منتهي'?' (منتهي)':'')])}}return cs}
function anForm(id,pre){
  const a=id?N_().find(x=>x.id===id):{date:iso(TODAY),mgmt:{type:'pct',value:0,base:'annual'},...(pre||{})};
  const f=(l,el,full)=>`<label class="${full?'full':''}">${l}${el}</label>`,inp=(i,v,t='text')=>t==='date'?dateField(i,v):`<input id="${i}" type="${t}" ${t==='number'?'step="0.01"':''} value="${esc(v??'')}">`,sel=(i,o,v)=>`<select id="${i}">${o.map(([x,y])=>`<option value="${esc(x)}"${String(x)===String(v)?' selected':''}>${esc(y)}</option>`).join('')}</select>`;
  const cs=anPickList(a.pid,'');
  const curC=a.pid&&a.cid?a.pid+'|'+a.cid:'';
  const c0=cOf(a.pid,a.cid),pays=c0?[...c0.payments].sort((x,y)=>String(x.date).localeCompare(String(y.date))).map(p=>[p.id,(p.date||'بلا تاريخ')+' — '+fm(p.amount)]):[];
  $('#frm').innerHTML=`<div class="dh"><h2>${id?'تعديل التحليل المالي':'تحليل مالي جديد'}</h2><button class="x" data-a="fclose" aria-label="إغلاق">✕</button></div>
<input type="hidden" id="an_id" value="${esc(a.id||'')}"><input type="hidden" id="an_no" value="${esc(a.no||'')}"><input type="hidden" id="an_cid" value="${esc(a.cid||'')}"><input type="hidden" id="an_aid" value="${esc(a.aid||'')}">
<div class="fg">${f('المشروع (يحدد قائمة العقود)',`<select id="an_pid"><option value="">— كل المشاريع —</option>${projOpts(a.pid,false)}</select>`)}${f('حالة العقد',sel('an_cst',[['','الكل'],['ساري','الساري'],['منتهي','المنتهي']],''))}${f('العقد (حالي أو سابق) — أو اتركه فارغًا وأدخل بيانات عقد سابق يدويًا',sel('an_pick',cs,curC),1)}${f('نوع العقد',sel('an_ctype',[['','—'],['new','جديد'],['renew','تجديد']],a.ctype||''))}${f('بداية العقد (للعقد السابق)',inp('an_cs',a.cstart,'date'))}${f('نهاية العقد (للعقد السابق)',inp('an_ce',a.cend,'date'))}${f('رقم عقد إيجار (اختياري)',inp('an_ejar',a.ejar))}${f('رقم ساب SAP (اختياري)',inp('an_sap',a.sap))}${f('الدفعة المسددة',`<select id="an_pay"><option value="">— يدوي —</option>${pays.map(([x,y])=>`<option value="${esc(x)}"${x===a.payId?' selected':''}>${esc(y)}</option>`).join('')}</select>`)}${f('تاريخ التحليل',inp('an_date',a.date,'date'))}
${f('الوحدة',inp('an_unit',a.unit))}${f('المالك',inp('an_owner',a.owner))}${f('المستأجر',inp('an_tenant',a.tenant))}
${f('قيمة الدفعة',inp('an_payment',a.payment,'number'))}${f('الإيجار السنوي (أساس النسبة)',inp('an_annual',a.annualRent,'number'))}
${f('إدارة الأملاك',sel('an_mt',Object.entries(MG_LAB),a.mgmt.type))}${f('القيمة (% أو مبلغ)',inp('an_mv',a.mgmt.value,'number'))}${f('أساس النسبة',sel('an_mb',[['annual','الإيجار السنوي'],['payment','قيمة الدفعة']],a.mgmt.base||'annual'))}
${f('تعديل رسوم الإدارة يدويًا',sel('an_mman',[['0','تلقائي'],['1','يدوي']],a.mgmtManual?'1':'0'))}${f('رسوم الإدارة (يدوي، بدون ضريبة)',inp('an_mamt',a.mgmtAmt,'number'))}
${f('رسوم الخدمات (بدون ضريبة)',inp('an_service',a.service,'number'))}${f('رسوم عقد الإيجار (بدون ضريبة)',inp('an_contract',a.contract,'number'))}
${f('تعديل الضريبة يدويًا',sel('an_vman',[['0','تلقائي ('+VATP()+'%)'],['1','يدوي']],a.vatManual?'1':'0'))}${f('مبلغ الضريبة (يدوي)',inp('an_vamt',a.vatAmt,'number'))}
${f('مبالغ سابقة (تُخصم من الدفعة)',inp('an_prev',a.prev,'number'))}${f('بيان المبالغ السابقة (مثل: دفعة من المديونية)',inp('an_pnote',a.prevNote))}${f('صيانة (نهائي بضريبته)',inp('an_maint',a.maint,'number'))}${f('نظافة (نهائي بضريبتها)',inp('an_clean',a.clean,'number'))}
${f('كهرباء',inp('an_elec',a.elec,'number'))}${f('إنترنت',inp('an_net',a.net,'number'))}${f('أخرى',inp('an_other',a.other,'number'))}
<div class="full" id="an_prev"></div>${f('ملاحظات',inp('an_note',a.note),1)}</div>
<div class="fg"><div class="full"><span class="fl">المرفقات</span>${attField('an',a.files)}</div></div>
<div class="ft"><button class="btn p" id="an_save">حفظ التحليل</button><button class="btn" data-a="fclose">إلغاء</button></div>`;
  if(!$('#frm').open)$('#frm').showModal();
  $('#an_save').onclick=()=>{const o=anCollect();if(!o.unit)return toast('أدخل رقم الوحدة');if(!(o.payment>0))return toast('أدخل قيمة الدفعة');
    o.files=attGet('an');attCommit();
    if(!o.no){const d=String(o.date||iso(TODAY)).split('-'),pre='H-'+(d[2]||'')+(d[1]||'')+(d[0]||''),n=N_().filter(x=>String(x.no||'').startsWith(pre)).length+1;o.no=pre+n}
    if(o.id)Object.assign(N_().find(x=>x.id===o.id),o);else{o.id='n'+uid();N_().push(o)}
    persist();$('#frm').close();render();toast('تم حفظ التحليل')};
  anPreview();
}
function anDoc(a){
  const k=anaFor(a),pn=esc(pname(a.pid)),ag=findAgr(a),L=k.lines,yr=String(a.date||iso(TODAY)).slice(0,4),ann=+a.annualRent||0,pct=ann>0?Math.round(k.payment/ann*1000)/10:0;
  const mg=a.mgmt||{},mgLab='إدارة الأملاك'+(mg.type==='pct'&&+mg.value>0?' ('+(+mg.value)+'%)':'');
  const n2=v=>(+v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const row=(lab,val,o={})=>`<tr class="${o.cls||''}">${o.side||''}<td class="lb">${lab}</td><td class="am">${val===''?'':n2(val)}</td><td class="nt">${o.note?esc(o.note):''}</td></tr>`;
  const ded=[['الرسوم السنوية للخدمات العام '+yr+'م',L.service],[mgLab,L.mgmt],['قيمة مضافة رسوم خدمات وإدارة أملاك ('+VATP()+'%)',k.vat],['قيمة توثيق عقد إيجار',L.contract],['مبالغ سابقة (دفعة من المديونية)',L.prev,a.prevNote],['فواتير صيانة شاملة الضريبة',L.maint],['نظافة شاملة الضريبة',L.clean]];
  ded.push(['كهرباء',L.elec||0],['إنترنت',L.net||0],['أخرى',L.other||0]);
  const side=`<td class="asd" rowspan="${ded.length+1}"><span>الرسوم والاستقطاعات والضريبة</span></td>`;
  const dr=ded.map((d,i)=>row(esc(d[0]),d[1],{note:d[2],side:i===0?side:''})).join('');
  const info=`<div class="an-info"><div class="r1"><div><span>رقم الوحدة</span><b>${esc(a.unit)}</b></div><div><span>المالك</span><b>${esc(a.owner)||'—'}</b></div><div><span>المستأجر</span><b>${esc(a.tenant)||'—'}</b></div></div>
<div class="r2"><div><span>المشروع</span><b>${pn}</b></div><div><span>بداية الإيجار</span><b><bdi>${esc(a.cstart||'—')}</bdi></b></div><div><span>نهاية الإيجار</span><b><bdi>${esc(a.cend||'—')}</bdi></b></div><div><span>تاريخ التحليل</span><b><bdi>${esc(a.date)}</bdi></b></div></div>
<div class="r3">${a.no?`<div><span>رقم التحليل</span><b><bdi>${esc(a.no)}</bdi></b></div>`:''}${a.ctype?`<div><span>نوع العقد</span><b>${a.ctype==='renew'?'تجديد':'جديد'}</b></div>`:''}${a.ejar?`<div><span>رقم عقد إيجار</span><b><bdi>${esc(a.ejar)}</bdi></b></div>`:''}${a.sap?`<div><span>رقم ساب SAP</span><b><bdi>${esc(a.sap)}</bdi></b></div>`:''}</div></div>`;
  const body=`${info}<table class="an-tb"><colgroup><col style="width:56px"><col><col style="width:21%"><col style="width:22%"></colgroup><thead><tr><th class="sd"></th><th>تفاصيل وبيان القيمة الإيجارية</th><th>المبلغ (ريال سعودي)</th><th>ملاحظات</th></tr></thead><tbody>
<tr class="hd"><td class="sd"></td><td class="lb">قيمة إيجار الوحدة بعد خصم جميع الاستقطاعات</td><td></td><td></td></tr>
${row('قيمة إيجار الوحدة رقم '+esc(a.unit),ann,{cls:'b',side:'<td class="sd"></td>'})}${row('المدفوع من الإيجار'+(pct?' '+pct+'%':''),k.payment,{cls:'b',side:'<td class="sd"></td>'})}
<tr><td class="sd"></td><td class="lb b">ويتم توزيعها كما يلي:</td><td></td><td></td></tr>
${dr}${row('إجمالي الاستقطاعات',k.totalDed,{cls:'tot',side:''})}
${row('المتبقي للمالك',k.netOwner,{cls:'net',side:'<td class="sd"></td>'})}
${row('المبلغ الذي أودعه المستأجر',k.payment,{cls:'b',side:'<td class="sd"></td>'})}${row('حساب التشغيل '+yr,k.totalDed,{cls:'b',side:'<td class="sd"></td>'})}${row('يحوَّل إلى حساب المالك',Math.max(0,k.netOwner),{cls:'b',side:'<td class="sd"></td>'})}
<tr class="hd"><td class="sd"></td><td class="lb">يبقى رصيد بالحساب</td><td></td><td></td></tr></tbody></table>
${k.over?'<p class="warnbox">إجمالي الخصومات يتجاوز قيمة الدفعة</p>':''}
<p class="an-tf">${esc(Fin.tafqeet(Math.max(0,k.netOwner)))}</p>
<div class="an-sign"><div><span>إدارة الحسابات</span><u></u></div><div><span>الرقابة المالية</span><u></u></div><div><span>نائب الرئيس التنفيذي والمدير المكلف</span><u></u></div></div>${ag?`<p style="font-size:12px">مرتبط بالاتفاقية رقم ${esc(ag.no)}</p>`:''}${a.note?`<p style="font-size:12px"><b>ملاحظات:</b> ${esc(a.note)}</p>`:''}`;
  return docHtml({title:'تحليل إيجار وحدة سكنية',sub:pn+' / '+esc(a.unit),body});
}

/* ===== ربط العرض والأحداث ===== */
VF.agr=vAgr;VF.fin=vFin;
Object.assign(act,{
  agrNew:()=>agrForm(null),agrEdit:b=>agrForm(b.dataset.i),agrDel:b=>arm(b,()=>{S.db.agreements=A_().filter(x=>x.id!==b.dataset.i);persist();render()}),
  agrPrint:b=>printArea(agrDoc(A_().find(x=>x.id===b.dataset.i)),null),agrPdf:b=>{const a=A_().find(x=>x.id===b.dataset.i);printArea(agrDoc(a),'agreement-'+safe(a.no)+'.pdf')},
  agrRowAdd:()=>{const tb=document.querySelector('#ag_inst tbody');tb.insertAdjacentHTML('beforeend',agrInstRow({},tb.children.length,rv('ag_malloc')));agrPreview()},
  agrRowDel:b=>{b.closest('tr').remove();[...document.querySelectorAll('#ag_inst tr[data-ir]')].forEach((tr,i)=>tr.firstElementChild.textContent=i+1);agrPreview()},agrGen,
  finNew:()=>anForm(null),finEdit:b=>anForm(b.dataset.i),finDel:b=>arm(b,()=>{S.db.analyses=N_().filter(x=>x.id!==b.dataset.i);persist();render()}),
  finPrint:b=>printArea(anDoc(N_().find(x=>x.id===b.dataset.i)),null),finPdf:b=>{const a=N_().find(x=>x.id===b.dataset.i);printArea(anDoc(a),'analysis-'+safe(a.unit)+'.pdf')},
  finFromAgr:b=>{const a=A_().find(x=>x.id===b.dataset.i);go('fin');anForm(null,{pid:a.pid,cid:a.cid,aid:a.id,unit:a.unit,owner:a.owner,tenant:a.tenant,annualRent:a.annualRent,mgmt:{...a.mgmt,base:'annual'}})}
});
document.addEventListener('input',e=>{
  const id=e.target.id,v=e.target.value.trim();
  if(id==='ag_q'){S.agr.q=v;render()}else if(id==='ag_ps'){agrPickList()}else if(id==='fn_q'){S.fin.q=v;render()}
  else if(e.target.closest('#frm')){if(id.startsWith('ag_')||e.target.closest('#ag_inst'))agrPreview();else if(id.startsWith('an_'))anPreview()}
});
document.addEventListener('change',e=>{
  const id=e.target.id,v=e.target.value;
  if(id==='ag_p'){S.agr.p=v;render()}else if(id==='ag_s'){S.agr.s=v;render()}else if(id==='ag_o'){S.agr.o=v;render()}else if(id==='ag_m'){S.agr.m=v;render()}else if(id==='ag_pf'){agrPickList()}else if(id==='fn_p'){S.fin.p=v;render()}
  else if(id==='ag_pick'&&v)agrPick(v);
  else if(id==='an_pick'&&v){const[p,c]=v.split('|');$('#an_pid').value=p;$('#an_cid').value=c;const cc=cOf(p,c),ps=[...cc.payments].sort((x,y)=>String(x.date).localeCompare(String(y.date)));
    $('#an_pay').innerHTML='<option value="">— يدوي —</option>'+ps.map(q=>`<option value="${esc(q.id)}">${esc((q.date||'بلا تاريخ')+' — '+fm(q.amount))}</option>`).join('');if(ps.length)$('#an_pay').value=ps[ps.length-1].id;anPrefill()}
  else if(id==='an_pay')anPrefill();
  else if(id==='an_pid'||id==='an_cst'){const sel_=document.getElementById('an_pick'),cur=sel_.value,L=anPickList(rv('an_pid'),rv('an_cst'));sel_.innerHTML=L.map(([x,y])=>`<option value="${esc(x)}">${esc(y)}</option>`).join('');if(L.some(o=>o[0]===cur))sel_.value=cur}
  else if(id==='fn_d'){S.fin.d=v;render()}else if(id==='fn_o'){S.fin.o=v;render()}else if(id==='fn_v'){S.fin.v=v;render()}
  else if(e.target.closest('#frm')){if(id.startsWith('ag_')||e.target.closest('#ag_inst'))agrPreview();else if(id.startsWith('an_'))anPreview()}
});
if(typeof printDoc==='function'){/* قائمة الطباعة العامة تستخدم S.pm المعدّ في كل عرض */}
