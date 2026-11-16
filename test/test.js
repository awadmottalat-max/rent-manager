const XLSX=require('xlsx'),fs=require('fs'),assert=require('assert');
const C=require('../src/core.js'),I=require('../src/importer.js');
const f=process.argv[2];const TODAY=C.pd('2026-11-16');
const wb=XLSX.read(fs.readFileSync(f),{type:'buffer'});
const imp=I.parseWb(XLSX,wb);
console.log('sheet',imp.sn,'contracts',imp.n,'projects',Object.entries(imp.P).map(([k,p])=>k+':'+p.contracts.length));
let {next,stats}=I.applyImp({},imp,'replace');console.log(stats);
const rows=[];for(const[pid,p]of Object.entries(next))for(const c of p.contracts)rows.push({pid,pn:p.name,c,r:C.calc(c,'total',TODAY)});
const sum=f=>rows.reduce((s,x)=>s+f(x),0);
console.log('active',rows.filter(x=>x.r.st==='ساري').length,'late',C.r2(sum(x=>x.r.late)),'late contracts',rows.filter(x=>x.r.late_n).length,'issues',rows.filter(x=>x.r.iss.length).length);
console.log('rem',C.r2(sum(x=>x.r.rem>0?x.r.rem:0)),'total',C.r2(sum(x=>x.r.total||0)));
console.log('renewals',C.renewals(rows,TODAY,90).length);
console.log('owners',C.ownerStatements(rows,[]).length);
// units
console.log('units',Object.values(next).reduce((s,p)=>s+p.units.length,0));
// دورة تصدير/استيراد
const out=I.buildWorkbook(XLSX,next,'total',TODAY);
const buf=XLSX.write(out,{type:'buffer',bookType:'xlsx',cellDates:false});
const imp2=I.parseWb(XLSX,XLSX.read(buf,{type:'buffer'}));
assert.strictEqual(imp2.n,imp.n,'عدد العقود بعد الدورة');
const m=I.applyImp(next,imp2,'merge');
assert.strictEqual(m.stats.added,0,'لا إضافات بعد دورة التصدير/الاستيراد: '+m.stats.added);
const rows2=[];for(const[pid,p]of Object.entries(m.next))for(const c of p.contracts)rows2.push({r:C.calc(c,'total',TODAY)});
const sum2=rows2.reduce((s,x)=>s+(x.r.rem>0?x.r.rem:0),0);
console.log('roundtrip rem',C.r2(sum2),'contracts',rows2.length);
assert.strictEqual(rows2.length,rows.length);
assert.strictEqual(C.r2(sum2),C.r2(sum(x=>x.r.rem>0?x.r.rem:0)));
// دفعة مؤرخة + إعادة استيراد ملف قديم لا تضاعف
const pid0=Object.keys(next)[0];next[pid0].contracts[0].payments.push({id:'z',date:'2026-11-01',amount:1000,note:''});
const m2=I.applyImp(next,imp,'merge');
const c0=m2.next[pid0].contracts[0];console.log('payments after merge',c0.payments.length);
const tpl=I.buildWorkbook(XLSX,{},'total',TODAY,false);assert.strictEqual(I.parseWb(XLSX,XLSX.read(XLSX.write(tpl,{type:'buffer',bookType:'xlsx'}),{type:'buffer'})).n,0);
console.log('ALL OK');
