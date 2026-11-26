/* تخصيص لوحة التحكم: يختار كل مستخدم البطاقات والأقسام التي تهمه (تُحفظ على جهازه) */
'use strict';
(function(){
  const key=()=>'dashHide:'+((S.cl&&S.cl.on&&S.cl.email)||'local');
  const get=()=>{try{return JSON.parse(localStorage.getItem(key())||'[]')}catch{return[]}};
  const set=a=>{try{localStorage.setItem(key(),JSON.stringify(a))}catch{}};
  const items=()=>{
    const v=document.getElementById('view'),o=[];
    v.querySelectorAll('.kpis.dk .kp').forEach(e=>o.push([e,'بطاقة: '+(e.querySelector('span')||{}).textContent]));
    v.querySelectorAll(':scope > .sec, :scope > .card').forEach(e=>{const h=e.querySelector('h3');if(h)o.push([e,'قسم: '+h.textContent.trim()])});
    return o;
  };
  function apply(){
    if(S.view!=='dash')return;const hid=get(),I=items();
    I.forEach(([e,l])=>{e.style.display=hid.includes(l)?'none':''});
    const hero=document.querySelector('#view .hero');
    if(hero&&!hero.querySelector('.dcb')){const b=document.createElement('button');b.className='btn sm dcb';b.dataset.a='dcCfg';b.textContent='⚙ تخصيص اللوحة';hero.appendChild(b)}
  }
  const r0=render;
  render=function(){r0.apply(this,arguments);try{apply()}catch(e){}};
  Object.assign(act,{
    dcCfg:()=>{
      const hid=get(),I=items(),f=$('#frm');
      f.innerHTML=`<div class="dh"><h2>تخصيص لوحة التحكم</h2><button class="x" data-a="fclose" aria-label="إغلاق">✕</button></div><div class="fg"><div class="full remi">اختر ما تريد إظهاره في لوحتك. يُحفظ الاختيار لحسابك على هذا الجهاز فقط.</div>${I.map(([,l],i)=>`<label class="full" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-dc="${i}"${hid.includes(l)?'':' checked'}> ${esc(l)}</label>`).join('')}</div><div class="ft"><button class="btn p" id="dcSave">حفظ</button><button class="btn" id="dcAll">إظهار الكل</button><button class="btn" data-a="fclose">إلغاء</button></div>`;
      f.showModal();
      $('#dcSave').onclick=()=>{set(I.filter((_,i)=>!f.querySelector('[data-dc="'+i+'"]').checked).map(x=>x[1]));f.close();apply()};
      $('#dcAll').onclick=()=>{set([]);f.close();apply()};
    }
  });
})();
