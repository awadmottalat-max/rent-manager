/* لمسات الفخامة: التاريخ، البحث السريع، شاشة البداية */
'use strict';
(function(){
  const f=(loc,o)=>{try{return new Intl.DateTimeFormat(loc,o).format(new Date())}catch{return''}};
  const dt=document.getElementById('dt');
  const paint=()=>{const en=window.LANG==='en';if(dt)dt.innerHTML='<b>'+f(en?'en-US':'ar-SA-u-ca-gregory-nu-latn',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</b><span>'+f(en?'en-US-u-ca-islamic-umalqura-nu-latn':'ar-SA-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'})+'</span>'};paint();document.addEventListener('langchange',paint);
  const gs=document.getElementById('gs');
  if(gs)gs.addEventListener('keydown',e=>{if(e.key!=='Enter')return;S.f={p:'',q:gs.value.trim(),s:''};go('contracts');gs.value='';gs.blur()});
  const Q=[['عقد إيجار جديد','file',()=>contractForm(false)],['مشروع جديد','building',()=>projForm(null)],['مالك جديد','users',()=>partyForm('owners','')],['مستأجر جديد','users',()=>partyForm('tenants','')],['اتفاقية تأجير','sign',()=>agrForm(null)],['تحليل مالي','calc',()=>anForm(null)]];
  const qm=document.getElementById('qm'),qb=document.getElementById('qab');
  if(qm&&qb){qm.innerHTML=Q.map((q,i)=>`<button data-q="${i}">${ico(q[1])}<span>${q[0]}</span></button>`).join('');
    qb.addEventListener('click',e=>{e.stopPropagation();qm.hidden=!qm.hidden});
    qm.addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b)return;qm.hidden=true;Q[+b.dataset.q][2]()});
    document.addEventListener('click',()=>{qm.hidden=true})}
  document.addEventListener('keydown',e=>{const t=e.target,typing=/INPUT|TEXTAREA|SELECT/.test(t.tagName);
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();gs&&gs.focus()}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'&&!document.querySelector('dialog[open]')){e.preventDefault();contractForm(false)}});
  const sp=document.getElementById('splash'),v=document.getElementById('view');
  const hide=()=>{if(!sp)return;sp.classList.add('off');setTimeout(()=>sp.remove(),450)};
  if(v&&v.children.length)setTimeout(hide,250);else new MutationObserver((_m,o)=>{if(v.children.length){o.disconnect();setTimeout(hide,250)}}).observe(v,{childList:true,subtree:true});
  setTimeout(hide,4000);
})();
