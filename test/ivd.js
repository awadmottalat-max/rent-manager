const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db3.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,1000);
 console.log(await w.webContents.executeJavaScript(`(async()=>{const R={errs:[]};try{const d=${JSON.stringify(D)};normalize(d);S.db=d;const sl=ms=>new Promise(r=>setTimeout(r,ms));
  window.addEventListener('error',e=>R.errs.push(e.message));
  go('inv');await sl(200);const links=[...document.querySelectorAll('#view .drl')];R.links=links.length;
  const res=[];for(const a of links.slice(0,14)){const exp=a.textContent.trim();a.click();await sl(80);const h=document.querySelector('#stm .dh p').textContent.trim();res.push(exp+'/'+h);document.querySelector('#stm .x').click()}
  R.res=res.join(' | ');
  const k=document.querySelector('.kpis .kp[data-m="u"]');k.click();await sl(80);R.kpi=document.querySelector('#stm .dh h2').textContent+' '+document.querySelector('#stm .dh p').textContent;
  document.querySelector('[data-a="ivGo"]').click();await sl(150);R.go=S.iv.tab+':'+S.iv.s+' rows='+document.querySelectorAll('#view tbody tr').length;
  }catch(e){R.e=e.stack}return JSON.stringify(R,null,1)})()`));
 await new Promise(r=>setTimeout(r,200));fs.writeFileSync('/tmp/ivd.png',(await w.webContents.capturePage()).toPNG());app.exit(0)});
