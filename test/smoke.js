const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rent-'));app.setPath('userData',tmp);
app.commandLine.appendSwitch('no-sandbox');
require('../main.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(out,{recursive:true});
app.whenReady().then(async()=>{
  await sleep(2500);const w=BrowserWindow.getAllWindows()[0];const ev=c=>w.webContents.executeJavaScript(c);
  const errs=[];w.webContents.on('console-message',(e)=>{const l=e.level;if(l==='error'||l===3)errs.push(e.message)});
  w.webContents.on('did-fail-load',(e,c,d)=>errs.push('fail '+d));
  const shot=async n=>{await sleep(300);fs.writeFileSync(path.join(out,n+'.png'),(await w.webContents.capturePage()).toPNG())};
  const pdf=async(n,html)=>{await ev(`document.getElementById('printarea').innerHTML=${JSON.stringify(html)};document.body.classList.add('pr')`);await sleep(400);fs.writeFileSync(path.join(out,n+'.pdf'),await w.webContents.printToPDF({printBackground:true,preferCSSPageSize:true}));await ev(`document.body.classList.remove('pr')`)};
  const b64=fs.readFileSync(process.argv.find(a=>a.endsWith('.xlsx'))).toString('base64');
  await ev(`(()=>{const bin=atob("${b64}");const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    S.imp=parseWb(XLSX,XLSX.read(u,{type:'array'}));S.db.projects=applyImp(P(),S.imp,'replace').next;persist();render();})()`);
  for(const v of ['dash','contracts','due','renew','props','owners','settings']){await ev(`go('${v}')`);await shot(v)}
  await ev(`J.soon()`);await shot('due30');
  await ev(`go('contracts');const pid=Object.keys(P())[0];openDet(pid,P()[pid].contracts[3].id)`);await shot('detail');
  await pdf('contract',await ev(`contractDoc(cur())`));
  await ev(`document.getElementById('det').close();go('contracts')`);
  await pdf('list',await ev(`(()=>{S.pm=null;render();return listDoc()})()`));
  await ev(`J.soon()`);await pdf('cash',await ev(`(()=>{S.due.print=true;S.pm=dueModel(rows());S.due.print=false;return listDoc()})()`));
  await ev(`go('owners');ownerDlg(ownerStatements(rows())[3].name)`);await shot('owner');
  await sleep(500);console.log('ERRS',JSON.stringify(errs));app.exit(0);
});
