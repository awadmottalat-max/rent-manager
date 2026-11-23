const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db2.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,1000);
 w.webContents.on('console-message',(e,l,m)=>{if(l>=2)console.log('CONSOLE',m)});
 console.log(await w.webContents.executeJavaScript(`(async()=>{const R={};try{const d=${JSON.stringify(D)};normalize(d);S.db=d;const sl=ms=>new Promise(r=>setTimeout(r,ms));
  const pid=Object.keys(P()).find(k=>P()[k].name.includes('ماربيلا'));S.f.p=pid;go('contracts');contractForm(false,{pid,unit:'ZZ9',owner:'مالك تجريبي',tenant:'مستأجر تجريبي',rent:100,start:'2026-12-01',period:'سنة',end:'2027-11-30'});await sl(300);
  const fr=document.getElementById('cf_freq');fr.value='plan';fr.dispatchEvent(new Event('change',{bubbles:true}));await sl(200);
  R.box=!document.getElementById('cf_planbox').hidden;R.rows0=document.querySelectorAll('#cf_pl tbody tr').length;
  const setRow=(i,d,a)=>{const tr=document.querySelectorAll('#cf_pl tbody tr')[i];setDate('pl_d'+i,d);tr.querySelector('.pl_a').value=a};
  setRow(0,'2026-12-01',50);document.getElementById('pl_add').click();await sl(100);setRow(1,'2027-03-01',25);document.getElementById('pl_add').click();await sl(100);setRow(2,'2027-06-01',20);
  document.getElementById('cf_pl').dispatchEvent(new Event('input',{bubbles:true}));R.sum0=document.getElementById('cf_plsum').textContent;
  document.getElementById('cf_save').click();await sl(300);R.err=document.getElementById('cf_err')?.textContent;
  setRow(2,'2027-06-01',25);document.getElementById('cf_pl').dispatchEvent(new Event('input',{bubbles:true}));R.sum1=document.getElementById('cf_plsum').textContent;
  document.getElementById('cf_save').click();await sl(400);R.err2=document.getElementById('cf_err')?.textContent;
  const c=P()[pid].contracts.find(z=>z.unit==='ZZ9');R.saved=c&&JSON.stringify(c.plan);R.inst=c&&calc(c,'total',TODAY).inst.map(i=>i.date?iso(i.date)+':'+i.amount:'');R.iss=c&&calc(c,'total',TODAY).iss;R.freq=c&&c.freq;
  S.cur={pid,cid:c.id};contractForm(true);await sl(300);R.editFreq=document.getElementById('cf_freq').value;R.editRows=document.querySelectorAll('#cf_pl tbody tr').length
  }catch(e){R.e=e.stack}return JSON.stringify(R)})()`));
 await new Promise(r=>setTimeout(r,300));fs.writeFileSync('/tmp/plan.png',(await w.webContents.capturePage()).toPNG());app.exit(0)});
