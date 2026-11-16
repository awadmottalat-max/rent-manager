const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rent-'));app.setPath('userData',tmp);app.commandLine.appendSwitch('no-sandbox');require('../main.js');
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2000));const w=BrowserWindow.getAllWindows()[0];const ev=c=>w.webContents.executeJavaScript(c);
 const r=await ev(`(async()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#5e2132';g.fillRect(0,0,256,256);
  const png=new Uint8Array(await new Promise(r=>c.toBlob(b=>b.arrayBuffer().then(r),'image/png')));const o=await native.setIcon(png);go('settings');await new Promise(r=>setTimeout(r,400));
  const u=await native.getIcon();const after=document.getElementById('iconprev').src.startsWith('data:');await native.resetIcon();return JSON.stringify({o,hasData:!!u,after,gone:!(await native.getIcon())})})()`);
 console.log('RES',r,fs.existsSync(path.join(tmp,'custom-icon.ico')));app.exit(0)});
