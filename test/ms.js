const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db2.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,1100);
 w.webContents.on('console-message',(e,l,m)=>{if(l>=2)console.log('CONSOLE',m)});
 console.log(await w.webContents.executeJavaScript(`(async()=>{const R={errs:[]};try{const d=${JSON.stringify(D)};normalize(d);S.db=d;const sl=ms=>new Promise(r=>setTimeout(r,ms));
  window.addEventListener('error',e=>R.errs.push(e.message+' @'+S.view+' '+String(e.error&&e.error.stack).split(String.fromCharCode(10)).slice(0,3).join('|')));
  const ids=Object.keys(P()).slice(0,2);R.ids=ids.length;
  const views=['alerts','avail','contracts','ext','ended','due','flow','renew','props','owners','tenants','agr','fin','maint','svc','inv','rep'];
  R.v={};
  for(const v of views){try{S.view=v;go(v);await sl(120);const n0=document.querySelectorAll('#view tbody tr').length;
    const b=document.querySelector('#view .ms .msb');if(!b){R.v[v]='nomsel';continue}
    const k=b.dataset.k;const cs=[...document.querySelectorAll('.msc[data-k="'+k+'"]')];
    cs[0].checked=true;cs[0].dispatchEvent(new Event('change',{bubbles:true}));await sl(120);
    const c2=[...document.querySelectorAll('.msc[data-k="'+k+'"]')];c2[1].checked=true;c2[1].dispatchEvent(new Event('change',{bubbles:true}));await sl(120);
    const n2=document.querySelectorAll('#view tbody tr').length;const lab=document.querySelector('#view .ms .msb').textContent;
    MSsp(k,'');render();await sl(60);R.v[v]=n0+'->'+n2+' '+lab;}catch(e){R.v[v]='ERR '+e.message}}
  // internal contract fee pct
  go('contracts');await sl(100);contractForm&&contractForm();await sl(200);
  const k=document.getElementById('cf_kind');R.kindOpts=k?[...k.options].map(o=>o.value).join(','):null;
  if(k){k.value='';k.dispatchEvent(new Event('change'));await sl(80);R.xfVisible=!document.getElementById('cf_xf').hidden;
   document.getElementById('cf_ftype').value='pct';document.getElementById('cf_ftype').dispatchEvent(new Event('change'));document.getElementById('cf_rent').value='10000';document.getElementById('cf_rent').dispatchEvent(new Event('input'));document.getElementById('cf_fpct').value='5';document.getElementById('cf_fpct').dispatchEvent(new Event('input'));await sl(80);R.fee=document.getElementById('cf_fee').value}
  }catch(e){R.e=e.stack}return JSON.stringify(R,null,1)})()`));
 await new Promise(r=>setTimeout(r,200));fs.writeFileSync('/tmp/ms.png',(await w.webContents.capturePage()).toPNG());app.exit(0)});
