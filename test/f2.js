const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const bk=fs.readdirSync('/mnt/user-data/uploads').find(x=>x.startsWith('61565ea0'));const D=JSON.parse(fs.readFileSync('/mnt/user-data/uploads/'+bk,'utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,900);
 const out=await w.webContents.executeJavaScript(`(async()=>{try{const d=${JSON.stringify(D.db||D)};normalize(d);S.db=d;const pid=Object.keys(P()).find(k=>P()[k].name.includes('ماربيلا'));const R={};
  go('avail');const opts=[...document.querySelectorAll('#av_t option')].map(o=>o.value);R.typeOpts=opts;
  unitForm(pid);const sel=document.querySelector('select[data-ts]');R.selOpts=[...sel.options].map(o=>o.text);
  document.getElementById('ff_no').value='ZZ1';sel.value='__o';sel.onchange();R.inShown=document.getElementById('ff_type').style.display==='';document.getElementById('ff_type').value='مكتب';document.getElementById('fsave').click();
  await new Promise(r=>setTimeout(r,300));R.saved=P()[pid].units.find(u=>u.no==='ZZ1')?.type;
  unitForm(pid);R.sel2=[...document.querySelector('select[data-ts]').options].map(o=>o.text).includes('مكتب');
  document.getElementById('frm').close();
  S.f.s='avail';S.f.p='';go('contracts');R.avRows=document.querySelectorAll('.tw tbody tr').length;R.hasTile=!!document.querySelector('[data-s=avail]');
  S.f.s='';S.agr={p:'',q:'',s:'',o:'',m:''};go('agr');R.agrFilt=['ag_s','ag_o','ag_m'].map(i=>!!document.getElementById(i));
  act.agrNew();R.pf=!!document.getElementById('ag_pf');document.getElementById('ag_pf').value=pid;document.getElementById('ag_pf').dispatchEvent(new Event('change',{bubbles:true}));R.pickN=document.querySelectorAll('#ag_pick option').length;
  return JSON.stringify(R)}catch(e){return 'ERR '+e.stack}})()`);console.log(out);
 for(const v of ['dash','cavail']){await w.webContents.executeJavaScript(v==='dash'?"(S.f.s='',go('dash'))":"(S.f.s='',go('contracts'))");await new Promise(r=>setTimeout(r,600));fs.writeFileSync('/tmp/p-'+v+'.png',(await w.webContents.capturePage()).toPNG())}
 app.exit(0)});
