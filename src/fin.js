/* الحسابات المالية: الاتفاقية، التحليل المالي، التفقيط (يعمل في المتصفح وNode) */
(function(root){
const r2=x=>Math.round((x+Number.EPSILON)*100)/100;
const num=v=>{const n=Number(v);return isFinite(n)?n:0};
const has=v=>v!==''&&v!=null&&isFinite(Number(v));

/* مبلغ رسوم إدارة الأملاك: نسبة من الأساس أو مبلغ مقطوع (بدون ضريبة) */
function mgmtAmount(m,base){m=m||{};return m.type==='fixed'?r2(num(m.value)):r2(base*num(m.value)/100)}

/* الاتفاقية: توزيع رسوم الإدارة ورسوم العقد على الدفعات */
function agrCalc(a,vat){
  const rate=num(vat)/100,annual=num(a.annualRent);
  const mgmtEx=mgmtAmount(a.mgmt,annual);
  const mgmtVatOn=a.mgmtVat!==false,mgmtVat=mgmtVatOn?r2(mgmtEx*rate):0;
  const f=a.fee||{},feeEx=r2(num(f.amount)),feeVatOn=f.vat!==false,feeVat=feeVatOn?r2(feeEx*rate):0;
  const ins=(a.inst||[]).map((x,i)=>({n:i+1,date:x.date||'',amount:r2(num(x.amount)),mg:!!x.mg,mshare:x.mshare}));
  const sel=ins.filter(x=>x.mg);
  // توزيع رسوم الإدارة (قبل الضريبة)
  let allocated=0;
  sel.forEach((x,k)=>{
    let v;
    if(a.mgmtAlloc==='manual')v=r2(num(x.mshare));
    else v=k===sel.length-1?r2(mgmtEx-allocated):r2(mgmtEx/sel.length);
    x.mgEx=v;allocated=r2(allocated+v);
  });
  let vatAlloc=0;
  sel.forEach((x,k)=>{x.mgVat=!mgmtVatOn?0:(k===sel.length-1?r2(mgmtVat-vatAlloc):r2(x.mgEx*rate));vatAlloc=r2(vatAlloc+x.mgVat)});
  const at=Math.round(num(f.at))||1,feeCompany=f.mode==='company';
  for(const x of ins){
    x.mgEx=x.mgEx||0;x.mgVat=x.mgVat||0;
    x.feeEx=feeCompany&&x.n===at?feeEx:0;x.feeVat=feeCompany&&x.n===at?feeVat:0;
    x.ded=r2(x.mgEx+x.mgVat+x.feeEx+x.feeVat);x.net=r2(x.amount-x.ded);
  }
  const sum=k=>r2(ins.reduce((s,x)=>s+x[k],0));
  const warn=[];
  if(a.mgmtAlloc==='manual'&&sel.length&&Math.abs(allocated-mgmtEx)>0.005)warn.push('مجموع توزيع رسوم الإدارة ('+allocated+') لا يساوي رسوم الإدارة ('+mgmtEx+')');
  if(mgmtEx>0&&!sel.length)warn.push('حدّد الدفعات التي تُخصم منها رسوم الإدارة');
  if(ins.length&&Math.abs(sum('amount')-annual)>0.005)warn.push('مجموع الدفعات ('+sum('amount')+') لا يساوي الإيجار السنوي ('+annual+')');
  if(feeCompany&&feeEx>0&&!(at>=1&&at<=ins.length))warn.push('رقم الدفعة التي تُخصم منها رسوم العقد غير صحيح');
  return{mgmtEx,mgmtVat,mgmtTotal:r2(mgmtEx+mgmtVat),feeEx,feeVat,feeTotal:r2(feeEx+feeVat),feeCompany,rows:ins,
    totals:{amount:sum('amount'),mgEx:sum('mgEx'),mgVat:sum('mgVat'),feeEx:sum('feeEx'),feeVat:sum('feeVat'),ded:sum('ded'),net:sum('net')},warn};
}

/* التحليل المالي لدفعة إيجار: الضريبة على إدارة الأملاك والخدمات ورسوم العقد فقط */
const ANA_LINES=[['service','رسوم الخدمات',1],['mgmt','إدارة الأملاك',1],['contract','رسوم عقد الإيجار',1],['prev','مبالغ سابقة',0],['maint','صيانة',0],['clean','نظافة',0],['elec','كهرباء',0],['net','إنترنت',0],['other','أخرى',0]];
function anaCalc(a,vat){
  const rate=num(vat)/100,pay=num(a.payment);
  const mgmtAuto=mgmtAmount(a.mgmt,(a.mgmt&&a.mgmt.base==='payment')?pay:num(a.annualRent));
  const mgmt=a.mgmtManual&&has(a.mgmtAmt)?r2(num(a.mgmtAmt)):mgmtAuto;
  const L={service:r2(num(a.service)),mgmt,contract:r2(num(a.contract)),prev:r2(num(a.prev)),maint:r2(num(a.maint)),clean:r2(num(a.clean)),elec:r2(num(a.elec)),net:r2(num(a.net)),other:r2(num(a.other))};
  const taxBase=r2(L.service+L.mgmt+L.contract);
  const vatAuto=r2(taxBase*rate),vatAmt=a.vatManual&&has(a.vatAmt)?r2(num(a.vatAmt)):vatAuto;
  const nonTax=r2(L.prev+L.maint+L.clean+L.elec+L.net+L.other);
  const totalDed=r2(taxBase+vatAmt+nonTax);
  return{lines:L,mgmtAuto,taxBase,vatAuto,vat:vatAmt,nonTax,totalDed,netOwner:r2(pay-totalDed),payment:pay,over:totalDed>pay+0.005};
}

/* التفقيط بالعربية */
const ONES=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
const TENS=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
const HUND=['','مائة','مائتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
function under1000(n){
  const h=Math.floor(n/100),r=n%100,p=[];
  if(h)p.push(HUND[h]);
  if(r){if(r<20)p.push(ONES[r]);else{const o=r%10,t=Math.floor(r/10);p.push(o?ONES[o]+' و'+TENS[t]:TENS[t])}}
  return p.join(' و');
}
function words(n){
  if(n===0)return 'صفر';
  const sc=[[1e9,'مليار','ملياران','مليارات'],[1e6,'مليون','مليونان','ملايين'],[1e3,'ألف','ألفان','آلاف']],parts=[];
  for(const[v,one,two,many]of sc){
    const g=Math.floor(n/v);n%=v;if(!g)continue;
    parts.push(g===1?one:g===2?two:g<=10?under1000(g)+' '+many:under1000(g)+' '+one);
  }
  if(n)parts.push(under1000(n));
  return parts.join(' و');
}
function tafqeet(v,cur){
  cur=cur||{big:'ريال سعودي',small:'هللة'};
  const n=Math.round(num(v)*100),big=Math.floor(n/100),small=n%100;
  return 'فقط '+words(big)+' '+cur.big+(small?' و'+words(small)+' '+cur.small:'')+' لا غير';
}
const api={r2,num,mgmtAmount,agrCalc,anaCalc,ANA_LINES,tafqeet,words};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Fin=api;
})(typeof window!=='undefined'?window:globalThis);
