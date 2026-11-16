/* منشئ قالب الاستيراد الفارغ بتنسيق احترافي (Node / exceljs) */
const ExcelJS=require('exceljs');const {cols}=require('./tplcols.js');
const ACC='FF5E2132',GOLD='FFB39973',SOFT='FFF3EAEC',LINE='FFD9CFD1';
async function build(){
  const wb=new ExcelJS.Workbook();wb.creator='Kathib';wb.created=new Date();
  const ws=wb.addWorksheet('قالب الاستيراد',{views:[{rightToLeft:true,state:'frozen',xSplit:3,ySplit:1}],properties:{tabColor:{argb:ACC}}});
  ws.columns=cols.map(c=>({key:c.k,width:c.w}));
  const hr=ws.getRow(1);hr.height=34;
  cols.forEach((c,i)=>{const cell=hr.getCell(i+1);cell.value=c.h+(c.req?' *':'');
    cell.font={name:'Arial',bold:true,size:11,color:{argb:'FFFFFFFF'}};
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:c.pay?'FF7A5A1E':ACC}};
    cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};
    cell.border={bottom:{style:'medium',color:{argb:GOLD}},left:{style:'thin',color:{argb:'FF7C3A4A'}}};
    if(c.note)cell.note={texts:[{text:c.note}]}});
  const N=500;
  for(let r=2;r<=N+1;r++){
    const row=ws.getRow(r);row.height=21;
    cols.forEach((c,i)=>{const cell=row.getCell(i+1);
      cell.font={name:'Arial',size:11};
      cell.border={bottom:{style:'thin',color:{argb:LINE}},left:{style:'hair',color:{argb:LINE}},right:{style:'hair',color:{argb:LINE}}};
      cell.alignment={vertical:'middle',horizontal:c.t?'center':'right'};
      if(c.t==='num')cell.numFmt='#,##0.00';
      if(c.t==='date')cell.numFmt='yyyy-mm-dd';
      if(r%2===1)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFBF8F9'}};
    });
  }
  // قيود إدخال خفيفة (تحذير لا منع)
  const L=i=>ws.getColumn(i+1).letter,idx=k=>cols.findIndex(c=>c.k===k);
  for(let r=2;r<=N+1;r++){
    for(const c of cols){
      const cell=ws.getCell(r,idx(c.k)+1);
      if(c.t==='num')cell.dataValidation={type:'decimal',operator:'greaterThanOrEqual',formulae:[0],allowBlank:true,showErrorMessage:true,errorStyle:'warning',errorTitle:'قيمة غير صحيحة',error:'أدخل رقمًا موجبًا'};
      if(c.t==='date')cell.dataValidation={type:'date',operator:'greaterThan',formulae:[new Date(2000,0,1)],allowBlank:true,showErrorMessage:true,errorStyle:'warning',errorTitle:'تاريخ غير صحيح',error:'أدخل التاريخ بصيغة 2026-01-31'};
      if(c.k==='count')cell.dataValidation={type:'list',allowBlank:true,formulae:['"1,2,3,4,6,12,شهري,دفعتين,واحدة"'],showErrorMessage:false};
    }
  }
  ws.autoFilter={from:{row:1,column:1},to:{row:1,column:cols.length}};
  ws.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0};

  const ex=wb.addWorksheet('مثال (لا يُستورد)',{views:[{rightToLeft:true}],properties:{tabColor:{argb:GOLD}}});
  ex.columns=cols.map(c=>({width:c.w}));
  const eh=ex.getRow(1);eh.height=30;
  cols.forEach((c,i)=>{const cell=eh.getCell(i+1);cell.value=c.h;cell.font={bold:true,color:{argb:ACC}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:SOFT}};cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};cell.border={bottom:{style:'medium',color:{argb:GOLD}}}});
  const rowsEx=[
    {project:'اسم المشروع',pno:101,unit:'A12',owner:'اسم المالك',tenant:'اسم المستأجر',rent:48000,fee:2400,start:new Date(Date.UTC(2026,0,1)),end:new Date(Date.UTC(2026,11,31)),period:'سنة',count:4,notes:'',pay1:12000},
    {project:'اسم المشروع',pno:101,unit:'B07',owner:'اسم المالك',tenant:'شركة مثال',rent:120000,fee:'',start:new Date(Date.UTC(2026,2,15)),end:new Date(Date.UTC(2028,2,14)),period:'سنتان',count:'شهري',notes:'مثال لعقد سنتين بدفع شهري'}
  ];
  rowsEx.forEach((o,ri)=>{const row=ex.getRow(ri+2);cols.forEach((c,i)=>{const cell=row.getCell(i+1);const v=o[c.k];if(v!==undefined&&v!=='')cell.value=v;if(c.t==='date')cell.numFmt='yyyy-mm-dd';if(c.t==='num')cell.numFmt='#,##0.00';cell.alignment={horizontal:c.t?'center':'right'};cell.font={color:{argb:'FF6E6166'},italic:true}})});

  const hp=wb.addWorksheet('تعليمات',{views:[{rightToLeft:true,showGridLines:false}],properties:{tabColor:{argb:'FF8A6F47'}}});
  hp.getColumn(1).width=4;hp.getColumn(2).width=110;
  const lines=[['t','قالب استيراد العقود — كثيب لإدارة الأملاك والمرافق'],
   ['h','كيف تستخدم القالب'],
   ['p','أدخل كل عقد في صف مستقل داخل ورقة «قالب الاستيراد» بدءًا من الصف الثاني، ثم احفظ الملف واستورده من التطبيق: البيانات والنسخ الاحتياطي ← استيراد من Excel.'],
   ['p','المشروع والوحدة في عمودين منفصلين. الأعمدة المعلّمة بنجمة (*) مطلوبة.'],
   ['h','الأعمدة'],
   ...cols.filter(c=>!c.pay).map(c=>['p',(c.req?'* ':'')+c.h+(c.note?' — '+c.note:'')]),
   ['p','سداد 1 … سداد 12 — المبالغ المسددة حتى الآن بالترتيب، ويُخصَّص المسدد للأقساط الأقدم أولًا. الدفعات بتواريخها تُسجَّل لاحقًا داخل التطبيق.'],
   ['h','ملاحظات'],
   ['p','التاريخ بصيغة 2026-01-31 (سنة-شهر-يوم). لا تغيّر أسماء الأعمدة ولا ترتيبها.'],
   ['p','عند الدمج يُطابَق العقد بالوحدة + المستأجر + تاريخ البداية، فلا يتكرر العقد إذا استوردت الملف أكثر من مرة.'],
   ['p','ورقة «مثال» للاطلاع فقط ولا تُستورد.']];
  lines.forEach(([t,txt],i)=>{const c=hp.getCell(i+2,2);c.value=txt;c.alignment={wrapText:true,vertical:'top',horizontal:'right'};
    if(t==='t'){c.font={bold:true,size:16,color:{argb:ACC}};hp.getRow(i+2).height=30}
    else if(t==='h'){c.font={bold:true,size:12,color:{argb:ACC}};c.border={bottom:{style:'thin',color:{argb:GOLD}}};hp.getRow(i+2).height=24}
    else c.font={size:11}});
  return Buffer.from(await wb.xlsx.writeBuffer());
}
module.exports={build};
