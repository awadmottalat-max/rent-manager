/* لمسات الفخامة: التاريخ، البحث السريع، شاشة البداية */
'use strict';
(function(){
  const f=(loc,o)=>{try{return new Intl.DateTimeFormat(loc,o).format(new Date())}catch{return''}};
  const dt=document.getElementById('dt');
  if(dt)dt.innerHTML='<b>'+f('ar-SA-u-ca-gregory-nu-latn',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</b><span>'+f('ar-SA-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'})+'</span>';
  const gs=document.getElementById('gs');
  if(gs)gs.addEventListener('keydown',e=>{if(e.key!=='Enter')return;S.f={p:'',q:gs.value.trim(),s:''};go('contracts');gs.value='';gs.blur()});
  const sp=document.getElementById('splash'),v=document.getElementById('view');
  const hide=()=>{if(!sp)return;sp.classList.add('off');setTimeout(()=>sp.remove(),450)};
  if(v&&v.children.length)setTimeout(hide,250);else new MutationObserver((_m,o)=>{if(v.children.length){o.disconnect();setTimeout(hide,250)}}).observe(v,{childList:true,subtree:true});
  setTimeout(hide,4000);
})();
