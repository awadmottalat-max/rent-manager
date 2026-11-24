const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db2.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,1000);
 w.webContents.on('console-message',(e,l,m)=>{if(l>=2)console.log('CONSOLE',m)});
 const sl=ms=>new Promise(r=>setTimeout(r,ms));
 await w.webContents.executeJavaScript(`(()=>{const d=${JSON.stringify(D)};normalize(d);S.db=d;go('dash');setLang('en')})()`);await sl(800);
 const views=(process.env.V||'dash,contracts,ext,alerts,due,flow,rep,props,owners,tenants,agr,fin,settings,avail,ended,renew').split(',');const rem={};
 for(const v of views){await w.webContents.executeJavaScript(`go('${v}')`);await sl(500);
   const t=await w.webContents.executeJavaScript(`(()=>{const o=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const s=n.nodeValue.trim();if(/[\\u0600-\\u06FF]/.test(s)&&!n.parentElement.closest('[data-noi18n]'))o.add(s)}document.querySelectorAll('[placeholder],[title]').forEach(e=>{for(const a of['placeholder','title']){const s=e.getAttribute(a)||'';if(/[\\u0600-\\u06FF]/.test(s)&&!e.closest('[data-noi18n]'))o.add('@'+a+':'+s)}});return [...o]})()`);
   rem[v]=t;if(process.env.SHOT)fs.writeFileSync('/tmp/l_'+v+'.png',(await w.webContents.capturePage()).toPNG())}
 fs.writeFileSync('/tmp/lang_rem.json',JSON.stringify(rem,null,1));
 app.exit(0)});
