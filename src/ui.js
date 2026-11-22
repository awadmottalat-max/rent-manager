/* مكوّنات مشتركة: حقل تاريخ (يوم / شهر / سنة) والمرفقات */
'use strict';
const MN=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const dg=s=>String(s).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/\D/g,'');
function dateField(id,v,cls){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||''),y=m?m[1]:'',mo=m?+m[2]:0,d=m?+m[3]:'';
  return `<span class="dtf" data-dt="${id}"><input type="hidden" id="${id}" class="${cls||''}" value="${m?v:''}" data-last="${m?v:''}"><input class="dtd" inputmode="numeric" maxlength="2" placeholder="يوم" value="${d}" aria-label="اليوم"><select class="dtm" aria-label="الشهر"><option value="">الشهر</option>${MN.map((n,i)=>`<option value="${i+1}"${mo===i+1?' selected':''}>${i+1} · ${n}</option>`).join('')}</select><input class="dty" inputmode="numeric" maxlength="4" placeholder="السنة" value="${y}" aria-label="السنة"><button type="button" class="dtt" tabindex="-1" title="اليوم">اليوم</button></span>`;
}
function setDate(id,v){
  const w=document.querySelector(`[data-dt="${id}"]`);if(!w)return;
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||''),h=w.querySelector('input[type=hidden]');
  w.querySelector('.dtd').value=m?+m[3]:'';w.querySelector('.dtm').value=m?String(+m[2]):'';w.querySelector('.dty').value=m?m[1]:'';
  h.value=m?v:'';h.dataset.last=h.value;w.classList.remove('bad');
}
function dtRead(w){
  const d=w.querySelector('.dtd').value.trim(),m=w.querySelector('.dtm').value,y=w.querySelector('.dty').value.trim();
  if(!d&&!m&&!y)return{v:'',ok:true};
  if(!d||!m||y.length<4)return{v:'',ok:false};
  const D=+d,M=+m,Y=+y,t=new Date(Date.UTC(Y,M-1,D));
  const ok=D>=1&&Y>=1990&&Y<=2200&&t.getUTCFullYear()===Y&&t.getUTCMonth()===M-1&&t.getUTCDate()===D;
  return ok?{v:`${y}-${String(M).padStart(2,'0')}-${String(D).padStart(2,'0')}`,ok:true}:{v:'',ok:false};
}
function dtSync(w,commit){
  const y=w.querySelector('.dty');
  if(commit&&y.value.length===2)y.value='20'+y.value;
  const r=dtRead(w),h=w.querySelector('input[type=hidden]');h.value=r.v;
  if(commit){w.classList.toggle('bad',!r.ok);
    if(h.value!==h.dataset.last){h.dataset.last=h.value;h.dispatchEvent(new Event('input',{bubbles:true}));h.dispatchEvent(new Event('change',{bubbles:true}))}}
}
document.addEventListener('input',e=>{const t=e.target;if(!t.classList||!(t.classList.contains('dtd')||t.classList.contains('dty')))return;
  const w=t.closest('.dtf'),n=dg(t.value).slice(0,t.classList.contains('dtd')?2:4);if(t.value!==n)t.value=n;
  dtSync(w,false);
  if(t.classList.contains('dtd')&&(n.length===2||(n.length===1&&+n>3)))w.querySelector('.dtm').focus()});
document.addEventListener('change',e=>{const t=e.target;if(t.classList?.contains('dtm')){const w=t.closest('.dtf');dtSync(w,true);if(t.value&&!w.querySelector('.dty').value)w.querySelector('.dty').focus()}});
document.addEventListener('focusout',e=>{const w=e.target.closest?.('.dtf');if(w&&!w.contains(e.relatedTarget))dtSync(w,true)});
document.addEventListener('focusin',e=>{if(e.target.classList?.contains('dtd')||e.target.classList?.contains('dty'))setTimeout(()=>e.target.select(),0)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList?.contains('dtf')===false&&e.target.closest?.('.dtf')&&!e.ctrlKey){e.preventDefault();dtSync(e.target.closest('.dtf'),true)}});
document.addEventListener('click',e=>{const b=e.target.closest?.('.dtt');if(!b)return;const w=b.closest('.dtf'),n=new Date(),p=x=>String(x).padStart(2,'0');
  setDate(w.dataset.dt,`${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}`);const h=w.querySelector('input[type=hidden]');h.dataset.last='';dtSync(w,true)});

/* ---------- المرفقات ---------- */
const ATT={reg:{},dlg:null};
const fsz=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const attChips=(list,key)=>list.length?list.map((f,i)=>`<span class="ach"><button type="button" class="al" data-a="attOpen" data-f="${esc(f.f)}" title="فتح الملف">📎 ${esc(f.name)} <small>${fsz(f.size||0)}</small></button><button type="button" class="ax" data-a="attRm" data-k="${esc(key)}" data-i="${i}" aria-label="إزالة" title="إزالة">✕</button></span>`).join(''):'<span class="sub">لا توجد مرفقات</span>';
function attField(key,files){
  ATT.reg[key]={list:[...(files||[])],added:[],removed:[]};
  return `<div class="att" id="att_${key}"><div class="achs">${attChips(ATT.reg[key].list,key)}</div><button type="button" class="btn sm" data-a="attAdd" data-k="${key}">+ إرفاق ملفات</button></div>`;
}
const attGet=key=>ATT.reg[key]?[...ATT.reg[key].list]:[];
const attRender=key=>{const el=document.querySelector('#att_'+key+' .achs');if(el)el.innerHTML=attChips(ATT.reg[key].list,key)};
function attCommit(){for(const k in ATT.reg)for(const f of ATT.reg[k].removed)native.attDel(f.f);ATT.reg={}}
function attDiscard(){for(const k in ATT.reg)for(const f of ATT.reg[k].added)native.attDel(f.f);ATT.reg={}}
document.getElementById('frm').addEventListener('close',()=>{attDiscard();ATT.dlg=null});
/* مرفقات كيان محفوظ (عقد، دفعة…) تُدار مباشرة */
function attDlg(title,getEnt){
  const e=getEnt();if(!e)return;ATT.dlg={getEnt,title};
  const paint=()=>{const e=getEnt();const L=e.files||[];
    $('#frm').innerHTML=`<div class="dh"><h2>المرفقات — ${esc(title)}</h2><button class="x" data-a="fclose" aria-label="إغلاق">✕</button></div>
<div class="fg"><div class="full">${L.length?`<table class="t"><thead><tr><th>الملف</th><th>الحجم</th><th>التاريخ</th><th></th></tr></thead><tbody>${L.map((f,i)=>`<tr><td><b>${esc(f.name)}</b></td><td>${fsz(f.size||0)}</td><td>${esc(f.added||'')}</td><td><button class="btn sm" data-a="attOpen" data-f="${esc(f.f)}">فتح</button> <button class="btn sm dng" data-a="attRmD" data-i="${i}">حذف</button></td></tr>`).join('')}</tbody></table>`:'<p class="empty">لا توجد مرفقات بعد. أرفق العقد الموقّع، الهوية، السجل التجاري، إيصال الحوالة، أو أي مستند داعم.</p>'}</div></div>
<div class="ft"><button class="btn p" data-a="attAddD">+ إرفاق ملفات</button><button class="btn" data-a="fclose">إغلاق</button></div>`};
  ATT.paint=paint;paint();if(!$('#frm').open)$('#frm').showModal();
}
const attAfter=()=>{persist();ATT.paint&&ATT.paint();if($('#det').open&&typeof fillDet==='function')fillDet();render()};
Object.assign(act,{
  attAdd:async b=>{const s=ATT.reg[b.dataset.k];if(!s)return;const L=await native.attAdd();for(const f of L){s.list.push(f);s.added.push(f)}attRender(b.dataset.k)},
  attRm:b=>{const k=b.dataset.k,s=ATT.reg[k],i=+b.dataset.i,f=s.list[i];if(!f)return;s.list.splice(i,1);
    const j=s.added.indexOf(f);if(j>=0){s.added.splice(j,1);native.attDel(f.f)}else s.removed.push(f);attRender(k)},
  attOpen:async b=>{const r=await native.attOpen(b.dataset.f);if(r)toast(r)},
  attAddD:async()=>{const e=ATT.dlg?.getEnt();if(!e)return;const L=await native.attAdd();if(!L.length)return;e.files=[...(e.files||[]),...L];attAfter();toast('أُضيف '+L.length+' مرفق')},
  attRmD:b=>arm(b,()=>{const e=ATT.dlg?.getEnt();if(!e)return;const f=(e.files||[])[+b.dataset.i];if(!f)return;e.files=e.files.filter(x=>x!==f);native.attDel(f.f);attAfter()}),
  attDir:()=>native.attDir(),
  conAtt:()=>{const x=cur();if(x)attDlg('العقد — وحدة '+x.c.unit,()=>cur()?.c)},
  payAtt:b=>{const x=cur();if(x)attDlg('دفعة '+(x.c.payments.find(p=>p.id===b.dataset.i)?.rno||''),()=>cur()?.c.payments.find(p=>p.id===b.dataset.i))}
});
