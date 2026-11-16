const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2000));const w=BrowserWindow.getAllWindows()[0];const ev=c=>w.webContents.executeJavaScript(c);
 const b64=fs.readFileSync(process.argv.find(a=>a.endsWith('.xlsx'))).toString('base64');
 await ev(`(()=>{const bin=atob("${b64}");const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);S.db.projects=applyImp(P(),parseWb(XLSX,XLSX.read(u,{type:'array'})),'replace').next;go('due')})()`);
 console.log(await ev(`(()=>{const g=document.querySelector('tr.grp');return g.outerHTML.slice(0,900)+'\\n'+document.querySelectorAll('thead th').length})()`));app.exit(0)});
