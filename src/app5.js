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
  const x=ed?cur():null,c=x?x.c:(pre||{}),pid0=x?x.pid:(pre?.pid||S.f.p||Object.keys(P())[0]||'__new');
  const PERS=[['شهر','شهر'],['3 أشهر','3 أشهر'],['6 أشهر','6 أشهر'],['9 أشهر','9 أشهر'],['سنة','سنة'],['سنتان','سنتان'],['3 سنوات','3 سنوات']],
    CNTS=[['12','شهري (12 قسطًا)'],['4','ربع سنوي (4 أقساط)'],['3','3 أقساط'],['2','دفعتان'],['1','دفعة واحدة'],['6','6 أقساط']];
  const addv=(L,v)=>{v=String(v??'');return v&&!L.some(o=>o[0]===v)?[...L,[v,v]]:L};
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
${f('قيمة الإيجار'+R,`<input id="cf_rent" type="number" step="0.01" min="0" value="${esc(c.rent??'')}">`)}${f('عدد الدفعات'+R,`<select id="cf_count">${addv([['','— اختر —'],...CNTS],c.count).map(([a,b])=>`<option value="${esc(a)}"${String(a)===String(c.count??'')?' selected':''}>${esc(b)}</option>`).join('')}</select>`)}
<h4 class="fs full"><b>3</b> فترة الإيجار وتواريخه</h4>
${f('فترة العقد'+R,`<select id="cf_period">${addv([['','— اختر —'],...PERS],c.period).map(([a,b])=>`<option value="${esc(a)}"${String(a)===String(c.period??'')?' selected':''}>${esc(b)}</option>`).join('')}</select>`)}
${f('بداية الإيجار'+R,`<input id="cf_start" type="date" value="${esc(c.start??'')}">`)}
${f('نهاية الإيجار'+R+' <span class="hint">تُحسب من الفترة ويمكن تعديلها</span>',`<input id="cf_end" type="date" value="${esc(c.end??'')}">`)}
<div class="full sched" id="cf_sched"></div>
<h4 class="fs full"><b>4</b> بيانات إضافية <small>(اختياري)</small></h4>
${f('رسوم الأملاك',`<input id="cf_fee" type="number" step="0.01" min="0" value="${esc(c.fee??'')}">`)}${f('رقم عقد منصة إيجار',`<input id="cf_ejar" value="${esc(c.ejar??'')}">`)}${f('رقم ساب SAP',`<input id="cf_sap" value="${esc(c.sap??'')}">`)}
${f('ملاحظات',`<textarea id="cf_notes" rows="2">${esc(c.notes??'')}</textarea>`,'full')}
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
  const PM={'شهر':1,'3 أشهر':3,'6 أشهر':6,'9 أشهر':9,'سنة':12,'سنتان':24,'3 سنوات':36};
  const autoEnd=()=>{const s=pd(PV('cf_start').value),m=PM[PV('cf_period').value];if(s!=null&&m)PV('cf_end').value=iso(edate(s,m)-DAY)};
  function sched(){const el=PV('cf_sched');const o={start:val('cf_start'),end:val('cf_end'),rent:val('cf_rent'),count:val('cf_count'),period:val('cf_period')};
    const r=calc(o,MODE(),TODAY);el.innerHTML=r.inst.length?`<b>جدول الأقساط وتواريخ الاستحقاق (${r.inst.length})</b><div class="chips">${r.inst.map(i=>`<span class="ch">${i.n} · ${i.date!=null?iso(i.date):'—'} · ${fm(i.amount)}</span>`).join('')}</div>`:'<span class="sub">يظهر جدول الأقساط عند إدخال الفترة والبداية والإيجار وعدد الدفعات.</span>'}
  ['cf_period','cf_start'].forEach(id=>PV(id).addEventListener('change',()=>{autoEnd();sched()}));
  ['cf_end','cf_count','cf_rent'].forEach(id=>{PV(id).addEventListener('input',sched);PV(id).addEventListener('change',sched)});sched();
  /* ----- الحفظ ----- */
  const mark=(ids,msg)=>{document.querySelectorAll('#frm .bad').forEach(e=>e.classList.remove('bad'));ids.forEach(i=>{const e=PV(i)||document.querySelector('#'+i+' input');e&&e.classList.add('bad')});PV('cf_err').textContent=msg||'';const f=PV(ids[0])||document.querySelector('#'+ids[0]+' input');f&&f.focus()};
  PV('cf_save').onclick=()=>{
    const o={pid:val('cf_pid'),pname:val('cf_pname'),unit:$('#cb_unit input').value.trim(),owner:$('#cb_owner input').value.trim(),tenant:$('#cb_ten input').value.trim(),rent:val('cf_rent'),fee:val('cf_fee'),count:val('cf_count'),period:val('cf_period'),start:val('cf_start'),end:val('cf_end'),ejar:val('cf_ejar'),sap:val('cf_sap'),notes:val('cf_notes')};
    let pid=o.pid,pn='';
    if(pid==='__new'){pn=o.pname;if(!pn)return mark(['cf_pname'],'أدخل اسم المشروع الجديد');pid=Object.keys(P()).find(k=>P()[k].name===pn)||'p'+uid()}
    if(!numOk(o.rent)||!numOk(o.fee))return mark(['cf_rent'],'تحقق من الأرقام المدخلة');
    if(!ed){
      const need=[['unit','cb_unit','رقم الوحدة'],['owner','cb_owner','اسم المالك'],['tenant','cb_ten','اسم المستأجر'],['rent','cf_rent','قيمة الإيجار'],['count','cf_count','عدد الدفعات'],['period','cf_period','فترة العقد'],['start','cf_start','بداية الإيجار'],['end','cf_end','نهاية الإيجار']];
      const miss=need.filter(([k])=>String(o[k]??'').trim()==='');
      if(miss.length)return mark(miss.map(m=>m[1]),'أكمل الحقول الإلزامية: '+miss.map(m=>m[2]).join('، '));
      if(!(Number(o.rent)>0))return mark(['cf_rent'],'قيمة الإيجار يجب أن تكون أكبر من صفر');
      if(o.end<o.start)return mark(['cf_end'],'نهاية الإيجار قبل بدايته');
      const t=calc({start:o.start,end:o.end,rent:o.rent,count:o.count,period:o.period},MODE(),TODAY);
      if(!t.inst.length||t.inst.some(i=>i.date==null))return mark(['cf_count'],'تعذّر حساب الأقساط وتواريخ الاستحقاق — راجع عدد الدفعات والتواريخ');
    }
    if(!o.unit&&!o.tenant)return mark(['cb_unit'],'أدخل رقم الوحدة أو اسم المستأجر');
    const d={unit:o.unit,tenant:o.tenant,owner:o.owner,ejar:o.ejar,sap:o.sap,rent:o.rent===''?'':Number(o.rent),fee:o.fee===''?'':Number(o.fee),start:o.start,end:o.end,period:o.period,count:/^\d+(\.\d+)?$/.test(o.count)?Number(o.count):o.count,notes:o.notes};
    const regAdd=(kind,name,ph,id,mail)=>{if(!name)return;const L=PR(kind);if(L.some(r=>nm(r.name)===name))return;if(partyList(kind,rows()).some(r=>r.name===name&&r.contracts))return;L.push({id:'r'+uid(),name,phone:ph,idno:id,email:mail,addr:'',notes:''})};
    if(st.newOwner)regAdd('owners',o.owner,val('no_phone'),val('no_id'),val('no_mail'));
    if(st.newTenant)regAdd('tenants',o.tenant,val('nt_phone'),val('nt_id'),val('nt_mail'));
    const extra=u=>{if(st.newUnit&&u){Object.assign(u,{type:val('nu_type'),area:val('nu_area'),rooms:val('nu_rooms')})}};
    const put=(pid,c)=>{if(!P()[pid])P()[pid]={name:pn,no:'',contracts:[],units:[]};const p=structuredClone(P()[pid]);ensureUnit(p,c);extra(p.units.find(u=>normU(u.no)===normU(c.unit)));p.contracts.push(c);P()[pid]=p};
    if(ed){
      const old=P()[ed.pid].contracts.find(c=>c.id===ed.cid),m={...old,...d};
      if(pid===ed.pid)mutate(pid,p=>{p.contracts=p.contracts.map(c=>c.id===ed.cid?m:c);ensureUnit(p,m)});
      else{mutate(ed.pid,p=>{p.contracts=p.contracts.filter(c=>c.id!==ed.cid)});put(pid,m);persist()}
      S.cur={pid,cid:ed.cid};
    }else{const c={id:'c'+uid(),oldDates:[],prevRemaining:'',extra:0,payments:[],...d};put(pid,c);persist();S.cur={pid,cid:c.id}}
    $('#frm').close();render();openDet(S.cur.pid,S.cur.cid);toast('تم حفظ العقد');
  };
  setTimeout(()=>{if(!ed)$('#cb_unit input').focus()},50);
}
