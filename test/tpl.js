const T=require('../src/template.js'),XLSX=require('xlsx'),I=require('../src/importer.js'),ExcelJS=require('exceljs'),assert=require('assert'),fs=require('fs');
(async()=>{
 const buf=await T.build();fs.writeFileSync('/tmp/tpl.xlsx',buf);
 // الفارغ لا يُنتج عقودًا
 assert.strictEqual(I.parseWb(XLSX,XLSX.read(buf,{type:'buffer'})).n,0);
 // تعبئة صفين
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(buf);const ws=wb.getWorksheet('قالب الاستيراد');
 const set=(r,v)=>v.forEach((x,i)=>{if(x!=null)ws.getCell(r,i+1).value=x});
 set(2,['مشروع أ',7,'A1','مالك 1','مستأجر 1',48000,2000,new Date(Date.UTC(2026,0,1)),new Date(Date.UTC(2026,11,31)),'سنة',4,'ملاحظة',12000,12000]);
 set(3,['مشروع أ',7,'A2','مالك 2','مستأجر 2',120000,null,'2026-03-15','2028-03-14','سنتان','شهري']);
 const out=Buffer.from(await wb.xlsx.writeBuffer());
 const r=I.parseWb(XLSX,XLSX.read(out,{type:'buffer',cellDates:false}));
 console.log(r.n,JSON.stringify(r.P['مشروع أ'].contracts.map(c=>[c.unit,c.rent,c.start,c.end,c.count,c.payments.length])));
 assert.strictEqual(r.n,2);assert.strictEqual(r.P['مشروع أ'].contracts[0].start,'2026-01-01');assert.strictEqual(r.P['مشروع أ'].contracts[0].payments.length,2);
 console.log('TPL OK');
})();
