const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2000));const w=BrowserWindow.getAllWindows()[0];
 await w.webContents.executeJavaScript(`(()=>{P()['p1']={name:'مشروع تجريبي',no:'1',contracts:[{id:'c1',unit:'A1',tenant:'مستأجر',owner:'مالك العقار',rent:12000,fee:500,start:'2026-01-01',end:'2026-12-31',count:4,payments:[{id:'a',date:'2026-01-01',amount:3000}]}],units:[]};render();
  $('#printarea').innerHTML=ownerHtml('مالك العقار');document.body.classList.add('pr');})()`);
 await new Promise(r=>setTimeout(r,300));
 fs.writeFileSync('/tmp/test.pdf',await w.webContents.printToPDF({printBackground:true,pageSize:'A4'}));console.log('pdf',fs.statSync('/tmp/test.pdf').size);app.exit(0)});
