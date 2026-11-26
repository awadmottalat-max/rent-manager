/* بحث شامل في أعلى التطبيق: عقود، وحدات، ملاك، مستأجرون، رسوم، صيانة */
'use strict';
(function(){
  const gs=document.getElementById('gs');if(!gs)return;
  const box=document.createElement('div');box.id='gsr';box.hidden=true;gs.parentElement.appendChild(box);
  const nz=s=>String(s==null?'':s).toLowerCase().replace(/[ً-ٟـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').trim();
  const has=(q,...f)=>f.some(x=>nz(x).includes(q));
  function find(raw){
    const q=nz(raw);if(!q)return[];const G=[],push=(t,a)=>{if(a.length)G.push([t,a])},lim=a=>a.slice(0,7);
    const R=rows(),c=R.filter(x=>has(q,x.c.unit,x.c.tenant,x.c.owner,x.pn)).map(x=>({l:'وحدة '+x.c.unit+' — '+(x.c.tenant||'بدون مستأجر'),s:x.pn+(x.ext?' · عقد خارجي':'')+' · '+x.r.st,a:'data-a="open" data-p="'+esc(x.pid)+'" data-c="'+esc(x.c.id)+'"'}));
    push('العقود',lim(c));
    const ow=ownerStatements(R.filter(x=>!x.ext)).filter(o=>has(q,o.name)||has(q,(PR('owners').find(r=>nm(r.name)===o.name)||{}).phone)).map(o=>({l:o.name,s:o.contracts+' عقد · المتبقي '+fm(o.rem),a:'data-a="ownOpen" data-n="'+esc(o.name)+'"'}));
    push('الملاك',lim(ow));
    const tn=PR('tenants').filter(t=>has(q,t.name,t.phone,t.idno)).map(t=>({l:t.name,s:[t.phone,t.idno].filter(Boolean).join(' · ')||'مستأجر',a:'data-a="tenOpen" data-n="'+esc(t.name)+'"'}));
    push('المستأجرون',lim(tn));
    const un=[];for(const[pid,p]of Object.entries(P()))for(const u of p.units||[])if(has(q,u.no,u.owner)&&!R.some(x=>x.pid===pid&&String(x.c.unit)===String(u.no)&&has(q,x.c.unit)))un.push({l:'وحدة '+u.no,s:p.name+' · '+(u.owner||'بدون مالك')+' · غير مؤجرة',a:'data-a="go" data-v="props"'});
    push('وحدات بلا عقود',lim(un));
    push('الرسوم والخدمات',lim((S.db.svc||[]).filter(x=>has(q,x.unit,x.name,x.type)).map(x=>({l:'وحدة '+x.unit+' — '+(x.type||'رسم'),s:((P()[x.pid]||{}).name||'')+' · '+(x.year||''),a:'data-a="svOpen" data-i="'+esc(x.id)+'"'}))));
    push('الصيانة والنظافة',lim((S.db.mreq||[]).filter(x=>has(q,x.unit,x.cat,x.no,x.vendor)).map(x=>({l:'وحدة '+x.unit+' — '+(x.cat||'طلب'),s:((P()[x.pid]||{}).name||'')+' · '+(MT_STL[x.status]||''),a:'data-a="mtOpen" data-i="'+esc(x.id)+'"'}))));
    return G;
  }
  function show(){
    const v=gs.value.trim();if(!v){box.hidden=true;return}
    const G=find(v);
    box.innerHTML=G.length?G.map(([t,a])=>'<h6>'+t+'</h6>'+a.map(i=>'<button '+i.a+'><b>'+esc(i.l)+'</b><span>'+esc(i.s)+'</span></button>').join('')).join(''):'<p>لا توجد نتائج</p>';
    box.hidden=false;
  }
  gs.addEventListener('input',show);gs.addEventListener('focus',show);
  gs.addEventListener('keydown',e=>{if(e.key==='Escape'){box.hidden=true;gs.blur()}else if(e.key==='Enter'){const b=box.querySelector('button');if(b&&!box.hidden){e.stopImmediatePropagation();b.click();gs.value='';box.hidden=true;gs.blur()}}},true);
  box.addEventListener('click',()=>{setTimeout(()=>{box.hidden=true;gs.value=''},0)});
  document.addEventListener('click',e=>{if(!e.target.closest('.gs'))box.hidden=true});
})();
