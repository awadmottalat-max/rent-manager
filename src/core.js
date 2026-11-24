/* منطق الحساب المشترك (يعمل في المتصفح وفي Node للاختبار) */
(function(root){
const DAY=864e5;
const pd=s=>{if(!s||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const[a,b,c]=s.split('-').map(Number);return Date.UTC(a,b-1,c)};
const iso=t=>new Date(t).toISOString().slice(0,10);
const edate=(t,n)=>{const d=new Date(t),y=d.getUTCFullYear(),m=d.getUTCMonth()+n;return Date.UTC(y,m,Math.min(d.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate()))};
const r2=x=>Math.round((x+Number.EPSILON)*100)/100;
const normU=s=>String(s||'').replace(/\s/g,'').toLowerCase();

function months(c){
  const s=pd(c.start),e=pd(c.end);
  if(s!=null&&e!=null)return e>=s?Math.max(1,Math.round(((e-s)/DAY+1)*12/365.25)):null;
  const t=String(c.period||'').replace(/\s/g,'');if(!t)return null;
  let n=parseInt(t,10);if(isNaN(n))n=(t==='سنتين'||t==='سنتان')?2:1;
  return t.includes('سن')?n*12:t.includes('شه')?n:null;
}
function count(c,m){
  const t=String(c.count??'').trim();if(t==='')return null;let n;
  if(t==='شهري')n=(m!=null&&m<=12)?m:12;
  else if(['واحدة','واحد','سنة','سنه','سنوي'].includes(t))n=1;
  else if(t==='دفعتين'||t==='دفعتان')n=2;
  else{n=Number(t);if(isNaN(n)){const u=t.replace(/عدد|دفعات|\s/g,'');n=u===''?NaN:Number(u)}}
  if(!(m>0&&Number.isFinite(n)&&n>=1&&n===Math.floor(n)&&n<=36))return null;
  const k=m>12?Math.max(1,Math.round(n*m/12)):n;return k>=1&&k<=36?k:null;
}
function calc(c,mode,today){
  const m=months(c),k=count(c,m),s=pd(c.start),e=pd(c.end);
  const rent=(c.rent===''||c.rent==null)?null:Number(c.rent),ok=rent!=null&&isFinite(rent);
  const total=ok?(mode==='annual'&&m>12?rent*m/12:rent):null;
  const inst=[];
  /* دفعات غير متساوية: جدول يدوي (تاريخ + مبلغ) يحل محل التقسيم المتساوي */
  const plan=Array.isArray(c.plan)?c.plan.map(x=>({date:pd(x.date),amount:Number(x.amount)})).filter(x=>x.date!=null&&isFinite(x.amount)&&x.amount>0).sort((a,b)=>a.date-b.date):[];
  if(ok&&plan.length){plan.forEach((x,i)=>inst.push({n:i+1,date:x.date,amount:r2(x.amount)}))}
  else if(ok&&m&&k){
    const M=r2(total/k);
    for(let i=1;i<=k;i++){
      let d=null;
      if(s!=null&&!(e!=null&&e<s)){
        if(e!=null)d=(m%k===0&&Math.abs(edate(s,m)-e-DAY)<=3*DAY)?edate(s,(i-1)*m/k):s+Math.floor(((e-s)/DAY+1)*(i-1)/k)*DAY;
        else if(m%k===0)d=edate(s,(i-1)*m/k);
      }
      inst.push({n:i,date:d,amount:i===k?r2(total-M*(k-1)):M});
    }
  }
  const paid=r2((c.payments||[]).reduce((a,p)=>a+(+p.amount||0),0)+(+c.extra||0));
  let left=paid,late=0,next=null;
  for(const it of inst){
    const p=Math.min(it.amount,Math.max(left,0));left-=p;it.paid=r2(p);
    it.status=p>=it.amount-0.005?'paid':p>0?'partial':'unpaid';
    const open=it.status!=='paid'&&it.date!=null;
    it.late=open&&it.date<today;it.soon=open&&it.date>=today&&it.date<=today+30*DAY;
    if(it.status!=='paid'){const due=r2(it.amount-it.paid);it.due=due;if(it.late)late+=due;if(!next)next=it}
  }
  let st=e==null?'بدون تاريخ نهاية':(s!=null&&e<s)?'تاريخ غير صحيح':e<today?'منتهي':(s!=null&&s>today)?'لم يبدأ':'ساري';
  /* إنهاء مبكر: يُعتبر العقد منتهيًا من تاريخ الإنهاء، ويمكن إسقاط المتبقي (تسوية) */
  const xd=c.exit&&c.exit.date?pd(c.exit.date):null;
  if(xd!=null&&xd<=today&&(e==null||xd<e)&&(st==='ساري'||st==='لم يبدأ'))st='منتهي';
  let waived=0,total2=total;
  if(c.exit&&c.exit.waive&&st==='منتهي'&&total!=null){waived=Math.max(0,r2(total-paid));total2=paid;late=0;for(const it of inst)if(it.status!=='paid'){it.late=false;it.soon=false;it.waived=true}}
  const rem=total2!=null?r2(total2-paid):null;
  const iss=[];
  if(!ok)iss.push('قيمة الإيجار ناقصة');
  if(s==null)iss.push('تاريخ البداية ناقص');
  if(e==null)iss.push('تاريخ النهاية ناقص أو غير صالح');
  if(s!=null&&e!=null&&e<s)iss.push('النهاية قبل البداية');
  if(!k&&!plan.length)iss.push('عدد الأقساط غير صالح');
  if(plan.length&&total!=null&&Math.abs(plan.reduce((a,x)=>a+x.amount,0)-total)>0.01)iss.push('مجموع الدفعات لا يساوي قيمة العقد');
  if(!waived&&rem!=null&&rem<-0.005)iss.push('المسدد أكبر من الإجمالي');
  return{m,k:plan.length||k,plan:plan.length>0,total:total2,paid,rem,waived,inst,late,next,st,iss,M:inst.length?inst[0].amount:null,
    late_n:inst.filter(x=>x.late).length,soon:inst.some(x=>x.soon),
    daysToEnd:e!=null?Math.round((e-today)/DAY):null};
}
/* التجديدات: آخر عقد لكل وحدة، إن انتهى أو سينتهي خلال win يومًا ولا يوجد عقد أحدث */
function renewals(rows,today,win){
  win=win||90;const last={};
  for(const x of rows){
    const e=pd(x.c.end);if(e==null||!x.c.unit)continue;
    const k=x.pid+'|'+normU(x.c.unit);
    if(!last[k]||e>last[k].e)last[k]={x,e};
  }
  return Object.values(last).filter(o=>o.e<=today+win*DAY).map(o=>({...o.x,endT:o.e,days:Math.round((o.e-today)/DAY)}))
    .sort((a,b)=>a.endT-b.endT);
}
/* كشف حساب مالك */
function ownerStatements(rows){
  const O={};
  for(const x of rows){
    const n=String(x.c.owner||'').trim()||'(بدون مالك)';
    const o=O[n]=O[n]||{name:n,contracts:0,active:0,total:0,paid:0,rem:0,late:0,fees:0,units:new Set(),projects:new Set()};
    o.contracts++;if(x.r.st==='ساري')o.active++;
    o.total+=x.r.total||0;o.paid+=x.r.paid||0;o.rem+=x.r.rem>0?x.r.rem:0;o.late+=x.r.late||0;o.fees+=+x.c.fee||0;
    o.units.add(x.pid+'|'+normU(x.c.unit));o.projects.add(x.pn);
  }
  return Object.values(O).map(o=>({...o,units:o.units.size,projects:[...o.projects],net:r2(o.paid-o.fees)})).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
}
/* رسوم إدارة الأملاك (للعقود الخارجية): مربوطة بدفعات الإيجار (افتراضي) أو دفعة واحدة */
function feeCalc(c,r,today){
  const total=Math.max(0,Number(c.fee)||0),inst=[];
  if(total>0){
    if(c.feeMode==='once'||!r.inst.length||!(r.total>0)){inst.push({n:1,date:pd(c.feeDate)??pd(c.start),amount:total})}
    else{let acc=0;r.inst.forEach((i,k)=>{const a=k===r.inst.length-1?r2(total-acc):r2(total*i.amount/r.total);acc=r2(acc+a);inst.push({n:i.n,date:i.date,amount:a})})}
  }
  const paid=r2((c.feePays||[]).reduce((a,p)=>a+(+p.amount||0),0));let left=paid,late=0,lateN=0,next=null;
  for(const it of inst){const p=Math.min(it.amount,Math.max(left,0));left-=p;it.paid=r2(p);it.status=p>=it.amount-0.005?'paid':p>0?'partial':'unpaid';
    it.due=it.status==='paid'?0:r2(it.amount-it.paid);const open=it.status!=='paid'&&it.date!=null;it.late=open&&it.date<today;it.soon=open&&it.date>=today&&it.date<=today+30*DAY;
    if(it.late){late+=it.due;lateN++}if(it.status!=='paid'&&!next)next=it}
  return{total,inst,paid,rem:Math.max(0,r2(total-paid)),late:r2(late),late_n:lateN,next,over:paid>total+0.005?r2(paid-total):0};
}
const api={DAY,pd,iso,edate,r2,normU,months,count,calc,feeCalc,renewals,ownerStatements};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Core=api;
})(typeof window!=='undefined'?window:globalThis);
