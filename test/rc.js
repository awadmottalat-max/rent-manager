const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db2.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1000,700);
 await w.webContents.executeJavaScript(`(async()=>{const d=${JSON.stringify(D)};normalize(d);S.db=d;let r=null;for(const[pid,p]of Object.entries(P())){for(const c of p.contracts){const pm=(c.payments||[])[0];if(pm){r=receiptDoc(pid,c.id,pm.id);break}}if(r)break}
 const o=document.createElement('div');o.id='tst';o.style.cssText='position:fixed;inset:0;z-index:99999;background:#888;padding:20px';o.innerHTML=r.html;document.body.appendChild(o)})()`);
 await new Promise(r=>setTimeout(r,600));fs.writeFileSync('/tmp/rc.png',(await w.webContents.capturePage()).toPNG());app.exit(0)});
