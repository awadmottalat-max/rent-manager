const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db2.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1000,800);
 console.log(await w.webContents.executeJavaScript(`(async()=>{const d=${JSON.stringify(D)};normalize(d);S.db=d;const pid=Object.keys(P())[0];
  const a={id:'t1',pid,unit:'ملحق 15',owner:'بدر محمد السليمان',tenant:'محمد ريحان الدين',date:'2026-11-24',cstart:'2026-03-17',cend:'2027-03-16',ejar:'10102224089',sap:'6400000361',no:'H-2411202601',annual:8000,payment:4000,ann:8000,lines:{service:0,mgmt:400,contract:0,prev:0,maint:0,clean:0},mgmt:{type:'pct',value:5}};
  S.db.analyses=[a];let h;try{h=anDoc(a)}catch(e){return 'ERR '+e.stack}
  const pa=document.getElementById('printarea');pa.innerHTML=h;document.body.classList.add('pr');return 'ok'})()`));
 await new Promise(r=>setTimeout(r,500));const pdf=await w.webContents.printToPDF({printBackground:true,preferCSSPageSize:true});fs.writeFileSync('/tmp/an2.pdf',pdf);app.exit(0)});
