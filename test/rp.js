const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db2.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1600,950);
 w.webContents.on('console-message',(e,l,m)=>{if(l>=2)console.log('CONSOLE',m)});
 const out=await w.webContents.executeJavaScript(`(async()=>{const R={};try{const d=${JSON.stringify(D)};normalize(d);S.db=d;S.rp.tab='ov';go('rep');
  for(const k of ['total','paid','rem','late','occ','avail']){document.querySelector('[data-k='+k+']').click();R[k]=document.querySelectorAll('.tw tbody tr').length+'/'+(S.pm&&S.pm.rows.length)+'/'+(document.querySelector('.tw tfoot')?.textContent.replace(/\\s+/g,' ').slice(0,90)||'')}
  document.querySelector('[data-k=late]').click();R.listDoc=listDoc().length;const al=rows();R.tiles=[al.reduce((a,x)=>a+(x.r.total||0),0),al.reduce((a,x)=>a+(x.r.paid||0),0),al.reduce((a,x)=>a+(x.r.rem>0?x.r.rem:0),0),al.reduce((a,x)=>a+x.r.late,0)];
  S.rp.p=Object.keys(P()).find(k=>P()[k].name.includes('ماربيلا'));render();R.lateMar=document.querySelectorAll('.tw tbody tr').length;S.rp.p='';
  S.rp.tab='owner';S.rp.fo='';S.rp.ft='';S.rp.owner='';render();R.ownBar=['rp_p','rp_ft','rp_owner'].map(i=>!!document.getElementById(i));
  S.rp.tab='tenant';render();R.tenBar=['rp_p','rp_fo','rp_tenant'].map(i=>!!document.getElementById(i));
  S.rp.tab='ov';S.rp.kd='late';render();R.ban=0;S.rp.tab='ov';S.rp.kd='rem';render();R.ban=document.querySelector('.warnbox')?.textContent.slice(0,200);R.ok=1}catch(e){R.err=e.stack}return JSON.stringify(R)})()`);console.log(out);
 await new Promise(r=>setTimeout(r,500));fs.writeFileSync('/tmp/rp-late.png',(await w.webContents.capturePage()).toPNG());app.exit(0)});
