/* استيراد/تصدير نموذج الإدخال (ورقه المعالجة) */
(function(root){
const C=typeof require!=='undefined'?require('./core.js'):root.Core;
const {iso,r2,normU,pd,calc,edate}=C;
let _n=0;const uid=()=>Date.now().toString(36)+(_n++).toString(36)+Math.random().toString(36).slice(2,6);
const tx=v=>v==null?'':String(v).replace(/\s+/g,' ').trim();
const nm=v=>typeof v==='number'?v:'';
const sd=v=>typeof v==='number'&&v>20000&&v<80000?iso(Math.round((v-25569)*864e5)):'';
const ukey=k=>normU(k.unit)+'|'+normU(k.tenant);
const skey=k=>ukey(k)+'|'+(k.start||'');

function parseWb(XLSX,wb){
  const sn=wb.Sheets['ورقه المعالجة']?'ورقه المعالجة':wb.SheetNames[0],ws=wb.Sheets[sn];
  const R=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null}),D=XLSX.utils.decode_col,P={};let n=0;
  for(const r of R){
    const b=tx(r[1]);if(!b||b.length>40||b==='اسم المشروع'||b==='رقم المشروع')continue;
    const unit=tx(r[3]),tenant=tx(r[5]);if(!unit&&!tenant)continue;
    let notes=tx(r[D('CU')]);const eraw=r[9];
    if(typeof eraw==='string'&&tx(eraw))notes=(notes?notes+' | ':'')+'تاريخ النهاية الأصلي في الملف: '+tx(eraw);
    const pays=[];for(let i=D('CV');i<=D('DG');i++)if(typeof r[i]==='number'&&r[i]!==0)pays.push({id:'i'+uid(),date:'',amount:Math.round(r[i]*1e4)/1e4,note:''});
    const L=r[11],od=[];for(let i=D('CI');i<=D('CT');i++){const d=sd(r[i]);if(d)od.push(d)}
    const p=P[b]=P[b]||{no:'',contracts:[]};if(!p.no&&r[2]!=null)p.no=tx(r[2]);
    p.contracts.push({id:'c'+uid(),unit,owner:tx(r[4]),tenant,rent:nm(r[6]),fee:nm(r[7]),start:sd(r[8]),end:sd(r[9]),period:tx(r[10]),count:typeof L==='number'?L:tx(L),notes,prevRemaining:nm(r[D('CH')]),oldDates:od,extra:nm(r[D('DK')])||0,payments:pays});n++;
  }
  // ورقة «الدفعات» (من تصدير التطبيق): مرجع كامل للدفعات بتواريخها
  const pw=wb.Sheets['الدفعات'];let authN=0;
  if(pw){
    const PR=XLSX.utils.sheet_to_json(pw,{header:1,raw:true,defval:null});
    const by={};
    for(const r of PR.slice(1)){
      const a=Number(r[4]);if(!(a>0)&&a!==0)continue;if(!(a>0))continue;
      const k=tx(r[0])+'|'+normU(r[1])+'|'+normU(r[2])+'|'+tx(r[3]);
      (by[k]=by[k]||[]).push({id:'i'+uid(),date:typeof r[5]==='number'?sd(r[5]):tx(r[5]),amount:Math.round(a*1e4)/1e4,note:tx(r[6])});
    }
    for(const[b,p]of Object.entries(P))for(const c of p.contracts){
      const k=b+'|'+normU(c.unit)+'|'+normU(c.tenant)+'|'+(c.start||'');
      c.payAuth=true;c.payments=by[k]||[];if(by[k])authN++;
    }
  }
  return{P,n,sn,authN};
}
/* دمج: يطابق العقد بالوحدة+المستأجر+البداية، ثم احتياطيًا بالوحدة+المستأجر إن كان المرشح وحيدًا */
function applyImp(S_projects,imp,mode){
  const next={};if(mode==='merge')for(const[k,p]of Object.entries(S_projects))next[k]=structuredClone(p);
  const stats={updated:0,added:0},IP=structuredClone(imp.P);
  for(const[name,ip]of Object.entries(IP)){
    let pid=Object.keys(next).find(k=>next[k].name===name);
    if(!pid){const o=Object.keys(S_projects).find(k=>S_projects[k].name===name);if(o){pid=o;next[pid]={...structuredClone(S_projects[o]),contracts:[]}}}
    if(!pid)pid='p'+uid();if(!next[pid])next[pid]={name,no:ip.no,contracts:[],units:[]};
    const T=next[pid];if(!T.no)T.no=ip.no;if(!T.units)T.units=[];
    const claimed=new Set();
    const fileKeys={};for(const c of ip.contracts)fileKeys[ukey(c)]=(fileKeys[ukey(c)]||0)+1;
    for(const c of ip.contracts){
      let old=null;
      if(mode==='merge'){
        old=T.contracts.find(o=>!claimed.has(o.id)&&skey(o)===skey(c));
        if(!old&&fileKeys[ukey(c)]===1){const cand=T.contracts.filter(o=>!claimed.has(o.id)&&ukey(o)===ukey(c));if(cand.length===1)old=cand[0]}
      }
      if(old){
        claimed.add(old.id);
        let pays;
        if(c.payAuth)pays=c.payments;
        else{
          const dated=(old.payments||[]).filter(p=>p.date),pool=[...c.payments];
          for(const d of dated){const i=pool.findIndex(p=>Math.abs(p.amount-d.amount)<0.005);if(i>=0)pool.splice(i,1)}
          pays=[...pool,...dated];
        }
        const keep={notes:old.notes};
        Object.assign(old,c,{id:old.id,payments:pays});delete old.payAuth;
        if(!c.notes&&keep.notes)old.notes=keep.notes;
        stats.updated++;
      }else{delete c.payAuth;T.contracts.push(c);stats.added++}
      ensureUnit(T,c);
    }
  }
  return{next,stats};
}
function ensureUnit(p,c){
  if(!c.unit)return;p.units=p.units||[];
  const k=normU(c.unit);let u=p.units.find(u=>normU(u.no)===k);
  if(!u){p.units.push({id:'u'+uid(),no:c.unit,owner:c.owner||'',type:'',area:'',notes:''})}
  else if(!u.owner&&c.owner)u.owner=c.owner;
}
/* ----- التصدير بنفس تخطيط ورقة المعالجة ----- */
const HEAD=['اسم المشروع','رقم المشروع','رقم الوحدة','اسم المالك','اسم المستأجر','قيمة الإيجار','رسوم الاملاك','بداية الإيجار','نهاية الإيجار','الإيجار','عدد الأقساط','مبلغ الايجار'];
function buildWorkbook(XLSX,projects,mode,today,includeData=true){
  const D=XLSX.utils.decode_col,W=D('DO')+1,ser=s=>{const t=pd(s);return t==null?null:t/864e5+25569};
  const r1=Array(W).fill(null),r2_=Array(W).fill(null);
  HEAD.forEach((h,i)=>{r2_[i+1]=h;r1[i+1]=h});r1[8]='تاريخ الإيجار';r1[10]='فترة';r1[12]='دفعة الايجار';
  r1[13]='الدفعات المستحقة - مبالغ محسوبة';r1[D('AX')]='تواريخ استحقاق الدفعات - محسوبة من بداية الإيجار';
  r1[D('CH')]='المتبقي المسجل قبل التعديل';r1[D('CI')]='تواريخ مسجلة سابقا - محفوظة للمراجعة';r1[D('CU')]='الملاحظات';r1[D('CV')]='سدادات الإيجار المسجلة';
  r1[D('DH')]='مدة العقد بالأشهر للحساب';r1[D('DI')]='إجمالي عدد الأقساط المحسوب';r1[D('DJ')]='إجمالي السدادات المسجلة في CV:DG';r1[D('DK')]='سداد إضافي بعد التعديل - إدخال يدوي';r1[D('DL')]='إجمالي السداد المحسوب';r1[D('DM')]='ملاحظات الحساب والمدخلات';r1[D('DN')]='المتبقي من مبلغ الإيجار';r1[D('DO')]='حالة العقد والتجديد';
  r2_[12]='مبلغ الايجار';
  for(let i=1;i<=36;i++){r2_[12+i]='مبلغ الدفعة '+i;r2_[D('AX')+i-1]='تاريخ الدفعة '+i}
  ['الدفعة الأولي','الدفعة الثانيه','الدفعة الثالثة','الدفعة الرابعة','الدفعة الخامسة','الدفعة السادسة','الدفعة السابعة','الدفعة الثامنة','الدفعة التاسعة','الدفعة العاشرة','الدفعة الحادية عشر','الدفعة الاثني عشر'].forEach((h,i)=>r2_[D('CI')+i]=h);
  for(let i=1;i<=12;i++)r2_[D('CV')+i-1]='سداد '+i;
  Object.assign(r2_,{[D('CH')]:'المتبقي المسجل قبل التعديل',[D('CU')]:'الملاحظات'});
  const rows=[r1,r2_],payRows=[['المشروع','الوحدة','المستأجر','بداية العقد','المبلغ','التاريخ','ملاحظة']];let idx=0;
  if(includeData)for(const p of Object.values(projects))for(const c of p.contracts||[]){
    const r=calc(c,mode,today),row=Array(W).fill(null);idx++;
    row[0]=idx;row[1]=p.name;row[2]=isNaN(+p.no)||p.no===''?p.no:+p.no;row[3]=c.unit;row[4]=c.owner;row[5]=c.tenant;
    row[6]=c.rent===''?null:c.rent;row[7]=c.fee===''?null:c.fee;row[8]=ser(c.start);row[9]=ser(c.end);row[10]=c.period;row[11]=c.count===''?null:c.count;
    row[12]=r.M;r.inst.forEach((it,i)=>{row[13+i]=it.amount;row[D('AX')+i]=it.date==null?null:it.date/864e5+25569});
    row[D('CH')]=c.prevRemaining===''?null:c.prevRemaining;(c.oldDates||[]).slice(0,12).forEach((d,i)=>row[D('CI')+i]=ser(d));
    row[D('CU')]=c.notes||null;
    (c.payments||[]).slice(0,12).forEach((p,i)=>row[D('CV')+i]=+p.amount);
    row[D('DH')]=r.m;row[D('DI')]=r.k;row[D('DJ')]=r2((c.payments||[]).reduce((a,p)=>a+(+p.amount||0),0));
    row[D('DK')]=+c.extra||null;row[D('DL')]=r.paid;row[D('DM')]=r.iss.length?r.iss.join('، '):null;row[D('DN')]=r.rem;
    row[D('DO')]=r.st==='منتهي'?'منتهي ويحتاج إلى تجديد':r.st;
    rows.push(row);
    for(const pm of c.payments||[])payRows.push([p.name,c.unit,c.tenant,c.start||'',+pm.amount,pm.date||'',pm.note||'']);
  }
  const ws=XLSX.utils.aoa_to_sheet(rows);
  for(const[a,cell]of Object.entries(ws)){if(a[0]==='!')continue;const c=XLSX.utils.decode_cell(a);if(c.r<2)continue;
    if([8,9].includes(c.c)||(c.c>=D('AX')&&c.c<=D('CG'))||(c.c>=D('CI')&&c.c<=D('CT'))){if(typeof cell.v==='number')cell.z='yyyy-mm-dd'}}
  ws['!views']=[{rightToLeft:true}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'ورقه المعالجة');
  if(includeData){const pw=XLSX.utils.aoa_to_sheet(payRows);pw['!views']=[{rightToLeft:true}];XLSX.utils.book_append_sheet(wb,pw,'الدفعات')}
  return wb;
}
const api={parseWb,applyImp,ensureUnit,buildWorkbook,ukey,uid};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Importer=api;
})(typeof window!=='undefined'?window:globalThis);
