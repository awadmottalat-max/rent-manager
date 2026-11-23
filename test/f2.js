const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const bk=fs.readdirSync('/mnt/user-data/uploads').find(x=>x.startsWith('61565ea0'));const D=JSON.parse(fs.readFileSync('/mnt/user-data/uploads/'+bk,'utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,900);
 const out=await w.webContents.executeJavaScript(`(async()=>{try{const d=${JSON.stringify(D.db||D)};normalize(d);S.db=d;const pid=Object.keys(P()).find(k=>P()[k].name.includes('ماربيلا'));const R={};
  S.agr={p:'',q:'',s:'',o:'',m:''};go('agr');act.agrNew();const ps=document.getElementById('ag_ps');ps.value='E03';ps.dispatchEvent(new Event('input',{bubbles:true}));
  R.pickN=document.querySelectorAll('#ag_pick option').length;R.proj=document.getElementById('ag_pid').selectedOptions[0].text;R.unit=document.getElementById('ag_unit').value;R.ten=document.getElementById('ag_tenant').value;document.getElementById('frm').close();
  const cnt=v=>{go(v);return document.querySelectorAll('.tw tbody tr').length};
  R.ow0=cnt('owners');S.ow.u='E03';R.owU=cnt('owners');S.ow.u='';S.ow.p=Object.keys(P()).find(k=>P()[k].name.includes('ماربيلا'));R.owP=cnt('owners');S.ow.p='';
  R.tn0=cnt('tenants');S.tn.u='E03';R.tnU=cnt('tenants');S.tn.u='';
  S.pr.q='E03';S.pr.tab='proj';R.pr=cnt('props');S.pr.q='';
  return JSON.stringify(R)}catch(e){return 'ERR '+e.stack}})()`);console.log(out);
 for(const v of ['dash','cavail']){await w.webContents.executeJavaScript(v==='dash'?"(S.f.s='',go('dash'))":"(S.f.s='',go('contracts'))");await new Promise(r=>setTimeout(r,600));fs.writeFileSync('/tmp/p-'+v+'.png',(await w.webContents.capturePage()).toPNG())}
 app.exit(0)});
