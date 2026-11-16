const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2000));const w=BrowserWindow.getAllWindows()[0];const ev=c=>w.webContents.executeJavaScript(c);
 const b64=fs.readFileSync(process.argv.find(a=>a.endsWith('.xlsx'))).toString('base64');const errs=[];w.webContents.on('console-message',(e)=>{});
 await ev(`(()=>{const bin=atob("${b64}");const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);S.imp=parseWb(XLSX,XLSX.read(u,{type:'array'}));S.db.projects=applyImp(P(),S.imp,'replace').next;go('due')})()`);
 console.log(await ev(`(()=>{const o={};for(const[m,mode,s]of [['2026-12','exp','open'],['2026-12','exp','all'],['2026-11','act','open'],['','exp','late']]){S.due.m=m;S.due.from=m?m+'-01':'';S.due.to=m?mEnd(m):'';S.due.mode=mode;S.due.s=s;const L=dueList(rows());o[m+mode+s]=[L.length,Math.round(sum(L,x=>x.amount)),Math.round(sum(L,x=>x.due))]}
  S.due.m='2026-12';S.due.from='2026-12-01';S.due.to='2026-12-31';S.due.mode='exp';S.due.s='all';S.due.cs='active';S.due.g='day';render();document.querySelector('h1').textContent;return JSON.stringify(o)})()`));
 await new Promise(r=>setTimeout(r,400));fs.writeFileSync('/tmp/cf.png',(await w.webContents.capturePage()).toPNG());app.exit(0)});
