const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];
 const out=await w.webContents.executeJavaScript(`(()=>{try{
  S.db.parties={owners:[{name:'مالك العقار',idno:'1010101010',unified:'7001234567',phone:'0500000000'}],tenants:[{name:'شركة المستأجر',idno:'4030303030',tax:'300111222200003',phone:'0555555555'}]};
  P()['p1']={name:'سكينة المدينة',no:'12',units:[{no:'A1',type:'محل تجاري',area:'85',rooms:''}],contracts:[{id:'c1',unit:'A1',tenant:'شركة المستأجر',owner:'مالك العقار',ejar:'10203040',rent:60000,fee:2000,start:'2026-01-01',end:'2026-12-31',period:12,count:4,freq:'q',signDate:'2025-12-20',grace:15,vatRate:15,deposit:5000,svc:1200,conditions:'يلتزم المستأجر بالصيانة التشغيلية\\nلا يجوز التأجير من الباطن',payments:[{id:'p1',date:'2026-01-02',amount:17250}]}]};
  const x=rows().find(z=>z.c.id==='c1');if(!x)return 'no row';
  $('#printarea').innerHTML=contractDoc(x);document.body.classList.add('pr');return 'ok'}catch(e){return 'ERR '+e.stack}})()`);
 console.log(out);await new Promise(r=>setTimeout(r,400));
 fs.writeFileSync('/tmp/lease.pdf',await w.webContents.printToPDF({printBackground:true,pageSize:'A4'}));console.log('pdf',fs.statSync('/tmp/lease.pdf').size);app.exit(0)});
