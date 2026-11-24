const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db2.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,1000);
 const sl=ms=>new Promise(r=>setTimeout(r,ms));
 await w.webContents.executeJavaScript(`(()=>{const d=${JSON.stringify(D)};normalize(d);S.db=d;go('dash')})()`);await sl(600);
 for(const v of (process.env.V||'dash,contracts').split(',')){await w.webContents.executeJavaScript(`go('${v}')`);await sl(500);fs.writeFileSync('/tmp/s_'+v+'.png',(await w.webContents.capturePage()).toPNG())}
 app.exit(0)});
