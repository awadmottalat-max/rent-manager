const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const bk=fs.readdirSync('/mnt/user-data/uploads').find(x=>x.startsWith('61565ea0'));const D=JSON.parse(fs.readFileSync('/mnt/user-data/uploads/'+bk,'utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,900);
 await w.webContents.executeJavaScript(`(()=>{const d=${JSON.stringify(D.db||D)};normalize(d);S.db=d;go('dash')})()`);
 const views=(process.env.VIEWS||'dash,avail,contracts,agr').split(',');
 for(const v of views){await w.webContents.executeJavaScript(`(()=>{try{${v==='avail2'?"S.av={p:'',q:'',s:'avail',t:''};go('avail')":v==='cavail'?"S.f.s='avail';go('contracts')":"go('"+v+"')"}}catch(e){return e.message}})()`);await new Promise(r=>setTimeout(r,700));
  fs.writeFileSync('/tmp/shot-'+v+'.png',(await w.webContents.capturePage()).toPNG())}
 if(process.env.FORM)await w.webContents.executeJavaScript(process.env.FORM),await new Promise(r=>setTimeout(r,600)),fs.writeFileSync('/tmp/shot-form.png',(await w.webContents.capturePage()).toPNG());
 app.exit(0)});
