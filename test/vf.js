const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db2.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];
 console.log(await w.webContents.executeJavaScript(`(async()=>{const R={};try{const d=${JSON.stringify(D)};normalize(d);S.db=d;
  const x=rows().find(z=>z.c.unit==='D02'&&z.c.count==='');R.found=!!x;go('contracts');S.cur={pid:x.pid,cid:x.c.id};contractForm(true);await new Promise(r=>setTimeout(r,300));
  document.getElementById('cf_save').click();await new Promise(r=>setTimeout(r,200));R.err=document.getElementById('cf_err')?.textContent;R.open=document.getElementById('cf')?.open??'?';
  const y=rows().find(z=>z.r.k&&z.r.inst.length);S.cur={pid:y.pid,cid:y.c.id};contractForm(true);await new Promise(r=>setTimeout(r,300));document.getElementById('cf_save').click();await new Promise(r=>setTimeout(r,200));R.y=[y.c.count,y.c.period,y.c.freq,y.c.start,y.c.end,document.getElementById('cf_freq').value,document.getElementById('cf_period').value,document.getElementById('cf_start').value];R.okErr=document.getElementById('cf_err')?.textContent||'none'}catch(e){R.e=e.stack}return JSON.stringify(R)})()`));app.exit(0)});
