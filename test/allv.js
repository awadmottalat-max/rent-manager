const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync(process.env.DB||'/tmp/db2.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];
 w.webContents.on('console-message',(e,l,m)=>{if(l>=2)console.log('CONSOLE',m)});
 const out=await w.webContents.executeJavaScript(`(async()=>{const R={};try{const d=${JSON.stringify(D)};normalize(d);S.db=d;R.pre=1;
  for(const[v]of VIEWS){try{go(v);R[v]=document.getElementById('view').innerHTML.length}catch(e){R[v]='ERR '+e.message}}
  R.nav=document.getElementById('nav').children.length}catch(e){R.fatal=e.stack}return JSON.stringify(R)})()`);console.log(out);app.exit(0)});
