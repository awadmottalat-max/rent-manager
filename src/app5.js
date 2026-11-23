/* نموذج العقد الجديد: قوائم بحث + إضافة فورية */
'use strict';
function combo(id,o){
  const root=document.getElementById(id);if(!root)return;
  const inp=root.querySelector('input'),box=root.querySelector('.cbl');let idx=-1,cur=[];
  const norm=v=>String(v??'').toLowerCase().trim();
  const close=()=>{box.hidden=true;idx=-1};
  const render=()=>{
    const q=norm(inp.value),L=o.items(q);cur=[];let h='';
    let lastG='';
    for(const it of L){if(it.grp&&it.grp!==lastG){h+=`<div class="cbg">${esc(it.grp)}</div>`;lastG=it.grp}
      h+=`<div class="cbo" data-i="${cur.length}">${esc(it.l)}${it.sub?`<small>${esc(it.sub)}</small>`:''}</div>`;cur.push(it)}
    const exact=L.some(it=>norm(it.v)===q||norm(it.l)===q);
    if(o.onAdd&&q&&!exact){h+=`<div class="cbo add" data-i="${cur.length}">+ ${esc(o.addLabel||'إضافة')} «${esc(inp.value.trim())}»</div>`;cur.push({add:true})}
    if(!h)h=`<div class="cbe">${esc(o.empty?o.empty():'لا توجد نتائج — اكتب للبحث')}</div>`;
    box.innerHTML=h;box.hidden=false;idx=-1;
  };
  const pick=i=>{const it=cur[i];if(!it)return;if(it.add){inp.value=inp.value.trim();o.onAdd(inp.value)}else{inp.value=it.v;o.onPick&&o.onPick(it)}close()};
  inp.addEventListener('focus',render);inp.addEventListener('input',()=>{render();o.onType&&o.onType(inp.value)});
  inp.addEventListener('keydown',e=>{
    const els=[...box.querySelectorAll('.cbo')];
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(box.hidden)render();idx=(idx+(e.key==='ArrowDown'?1:-1)+els.length)%Math.max(1,els.length);els.forEach((x,i)=>x.classList.toggle('hl',i===idx));els[idx]?.scrollIntoView({block:'nearest'})}
    else if(e.key==='Enter'&&!box.hidden){e.preventDefault();pick(idx>=0?idx:(cur.length===1?0:-1))}
    else if(e.key==='Escape'&&!box.hidden){e.preventDefault();e.stopPropagation();close()}
  });
  box.addEventListener('mousedown',e=>{const el=e.target.closest('.cbo');if(el){e.preventDefault();pick(+el.dataset.i)}});
  inp.addEventListener('blur',()=>setTimeout(close,120));
  return{close,refresh:()=>{if(!box.hidden)render()}};
}
const cbHtml=(id,ph)=>`<div class="cb" id="${id}"><input autocomplete="off" placeholder="${esc(ph||'')}"><div class="cbl" hidden></div></div>`;

function contractForm(ed,pre){
  const x=ed?cur():null,edRef=x?{pid:x.pid,cid:x.c.id}:null,c=x?x.c:(pre||{}),pid0=x?x.pid:(pre?.pid||S.f.p||Object.keys(P())[0]||'__new');
  const PERS=[['شهر','شهر'],...[2,3,4,5,6,7,8,9,10,11].map(n=>[n+' أشهر',n+' أشهر']),['سنة','سنة'],['سنتان','سنتان'],['3 سنوات','3 سنوات'],['__c','مخصص (عدد أشهر)…']],
    FQ=[['','— اختر —'],['1','شهري'],['3','ربع سنوي (كل 3 أشهر)'],['6','نصف سنوي (كل 6 أشهر)'],['12','سنوي'],['once','دفعة واحدة'],['s','مخصص: كل … شهر'],['n','مخصص: عدد دفعات محدد'],['plan','دفعات غير متساوية (مبالغ وتواريخ يدوية)']];
  const addv=(L,v)=>{v=String(v??'');return v&&!L.some(o=>o[0]===v)?[...L,[v,v]]:L};
  const fq0=(()=>{if(c.freq)return{f:c.freq,v:c.fval??''};if(c.count===''||c.count==null)return{f:'',v:''};const m=Core.months(c),k=Core.count(c,m);if(!k||!m)return{f:'',v:''};
    if(k===1)return{f:'once',v:''};for(const st of[1,3,6,12])if(k===(m>12?Math.round(12/st)*m/12:Math.ceil(m/st)))return{f:String(st),v:''};return{f:'n',v:k}})();
  const R=ed?'':'<i class="rq">*</i>',all=rows();
  const projOptsH=Object.entries(P()).map(([k,p])=>`<option value="${esc(k)}"${k===pid0?' selected':''}>${esc(p.name)}</option>`).join('')+'<option value="__new">+ مشروع جديد</option>';
  const PV=id=>document.getElementById(id),val=id=>(PV(id)?.value??'').trim();
  const ST={rented:'مؤجرة',avail:'متاحة',pend:'منتهية بانتظار القرار',unavail:'غير متاحة'};
  const st={newUnit:false,newOwner:false,newTenant:false};
  const f=(l,el,cls)=>`<label class="${cls||''}">${l}${el}</label>`;
  $('#frm').innerHTML=`<div class="dh"><h2>${ed?'تعديل العقد':(pre?'تجديد العقد':'عقد جديد')}</h2><button class="x" data-a="fclose" aria-label="إغلاق">✕</button></div>
<div class="fg cf">
<h4 class="fs full"><b>1</b> المشروع والوحدة</h4>
${f('المشروع'+R,`<select id="cf_pid">${projOptsH}</select>`)}${f('اسم المشروع الجديد'+R,'<input id="cf_pname" placeholder="يُستخدم عند اختيار مشروع جديد">','pn')}
<div class="full"><label>رقم الوحدة${R} <span class="hint">ابحث بالرقم أو اسم المالك — وإن لم توجد أضفها مباشرة</span></label>${cbHtml('cb_unit','اكتب رقم الوحدة للبحث أو الإضافة…')}<label class="chk"><input type="checkbox" id="cf_uav"${ed?'':' checked'}> إظهار الوحدات المتاحة فقط</label></div>
<div class="full box nu" id="nu" hidden><b>وحدة جديدة — ستُضاف إلى وحدات المشروع</b><div class="g3"><label>النوع<input id="nu_type" placeholder="شقة، فيلا، معرض…"></label><label>المساحة<input id="nu_area"></label><label>الغرف<input id="nu_rooms"></label></div></div>
<h4 class="fs full"><b>2</b> المالك والمستأجر والقيمة</h4>
<div class="full"><label>اسم المالك${R} <span class="hint">يُعبَّأ تلقائيًا من الوحدة ويمكن تغييره</span></label>${cbHtml('cb_owner','ابحث عن المالك أو أضفه…')}</div>
<div class="full box no" id="no" hidden><b>مالك جديد — يُحفظ في سجل الملاك</b><div class="g3"><label>الجوال<input id="no_phone"></label><label>الهوية / السجل<input id="no_id"></label><label>البريد<input id="no_mail"></label></div></div>
<div class="full"><label>اسم المستأجر${R}</label>${cbHtml('cb_ten','ابحث عن المستأجر أو أضفه…')}</div>
<div class="full box nt" id="nt" hidden><b>مستأجر جديد — يُحفظ في سجل المستأجرين</b><div class="g3"><label>الجوال<input id="nt_phone"></label><label>الهوية / الإقامة<input id="nt_id"></label><label>البريد<input id="nt_mail"></label></div></div>
${f('قيمة الإيجار'+R,`<input id="cf_rent" type="number" step="0.01" min="0" value="${esc(c.rent??'')}">`)}${f('دورة الدفع'+R,`<select id="cf_freq">${FQ.map(([a,b])=>`<option value="${esc(a)}"${a===fq0.f?' selected':''}>${esc(b)}</option>`).join('')}</select>`)}
<div class="full" id="cf_fqx" hidden><label><span id="cf_fqx_l">كل كم شهر؟</span><input id="cf_fqv" type="number" min="1" max="36" step="1" value="${esc(fq0.v)}"></label><small class="hint">تُقسَّم مدة العقد على الدفعات بالتساوي — شاهد جدول الأقساط أدناه.</small></div>
<div class="full" id="cf_planbox" hidden><b>جدول الدفعات غير المتساوية</b><small class="hint">أدخل كل دفعة بتاريخها ومبلغها (مثل 50 ثم 25 ثم 25). يجب أن يساوي المجموع قيمة الإيجار.</small>
<table class="t" id="cf_pl"><thead><tr><th>#</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th></th></tr></thead><tbody></tbody></table>
<div class="row"><button type="button" class="btn sm" id="pl_add">+ دفعة</button><button type="button" class="btn sm" id="pl_eq">توزيع المتبقي على الدفعات الفارغة</button><span id="cf_plsum" class="ch"></span></div></div>
<h4 class="fs full"><b>3</b> فترة الإيجار وتواريخه</h4>
<div class="g3r">${f('فترة العقد'+R,`<select id="cf_period">${addv([['','— اختر —'],...PERS],c.period).map(([a,b])=>`<option value="${esc(a)}"${String(a)===String(c.period??'')?' selected':''}>${esc(b)}</option>`).join('')}</select><input id="cf_pm" type="number" min="1" max="60" step="1" placeholder="عدد الأشهر" style="margin-top:6px" hidden>`)}
${f('بداية الإيجار'+R,dateField('cf_start',c.start??''))}${f('نهاية الإيجار'+R+' <span class="hint">تُحسب من الفترة وتُعدَّل يدويًا</span>',dateField('cf_end',c.end??''))}</div>
<div class="full ovbox" id="cf_ov" hidden></div>
<div class="full sched" id="cf_sched"></div>
<h4 class="fs full"><b>4</b> بيانات إضافية <small>(اختياري)</small></h4>
${f('رسوم الأملاك',`<input id="cf_fee" type="number" step="0.01" min="0" value="${esc(c.fee??'')}">`)}${f('رقم عقد منصة إيجار',`<input id="cf_ejar" value="${esc(c.ejar??'')}">`)}${f('رقم ساب SAP',`<input id="cf_sap" value="${esc(c.sap??'')}">`)}
${f('تاريخ إبرام العقد',dateField('cf_sign',c.signDate??''))}${f('فترة السماح (أيام)',`<input id="cf_grace" type="number" min="0" step="1" value="${esc(c.grace??'')}">`)}
${f('ضريبة القيمة المضافة على الإيجار',`<select id="cf_vat"><option value="0"${!Number(c.vatRate)?' selected':''}>لا تُفرض (سكني)</option><option value="15"${Number(c.vatRate)===15?' selected':''}>15% (تجاري)</option></select>`)}${f('مبلغ الضمان / التأمين',`<input id="cf_dep" type="number" min="0" step="0.01" value="${esc(c.deposit??'')}">`)}
${f('رسوم إضافية (مياه / خدمات)',`<input id="cf_svc" type="number" min="0" step="0.01" value="${esc(c.svc??'')}">`)}
${f('الشروط الخاصة (شرط في كل سطر، تظهر في الطباعة)',`<textarea id="cf_cond" rows="3">${esc(c.conditions??'')}</textarea>`,'full')}
${f('ملاحظات',`<textarea id="cf_notes" rows="2">${esc(c.notes??'')}</textarea>`,'full')}
${ed?'<div class="full ovbox" id="cf_all" hidden></div>':''}
<h4 class="fs full"><b>5</b> المرفقات <small>(اختياري)</small></h4>
<div class="full"><span class="fl">العقد الموقّع، الهوية، السجل التجاري، عقد منصة إيجار، إيصالات…</span>${attField('cf',c.files)}</div>
</div><div class="ft"><span id="cf_err" class="ferr"></span><button class="btn p" id="cf_save">${ed?'حفظ التعديلات':'حفظ العقد'}</button><button class="btn" data-a="fclose">إلغاء</button></div>`;
  if(!$('#frm').open)$('#frm').showModal();
  /* ----- الحالة الأولية ----- */
  $('#cb_unit input').value=c.unit??'';$('#cb_owner input').value=c.owner??'';$('#cb_ten input').value=c.tenant??'';
  const curP=()=>P()[PV('cf_pid').value];
  const showPN=()=>{PV('cf_pname').closest('label').style.display=PV('cf_pid').value==='__new'?'':'none'};showPN();
  /* ----- القوائم ----- */
  const unitItems=q=>{const p=curP(),onlyAv=PV('cf_uav').checked;if(!p)return[];
    return[...(p.units||[])].sort((a,b)=>String(a.no).localeCompare(String(b.no),'ar',{numeric:true})).map(u=>({u,i:unitInfo(p,u).st}))
      .filter(o=>(!q||norm(o.u.no).includes(q)||norm(o.u.owner).includes(q))&&(!onlyAv||o.i==='avail'||normU(o.u.no)===normU($('#cb_unit input').value)))
      .slice(0,80).map(o=>({v:o.u.no,l:o.u.no+' — '+ST[o.i],sub:o.u.owner||'',u:o.u}))};
  const norm=v=>String(v??'').toLowerCase().trim();
  const ownersOfProject=()=>{const p=curP();const S1=new Set();for(const u of p?.units||[])if(u.owner)S1.add(nm(u.owner));for(const c of p?.contracts||[])if(c.owner)S1.add(nm(c.owner));return S1};
  const ownerItems=q=>{const mine=ownersOfProject(),others=new Set([...partyList('owners',all).map(o=>o.name)].filter(n=>!mine.has(n)));
    const m=n=>!q||norm(n).includes(q);
    return[...[...mine].filter(m).sort((a,b)=>a.localeCompare(b,'ar')).slice(0,60).map(n=>({v:n,l:n,grp:'ملاك هذا المشروع'})),...(q?[...others].filter(m).sort((a,b)=>a.localeCompare(b,'ar')).slice(0,30).map(n=>({v:n,l:n,grp:'ملاك من مشاريع أخرى'})):[])]};
  const tenItems=q=>partyList('tenants',all).map(o=>o.name).filter(n=>n!=='(بدون مستأجر)'&&(!q||norm(n).includes(q))).slice(0,60).map(n=>({v:n,l:n}));
  const cu=combo('cb_unit',{items:unitItems,addLabel:'إضافة وحدة جديدة',empty:()=>PV('cf_uav').checked?'لا وحدات متاحة هنا — ألغِ «المتاحة فقط» لعرض كل الوحدات، أو اكتب رقمًا لإضافة وحدة جديدة':'لا توجد وحدات — اكتب رقم الوحدة لإضافتها',
    onPick:it=>{st.newUnit=false;$('#nu').hidden=true;if(it.u?.owner){$('#cb_owner input').value=it.u.owner;$('#no').hidden=true;st.newOwner=false}if(!val('cf_rent')&&it.u?.askRent){PV('cf_rent').value=it.u.askRent;sched()}},
    onAdd:q=>{st.newUnit=true;$('#nu').hidden=false;$('#cb_owner input').focus()},
    onType:v=>{const p=curP();const hit=(p?.units||[]).find(u=>normU(u.no)===normU(v));st.newUnit=!hit&&v.trim()!=='';$('#nu').hidden=!st.newUnit;if(hit?.owner&&!val('cb_owner')){}}});
  const co=combo('cb_owner',{items:ownerItems,addLabel:'إضافة مالك جديد',
    onPick:()=>{st.newOwner=false;$('#no').hidden=true},onAdd:()=>{st.newOwner=true;$('#no').hidden=false;PV('no_phone').focus()},
    onType:v=>{const ex=ownerItems('').some(i=>norm(i.v)===norm(v));const all_=partyList('owners',all).some(o=>norm(o.name)===norm(v));st.newOwner=v.trim()!==''&&!all_;$('#no').hidden=!st.newOwner}});
  const ct=combo('cb_ten',{items:tenItems,addLabel:'إضافة مستأجر جديد',
    onPick:()=>{st.newTenant=false;$('#nt').hidden=true},onAdd:()=>{st.newTenant=true;$('#nt').hidden=false;PV('nt_phone').focus()},
    onType:v=>{const ex=partyList('tenants',all).some(o=>norm(o.name)===norm(v));st.newTenant=v.trim()!==''&&!ex;$('#nt').hidden=!st.newTenant}});
  PV('cf_pid').addEventListener('change',()=>{showPN();const p=curP();const hit=p&&(p.units||[]).some(u=>normU(u.no)===normU($('#cb_unit input').value));if(!hit){$('#cb_unit input').value='';$('#nu').hidden=true;st.newUnit=false;if(!ed)$('#cb_owner input').value=''}cu&&cu.refresh()});
  PV('cf_uav').addEventListener('change',()=>{$('#cb_unit input').focus();cu.refresh()});
  /* ----- التواريخ والجدول ----- */
  const perVal=()=>{const p=val('cf_period');if(p==='__c'){const n=parseInt(val('cf_pm'),10);return n>0?(n===1?'شهر':n+' أشهر'):''}return p};
  const monthsNow=()=>Core.months({start:val('cf_start'),end:val('cf_end'),period:perVal()});
  const planRows=()=>[...document.querySelectorAll('#cf_pl tbody tr')].map(tr=>({date:tr.querySelector('.pl_d').value,amount:tr.querySelector('.pl_a').value}));
  const planOk=()=>planRows().filter(r=>r.date&&Number(r.amount)>0);
  const cntNow=()=>{const f=val('cf_freq');if(!f)return'';if(f==='plan')return planOk().length||'';if(f==='once')return 1;const m=monthsNow();if(!m)return'';const v=parseInt(val('cf_fqv'),10);let step=null,tot=null;
    if(f==='s'){if(!(v>0))return'';step=v}else if(f==='n'){if(!(v>0))return'';tot=v}else step=+f;
    return step!=null?(m<=12?Math.ceil(m/step):Math.max(1,Math.round(12/step))):(m<=12?tot:Math.max(1,Math.round(tot*12/m)))};
  const autoEnd=()=>{const s=pd(val('cf_start')),m=Core.months({period:perVal()});if(s!=null&&m)setDate('cf_end',iso(edate(s,m)-DAY))};
  const showFx=()=>{const f=val('cf_freq');PV('cf_fqx').hidden=!(f==='s'||f==='n');PV('cf_planbox').hidden=f!=='plan';if(f==='plan'&&!document.querySelector('#cf_pl tbody tr'))planInit();PV('cf_fqx_l').textContent=f==='n'?'عدد الدفعات الإجمالي':'كل كم شهر؟'};
  const showPm=()=>{const pm=PV('cf_pm');pm.hidden=val('cf_period')!=='__c'};
  function planSum(){const L=planRows(),t=L.reduce((a,r)=>a+(Number(r.amount)||0),0),rent=Number(val('cf_rent'))||0,d=Math.round((rent-t)*100)/100,e=PV('cf_plsum');if(!e)return;e.className='ch '+(d===0&&t>0?'ok':'warn');e.textContent='المجموع '+fm(t)+' من '+fm(rent)+(d===0?' ✓':d>0?' — متبقٍ '+fm(d):' — زائد '+fm(-d))}
  function planRow(i,r){return `<tr><td class="d">${i+1}</td><td>${dateField('pl_d'+i,r.date||'','pl_d')}</td><td><input type="number" step="0.01" min="0" class="pl_a" value="${esc(r.amount??'')}"></td><td><button type="button" class="btn sm dng" data-pl="del" data-i="${i}">✕</button></td></tr>`}
  function planDraw(L){document.querySelector('#cf_pl tbody').innerHTML=L.map((r,i)=>planRow(i,r)).join('');planSum();sched()}
  function planInit(){const L=Array.isArray(c.plan)&&c.plan.length?c.plan:[{date:val('cf_start'),amount:''},{date:'',amount:''}];planDraw(L)}
  function sched(){const el=PV('cf_sched');const o={start:val('cf_start'),end:val('cf_end'),rent:val('cf_rent'),count:cntNow(),period:perVal(),plan:val('cf_freq')==='plan'?planOk():null};
    const r=calc(o,MODE(),TODAY);el.innerHTML=r.inst.length?`<b>جدول الأقساط وتواريخ الاستحقاق (${r.inst.length})</b><div class="chips">${r.inst.map(i=>`<span class="ch">${i.n} · ${i.date!=null?iso(i.date):'—'} · ${fm(i.amount)}</span>`).join('')}</div>${r.m>12?'<small class="hint">العقد أطول من سنة: دورة الدفع تُطبَّق على كل سنة من العقد.</small>':''}`:'<span class="sub">يظهر جدول الأقساط عند إدخال الفترة والبداية والإيجار ودورة الدفع.</span>'}
  /* ----- تأجير وحدة عليها عقد قائم ----- */
  function chkOv(){const box=PV('cf_ov');if(ed){box.hidden=true;return}
    const p=curP(),un=$('#cb_unit input').value,u=p&&(p.units||[]).find(u=>normU(u.no)===normU(un)),inf=u?unitInfo(p,u):null,a=inf&&inf.act&&!inf.act.c.exit?inf.act:null;
    if(!a){box.hidden=true;st.ov=null;return}
    const s=val('cf_start'),over=!s||s<=a.c.end;
    if(!st.ov||st.ov.cid!==a.c.id){st.ov={cid:a.c.id,touched:false,on:over};
      box.innerHTML=`<b>هذه الوحدة عليها عقد قائم</b><span>المستأجر الحالي: <b>${esc(a.c.tenant)||'—'}</b> — ينتهي عقده في <bdi>${esc(a.c.end)}</bdi>. يمكنك تأجيرها الآن قبل انتهائه وإنهاء العقد السابق من تاريخ محدد.</span>
<label class="chk"><input type="checkbox" id="ov_on"> إنهاء العقد السابق تلقائيًا عند حفظ العقد الجديد</label><div id="ov_dw"><label>تاريخ انتهاء العقد السابق ${dateField('ov_d','')}<small class="hint">إن تُرك فارغًا يُنهى قبل بداية العقد الجديد بيوم.</small></label></div>`;
      PV('ov_on').onchange=()=>{st.ov.on=PV('ov_on').checked;st.ov.touched=true;PV('ov_dw').style.display=st.ov.on?'':'none'}}
    if(!st.ov.touched)st.ov.on=over;
    PV('ov_on').checked=st.ov.on;PV('ov_dw').style.display=st.ov.on?'':'none';box.hidden=false}
  PV('cf_freq').addEventListener('change',()=>{showFx();sched()});
  PV('pl_add').onclick=()=>{const L=planRows();L.push({date:'',amount:''});planDraw(L)};
  PV('pl_eq').onclick=()=>{const L=planRows(),rent=Number(val('cf_rent'))||0,filled=L.reduce((a,r)=>a+(Number(r.amount)||0),0),emp=L.filter(r=>!(Number(r.amount)>0));if(!emp.length||rent<=filled)return;const each=Math.floor((rent-filled)/emp.length*100)/100;let left=Math.round((rent-filled)*100)/100;emp.forEach((r,i)=>{r.amount=i===emp.length-1?Math.round(left*100)/100:each;left-=each});planDraw(L)};
  PV('cf_planbox').addEventListener('click',e=>{const b=e.target.closest('[data-pl=del]');if(!b)return;const L=planRows();L.splice(+b.dataset.i,1);planDraw(L)});
  PV('cf_planbox').addEventListener('input',()=>{planSum();sched()});PV('cf_planbox').addEventListener('change',()=>{planSum();sched()});
  PV('cf_period').addEventListener('change',()=>{showPm();autoEnd();sched()});
  PV('cf_pm').addEventListener('input',()=>{autoEnd();sched()});
  PV('cf_start').addEventListener('change',()=>{autoEnd();sched();chkOv()});
  ['cf_end','cf_fqv','cf_rent'].forEach(id=>{PV(id).addEventListener('input',sched);PV(id).addEventListener('change',sched)});
  PV('cf_pid').addEventListener('change',chkOv);$('#cb_unit').addEventListener('input',chkOv);$('#cb_unit').addEventListener('click',()=>setTimeout(chkOv,60));
  if(c.period&&!PERS.some(o=>o[0]===c.period)){}showFx();showPm();sched();chkOv();
  /* ----- تطبيق التعديل على الكل (عند تغيير المالك/المستأجر/رقم الوحدة) ----- */
  const cnt0=(f,v)=>{let n=0,u=0;for(const p of Object.values(P())){for(const z of p.contracts)if(nm(z[f])===v)n++;if(f==='owner')for(const z of p.units||[])if(nm(z.owner)===v)u++}return{n,u}};
  const chg=()=>{const o=nm($('#cb_owner input').value),t=nm($('#cb_ten input').value),u=nm($('#cb_unit input').value);const r=[];
    if(o&&nm(c.owner)&&o!==nm(c.owner))r.push(['o',nm(c.owner),o]);if(t&&nm(c.tenant)&&t!==nm(c.tenant))r.push(['t',nm(c.tenant),t]);if(u&&nm(c.unit)&&normU(u)!==normU(c.unit)&&!(P()[edRef.pid].units||[]).some(z=>normU(z.no)===normU(u)))r.push(['u',nm(c.unit),u]);return r};
  function chkAll(){const box=PV('cf_all');if(!box)return;const r=chg(),key=JSON.stringify(r);
    if(!r.length){box.hidden=true;box.dataset.k='';return}if(box.dataset.k===key){box.hidden=false;return}box.dataset.k=key;
    box.innerHTML='<b>تطبيق التغيير على الكل</b>'+r.map(([k,a,b])=>{const n=k==='u'?(c.unit?P()[edRef.pid].contracts.filter(z=>normU(z.unit)===normU(a)).length:1):cnt0(k==='o'?'owner':'tenant',a).n,uu=k==='o'?cnt0('owner',a).u:0;
      const lab=k==='o'?'اسم المالك':k==='t'?'اسم المستأجر':'رقم الوحدة';
      return `<label class="chk"><input type="checkbox" id="ap_${k}" checked> تغيير ${lab} من «${esc(a)}» إلى «${esc(b)}» في كل المواضع (${n} عقدًا${uu?' و'+uu+' وحدة':''}${k==='u'?' + سجل الوحدة':''})</label>`}).join('')+'<small class="hint">إن أزلت العلامة يُغيَّر هذا العقد فقط.</small>';box.hidden=false}
  const applyAll=(o,old,pid0)=>{
    if(!PV('cf_all'))return{};
    const r=chg().filter(([k])=>PV('ap_'+k)?.checked);
    for(const[k,a,b]of r){
      if(k==='u'){const p=P()[pid0];if((p.units||[]).some(z=>normU(z.no)!==normU(a)&&normU(z.no)===normU(b)))return{err:'رقم الوحدة «'+b+'» موجود مسبقًا في المشروع',id:'cb_unit'};
        for(const z of p.contracts)if(normU(z.unit)===normU(a))z.unit=b;for(const z of p.units||[])if(normU(z.no)===normU(a))z.no=b}
      else{const f=k==='o'?'owner':'tenant',kind=k==='o'?'owners':'tenants';
        for(const p of Object.values(P())){for(const z of p.contracts)if(nm(z[f])===a)z[f]=b;if(k==='o')for(const z of p.units||[])if(nm(z.owner)===a)z.owner=b}
        for(const z of S.db.agreements||[])if(nm(z[f])===a)z[f]=b;for(const z of S.db.analyses||[])if(nm(z[f])===a)z[f]=b;
        const L=PR(kind),ra=L.find(z=>nm(z.name)===a);if(ra&&!L.some(z=>nm(z.name)===b))ra.name=b}}
    if(r.length){const oc=P()[pid0].contracts.find(z=>z.id===old.id);if(oc)Object.assign(old,oc)}
    return{}};
  ['cb_owner','cb_ten','cb_unit'].forEach(i=>{const el=$('#'+i);el.addEventListener('input',chkAll);el.addEventListener('click',()=>setTimeout(chkAll,80))});
  /* ----- الحفظ ----- */
  const mark=(ids,msg)=>{document.querySelectorAll('#frm .bad').forEach(e=>e.classList.remove('bad'));ids.forEach(i=>{const e=PV(i)||document.querySelector('#'+i+' input');if(e)(e.type==='hidden'?e.closest('.dtf'):e).classList.add('bad')});PV('cf_err').textContent=msg||'';const f=PV(ids[0])||document.querySelector('#'+ids[0]+' input');f&&(f.closest('.dtf')?.querySelector('.dtd')||f).focus()};
  PV('cf_save').onclick=()=>{
    const o={pid:val('cf_pid'),pname:val('cf_pname'),unit:$('#cb_unit input').value.trim(),owner:$('#cb_owner input').value.trim(),tenant:$('#cb_ten input').value.trim(),rent:val('cf_rent'),fee:val('cf_fee'),count:cntNow(),freq:val('cf_freq'),fval:val('cf_fqv'),period:perVal(),start:val('cf_start'),end:val('cf_end'),ejar:val('cf_ejar'),sap:val('cf_sap'),notes:val('cf_notes'),signDate:val('cf_sign'),grace:val('cf_grace'),vatRate:val('cf_vat'),deposit:val('cf_dep'),svc:val('cf_svc'),conditions:PV('cf_cond').value.trim()};
    let pid=o.pid,pn='';
    if(pid==='__new'){pn=o.pname;if(!pn)return mark(['cf_pname'],'أدخل اسم المشروع الجديد');pid=Object.keys(P()).find(k=>P()[k].name===pn)||'p'+uid()}
    if(!numOk(o.rent)||!numOk(o.fee)||!numOk(o.deposit)||!numOk(o.svc))return mark(['cf_rent'],'تحقق من الأرقام المدخلة');
    if(!ed){
      const need=[['unit','cb_unit','رقم الوحدة'],['owner','cb_owner','اسم المالك'],['tenant','cb_ten','اسم المستأجر'],['rent','cf_rent','قيمة الإيجار'],['count',val('cf_freq')==='s'||val('cf_freq')==='n'?'cf_fqv':'cf_freq','دورة الدفع'],['period',val('cf_period')==='__c'?'cf_pm':'cf_period','فترة العقد'],['start','cf_start','بداية الإيجار'],['end','cf_end','نهاية الإيجار']];
      const miss=need.filter(([k])=>String(o[k]??'').trim()==='');
      if(miss.length)return mark(miss.map(m=>m[1]),'أكمل الحقول الإلزامية: '+miss.map(m=>m[2]).join('، '));
      if(!(Number(o.rent)>0))return mark(['cf_rent'],'قيمة الإيجار يجب أن تكون أكبر من صفر');
      if(o.end<o.start)return mark(['cf_end'],'نهاية الإيجار قبل بدايته');
    }
    if(o.freq==='plan'){const L=planOk(),sm=L.reduce((a,r)=>a+Number(r.amount),0),tt=calc({start:o.start,end:o.end,rent:o.rent,count:o.count,period:o.period},MODE(),TODAY).total??Number(o.rent),bad=planRows().some(r=>(r.date&&!(Number(r.amount)>0))||(!r.date&&Number(r.amount)>0));
      if(!L.length||bad)return mark(['cf_freq'],'أكمل تاريخ ومبلغ كل دفعة في الجدول (أو احذف الصف الفارغ)');
      if(Math.abs(sm-tt)>0.01)return mark(['cf_rent'],'مجموع الدفعات ('+fm(sm)+') لا يساوي قيمة الإيجار ('+fm(tt)+')')}
    {const t=calc({start:o.start,end:o.end,rent:o.rent,count:o.count,period:o.period,plan:o.freq==='plan'?planOk():null},MODE(),TODAY);
      if(!t.inst.length||t.inst.some(i=>i.date==null))return mark(['cf_freq'],'لكل عقد جدول أقساط بتواريخ استحقاق: حدّد دورة الدفع والتواريخ وقيمة الإيجار');
    }
    if(!o.unit&&!o.tenant)return mark(['cb_unit'],'أدخل رقم الوحدة أو اسم المستأجر');
    const d={unit:o.unit,tenant:o.tenant,owner:o.owner,ejar:o.ejar,sap:o.sap,rent:o.rent===''?'':Number(o.rent),fee:o.fee===''?'':Number(o.fee),signDate:o.signDate,grace:o.grace,vatRate:Number(o.vatRate)||0,deposit:o.deposit===''?'':Number(o.deposit),svc:o.svc===''?'':Number(o.svc),conditions:o.conditions,start:o.start,end:o.end,period:o.period,count:o.count===''?(ed?c.count:''):Number(o.count),freq:o.freq,fval:o.fval,plan:o.freq==='plan'?planOk().map(r=>({date:r.date,amount:Number(r.amount)})).sort((a,b)=>a.date<b.date?-1:1):null,notes:o.notes,files:attGet('cf')};
    const regAdd=(kind,name,ph,id,mail)=>{if(!name)return;const L=PR(kind);if(L.some(r=>nm(r.name)===name))return;if(partyList(kind,rows()).some(r=>r.name===name&&r.contracts))return;L.push({id:'r'+uid(),name,phone:ph,idno:id,email:mail,addr:'',notes:''})};
    if(st.newOwner)regAdd('owners',o.owner,val('no_phone'),val('no_id'),val('no_mail'));
    if(st.newTenant)regAdd('tenants',o.tenant,val('nt_phone'),val('nt_id'),val('nt_mail'));
    const extra=u=>{if(st.newUnit&&u){Object.assign(u,{type:val('nu_type'),area:val('nu_area'),rooms:val('nu_rooms')})}};
    const put=(pid,c)=>{if(!P()[pid])P()[pid]={name:pn,no:'',contracts:[],units:[]};const p=structuredClone(P()[pid]);ensureUnit(p,c);extra(p.units.find(u=>normU(u.no)===normU(c.unit)));p.contracts.push(c);P()[pid]=p};
    if(ed){
      const old=P()[edRef.pid].contracts.find(c=>c.id===edRef.cid),m={...old,...d};
      const A=applyAll(o,old,edRef.pid);if(A.err)return mark([A.id||'cb_unit'],A.err);
      if(pid===edRef.pid)mutate(pid,p=>{p.contracts=p.contracts.map(c=>c.id===edRef.cid?m:c);ensureUnit(p,m)});
      else{mutate(edRef.pid,p=>{p.contracts=p.contracts.filter(c=>c.id!==edRef.cid)});put(pid,m);persist()}
      S.cur={pid,cid:edRef.cid};
    }else{const c={id:'c'+uid(),oldDates:[],prevRemaining:'',extra:0,payments:[],...d};put(pid,c);
      if(st.ov?.on){const oc=P()[pid].contracts.find(z=>z.id===st.ov.cid);if(oc){let dt=val('ov_d');if(!dt&&o.start)dt=iso(pd(o.start)-DAY);if(oc.start&&dt<oc.start)dt=oc.start;oc.exit={date:dt,reason:'تأجير الوحدة لمستأجر جديد قبل انتهاء العقد',note:'أُنهي تلقائيًا عند إضافة عقد جديد للوحدة (المستأجر الجديد: '+o.tenant+')',waive:false,files:[]}}}
      persist();S.cur={pid,cid:c.id}}
    attCommit();$('#frm').close();render();openDet(S.cur.pid,S.cur.cid);toast(st.ov?.on?'تم حفظ العقد وإنهاء العقد السابق للوحدة':'تم حفظ العقد');
  };
  setTimeout(()=>{if(!ed)$('#cb_unit input')?.focus()},50);
}
