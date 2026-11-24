/* اللغة الإنجليزية: ترجمة فعلية للواجهة عبر قاموس عبارات + مراقب DOM (بدون المساس بمنطق التطبيق) */
'use strict';
(function(){
  const D=window.I18N_EN||{},AR=/[؀-ۿ]/;
  let LANG='ar';try{LANG=localStorage.getItem('lang')==='en'?'en':'ar'}catch{}
  window.LANG=LANG;
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const keys=Object.keys(D).sort((a,b)=>b.length-a.length);
  const AMB=new Set(['على','من','في','إلى','أو','لا','قبل','بعد','نعم','عقد']);
  const multi=keys.filter(k=>/\s/.test(k)),single=keys.filter(k=>!/\s/.test(k)&&!AMB.has(k)),amb=keys.filter(k=>AMB.has(k));
  const reM=multi.length?new RegExp(multi.map(esc).join('|'),'g'):null;
  const reS=single.length?new RegExp('(?<![\\u0600-\\u06FF])(?:'+single.map(esc).join('|')+')(?![\\u0600-\\u06FF])','g'):null;
  const reA=amb.length?new RegExp('(?<![\\u0600-\\u06FF])(?:'+amb.map(esc).join('|')+')(?![\\u0600-\\u06FF])','g'):null;
  const PAT=[[/قبل (\d+) يومًا/g,'$1 days ago'],[/انتهى منذ (\d+) يوم/g,'Ended $1 days ago'],[/متأخر (\d+) يومًا/g,'Overdue by $1 days'],[/بعد (\d+) يوم/g,'In $1 days']];
  function tr(s){
    if(LANG!=='en'||!s||typeof s!=='string'||!AR.test(s))return s;
    const t=s.trim();if(D[t]!==undefined)return s.replace(t,D[t]);
    let r=s;for(const[p,v]of PAT)r=r.replace(p,v);
    if(reM)r=r.replace(reM,m=>D[m]);if(reS)r=r.replace(reS,m=>D[m]);if(reA&&/\d/.test(s))r=r.replace(reA,m=>D[m]);
    return r.replace(/،/g,',').replace(/؟/g,'?');
  }
  window.tr=tr;
  /* ترجمة نص HTML كامل (للطباعة والتصدير) */
  window.trHtml=h=>LANG==='en'?tr(h):h;
  const ATTR=['placeholder','title','aria-label','alt'],ORIG=new WeakMap();let busy=false,obs=null;
  const skip=n=>{const p=n.nodeType===3?n.parentNode:n;return !p||p.closest&&p.closest('script,style,[data-noi18n]')};
  function textNode(n){
    const v=n.nodeValue;if(!v||!AR.test(v)||skip(n))return;
    const o=ORIG.has(n)&&ORIG.get(n).en===v?ORIG.get(n).ar:v,t=tr(o);
    if(t!==v){ORIG.set(n,{ar:o,en:t});n.nodeValue=t}
  }
  function attrs(el){
    for(const a of ATTR){if(!el.hasAttribute||!el.hasAttribute(a))continue;const v=el.getAttribute(a);if(!AR.test(v)||skip(el))continue;
      const k='data-ar-'+a;if(!el.hasAttribute(k)||el.getAttribute(a)!==tr(el.getAttribute(k)))el.setAttribute(k,v);const t=tr(el.getAttribute(k));if(t!==v)el.setAttribute(a,t)}
  }
  function apply(root){
    if(LANG!=='en')return;root=root||document.body;busy=true;
    try{
      if(root.nodeType===3){textNode(root)}
      else{
        const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())textNode(n);
        if(root.nodeType===1){attrs(root)}
        (root.querySelectorAll?root.querySelectorAll('[placeholder],[title],[aria-label],[alt]'):[]).forEach(attrs);
      }
    }finally{busy=false}
  }
  window.i18nApply=apply;
  function restore(){
    busy=true;try{
      const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const o=ORIG.get(n);if(o&&n.nodeValue===o.en)n.nodeValue=o.ar;ORIG.delete(n)}
      document.querySelectorAll('[data-ar-placeholder],[data-ar-title],[data-ar-aria-label],[data-ar-alt]').forEach(el=>{for(const a of ATTR){const k='data-ar-'+a;if(el.hasAttribute(k)){el.setAttribute(a,el.getAttribute(k));el.removeAttribute(k)}}});
    }finally{busy=false}
  }
  function title(){document.title=LANG==='en'?'Kathib | Rent Tracking & Property Management':'كثيب | متابعة الإيجارات وإدارة الأملاك'}
  function setDir(){const h=document.documentElement;h.lang=LANG;h.dir=LANG==='en'?'ltr':'rtl';const b=document.getElementById('lg');if(b)b.textContent=LANG==='en'?'عربي':'EN'}
  function start(){
    setDir();title();
    obs=new MutationObserver(recs=>{
      if(busy||LANG!=='en')return;busy=true;
      try{for(const r of recs){
        if(r.type==='characterData')textNode(r.target);
        else if(r.type==='attributes'){if(ATTR.includes(r.attributeName)&&r.target.hasAttribute('data-ar-'+r.attributeName)===false)attrs(r.target)}
        else r.addedNodes.forEach(n=>{if(n.nodeType===3)textNode(n);else if(n.nodeType===1){const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);let t;while(t=w.nextNode())textNode(t);attrs(n);n.querySelectorAll&&n.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(attrs)}})}
      }finally{busy=false}
    });
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
    apply();
  }
  window.setLang=function(l){
    LANG=l==='en'?'en':'ar';window.LANG=LANG;try{localStorage.setItem('lang',LANG)}catch{}
    setDir();title();
    if(LANG==='en'){apply()}else{restore()}
    if(typeof render==='function')render();
    if(LANG==='en')apply();
    document.dispatchEvent(new Event('langchange'));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
