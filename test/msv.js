const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
process.env.RENT_NO_LOGIN='1';app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db3.json','utf8'));
app.whenReady().then(async()=>{await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,1000);
 console.log(await w.webContents.executeJavaScript(`(async()=>{const R={};const sl=ms=>new Promise(r=>setTimeout(r,ms));window.addEventListener('error',e=>(R.errs=R.errs||[]).push(e.message));
  S.db=normalize(${JSON.stringify(D)});
  for(const v of ['contracts','ext','ended','due','flow','renew','alerts','avail','owners','tenants','agr','fin','maint','svc','inv','props']){
   go(v);await sl(250);const out=[];
   for(const k of [...document.querySelectorAll('#view .ms')].map(x=>x.dataset.k)){const ms=document.querySelector('#view .ms[data-k="'+k+'"]');if(!ms)continue;
     S._ms='';document.querySelectorAll('.ms.open').forEach(x=>x.classList.remove('open'));ms.querySelector('.msb').click();await sl(60);if(!ms.classList.contains('open')){out.push(k+': NOT OPEN');continue}
     const cb=[...ms.querySelectorAll('.msp input[type=checkbox]')];if(!cb.length){out.push(k+':noopts');continue}
     const c=cb[Math.min(1,cb.length-1)];const r=c.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
     const top=document.elementFromPoint(x,y);const ok=!!(top&&top.closest('.msp'));
     const before=document.querySelectorAll('#view tbody tr').length;
     c.click();await sl(200);
     const ms2=document.querySelector('#view .ms[data-k="'+k+'"]');
     out.push(k+': visible='+ok+' on='+(ms2&&ms2.classList.contains('on'))+' rows '+before+'->'+document.querySelectorAll('#view tbody tr').length);
     const clr=document.querySelector('[data-a="msClr"][data-k="'+k+'"]');if(clr){clr.click();await sl(100)}
     document.querySelectorAll('.ms.open').forEach(x=>x.classList.remove('open'));
   }
   R[v]=out}
  return JSON.stringify(R,null,1)})()`));app.exit(0)});
