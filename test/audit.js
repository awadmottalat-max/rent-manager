const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rent-'));app.setPath('userData',tmp);app.commandLine.appendSwitch('no-sandbox');
require('../main.js');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
  await sleep(2500);const w=BrowserWindow.getAllWindows()[0];const ev=c=>w.webContents.executeJavaScript(c);
  const b64=fs.readFileSync(process.argv.find(a=>a.endsWith('.xlsx'))).toString('base64');
  await ev(`(()=>{const bin=atob("${b64}");const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);S.imp=parseWb(XLSX,XLSX.read(u,{type:'array'}));S.db.projects=applyImp(P(),S.imp,'replace').next;persist();render();})()`);
  const r=await ev(`(()=>{const o={projects:Object.keys(P()).length,contracts:0,units:0,dupUnits:[],dupContracts:[],overlap:[],noUnitRec:[],sameNameProj:[],hosp:[],projCnt:[]};
    const names={};for(const[pid,p]of Object.entries(P()))(names[p.name]=names[p.name]||[]).push(pid);o.sameNameProj=Object.entries(names).filter(([n,a])=>a.length>1).map(([n,a])=>n+':'+a.length);
    for(const[pid,p]of Object.entries(P())){o.contracts+=p.contracts.length;o.units+=(p.units||[]).length;o.projCnt.push(p.name+' c='+p.contracts.length+' u='+(p.units||[]).length);
      const um={};for(const u of p.units||[])(um[normU(u.no)]=um[normU(u.no)]||[]).push(u.no);for(const[k,a]of Object.entries(um))if(a.length>1)o.dupUnits.push(p.name+':'+a.join('/'));
      const ck={};for(const c of p.contracts){const k=[normU(c.unit),c.tenant,c.start,c.end,c.rent].join('|');(ck[k]=ck[k]||[]).push(c.id);}for(const[k,a]of Object.entries(ck))if(a.length>1)o.dupContracts.push(p.name+':'+k);
      const by={};for(const c of p.contracts)(by[normU(c.unit)]=by[normU(c.unit)]||[]).push(c);
      for(const[k,a]of Object.entries(by)){const s=a.map(c=>({c,r:calc(c,MODE(),TODAY)})).filter(x=>x.r.st==='ساري'||x.r.st==='لم يبدأ');if(s.length>1)o.overlap.push(p.name+':'+k+' x'+s.length);
        if(!(p.units||[]).some(u=>normU(u.no)===k))o.noUnitRec.push(p.name+':'+k)}}
    for(const x of rows()){if(/عسكري/.test(x.c.tenant||'')&&x.r.st==='منتهي')o.hosp.push([x.pn,x.c.unit,x.c.tenant,x.c.start,x.c.end,endState(x.pid,x.c),(P()[x.pid].contracts.filter(c=>normU(c.unit)===normU(x.c.unit)).map(c=>c.start+'>'+c.end+' '+c.tenant)).join(' ; ')].join(' | '))}
    o.dupUnits=o.dupUnits.slice(0,15);o.dupContracts=o.dupContracts.slice(0,15);o.overlap=o.overlap.slice(0,15);o.noUnitRec=o.noUnitRec.slice(0,15);o.hosp=o.hosp.slice(0,12);return JSON.stringify(o,null,1)})()`);
  const e=await ev(`(async()=>{try{const sl=ms=>new Promise(r=>setTimeout(r,ms));const pid=Object.keys(P())[1],c0=P()[pid].contracts[2];S.cur={pid,cid:c0.id};const before=JSON.stringify({rent:c0.rent,end:c0.end,tenant:c0.tenant,notes:c0.notes});
    contractForm(true);await sl(100);const E=(i,v,t='input')=>{const e=document.getElementById(i);e.value=v;e.dispatchEvent(new Event(t,{bubbles:true}))};
    E('cf_rent','12345');document.getElementById('cf_notes').value='ملاحظة اختبار';const ti=document.querySelector('#cb_ten input');ti.value='مستأجر معدل';ti.dispatchEvent(new Event('input',{bubbles:true}));
    try{document.getElementById('cf_save').onclick()}catch(x){return 'THROW '+x.stack};await sl(200);const c1=P()[pid].contracts.find(c=>c.id===c0.id);return before+' => '+JSON.stringify({rent:c1.rent,end:c1.end,tenant:c1.tenant,notes:c1.notes,err:document.getElementById('cf_err')?.textContent})}catch(x){return 'ERR '+x.stack}})()`);
  console.log('EDIT',e);
  console.log('AUDIT',r);app.quit();
});
