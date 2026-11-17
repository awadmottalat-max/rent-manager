const F=require('../src/fin.js'),assert=require('assert');
// مثال ملف الإكسل: دفعة 36,000 من إيجار 72,000
const a=F.anaCalc({payment:36000,annualRent:72000,service:7200,mgmt:{type:'pct',value:6,base:'annual'},contract:125,prev:5000,maint:500,clean:300},15);
assert.strictEqual(a.lines.mgmt,4320);assert.strictEqual(a.vat,1746.75);assert.strictEqual(a.totalDed,19191.75);assert.strictEqual(a.netOwner,16808.25);
// تعديل يدوي للضريبة
const b=F.anaCalc({payment:36000,annualRent:72000,service:7200,mgmt:{type:'pct',value:6},contract:125,vatManual:true,vatAmt:1000},15);assert.strictEqual(b.vat,1000);
// نسبة على الدفعة بدل السنوي
assert.strictEqual(F.anaCalc({payment:10000,annualRent:50000,mgmt:{type:'pct',value:10,base:'payment'}},15).lines.mgmt,1000);
// اتفاقية PDF: 80,000 ، 10% شاملة الضريبة 9,200 على دفعتين صافي 35,400
const g=F.agrCalc({annualRent:80000,mgmt:{type:'pct',value:10},inst:[{amount:40000,mg:true},{amount:40000,mg:true}],fee:{mode:'owner',amount:125}},15);
assert.strictEqual(g.mgmtTotal,9200);assert.deepStrictEqual(g.rows.map(r=>r.net),[35400,35400]);assert.strictEqual(g.warn.length,0);
// رسوم عقد تدفعها الشركة وتُقتطع من الدفعة الأولى
const h=F.agrCalc({annualRent:80000,mgmt:{type:'fixed',value:5000},mgmtVat:true,inst:[{amount:40000,mg:true},{amount:40000,mg:true}],fee:{mode:'company',amount:125,vat:true,at:1}},15);
assert.strictEqual(h.rows[0].ded,2875+143.75);assert.strictEqual(h.totals.ded,5750+143.75);
// بدون ضريبة
assert.strictEqual(F.agrCalc({annualRent:1000,mgmt:{type:'pct',value:10},mgmtVat:false,inst:[{amount:1000,mg:true}]},15).mgmtTotal,100);
// تفقيط
console.log(F.tafqeet(36000),'|',F.tafqeet(1250.5),'|',F.tafqeet(2105),'|',F.tafqeet(72000));
assert.ok(F.tafqeet(36000).includes('ستة وثلاثون ألف'));
console.log('FIN OK');
