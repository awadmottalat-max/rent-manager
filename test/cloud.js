const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os'),http=require('http');
process.env.RENT_CLOUD_TEST='1';
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db3.json','utf8'));
const SV={doc:{data:D,rev:5},role:'admin',hist:[],saves:0};
const srv=http.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{
  const u=new URL(q.url,'http://x'),send=(c,o)=>{r.writeHead(c,{'Content-Type':'application/json'});r.end(JSON.stringify(o))};
  if(u.pathname==='/auth/v1/token'){const j=JSON.parse(b||'{}');if(j.password==='bad')return send(400,{error_description:'Invalid login credentials'});return send(200,{access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u1',email:'a@b.c'}})}
  if(q.headers.authorization!=='Bearer t')return send(401,{message:'JWT'});
  if(u.pathname==='/rest/v1/profiles')return send(200,SV.role?[{role:SV.role}]:[]);
  if(u.pathname==='/rest/v1/app_docs')return send(200,SV.doc?[{data:SV.doc.data,rev:SV.doc.rev,updated_at:'2026-01-01'}]:[]);
  if(u.pathname==='/rest/v1/rpc/save_doc'){const j=JSON.parse(b);SV.saves++;
    if(SV.role==='viewer')return send(403,{message:'FORBIDDEN'});
    const cur=SV.doc?SV.doc.rev:0;if(cur!==j.p_base_rev)return send(400,{code:'P0001',message:'REV_CONFLICT'});
    SV.doc={data:j.p_data,rev:cur+1};return send(200,cur+1)}
  send(404,{message:'nf'})})});
const sl=ms=>new Promise(r=>setTimeout(r,ms));
srv.listen(0,'127.0.0.1',async()=>{const port=srv.address().port;
 await sl(2500);const w=BrowserWindow.getAllWindows()[0];w.setSize(1500,1000);
 const run=c=>w.webContents.executeJavaScript(c);
 const first=(d)=>{const pid=Object.keys(d.projects).find(k=>(d.projects[k].contracts||[]).length>2);return pid};
 const R={};
 try{
  await run('window.__t=[];new MutationObserver(()=>__t.push(document.getElementById("toast").textContent)).observe(document.getElementById("toast"),{childList:true,characterData:true,subtree:true})');
  await run(`(async()=>{const r=await native.cloud('config','http://127.0.0.1:${port}','x'.repeat(40));if(!r.ok)throw new Error(r.m);
   const l=await native.cloud('login','a@b.c','bad');window.__bad=l.m;await native.cloud('login','a@b.c','good');await native.cloud('on',true);
   S.cl.on=true;S.cl.email='a@b.c';await clPull(true);render()})()`);
  R.bad=await run('window.__bad');
  R.pull=await run('S.cl.rev+" "+Object.keys(S.db.projects).length+" role="+S.cl.role');
  // 2) تعديل محلي → رفع
  await run(`(()=>{const d=S.db,pid=Object.keys(d.projects).find(k=>(d.projects[k].contracts||[]).length>2);window.__pid=pid;d.projects[pid].contracts[0].tenant='مستأجر محلي 1';persist();window.__f=flush().catch(e=>{window.__fe=String(e.stack)})})()`);
  await sl(1500);R.push1=SV.doc.rev+' '+SV.doc.data.projects[await run('__pid')].contracts[0].tenant;
  // 3) تعديل آخر في عقد مختلف من مستخدم آخر + تعديل محلي بعقد ثالث => دمج تلقائي
  const pid=await run('__pid');
  SV.doc.data.projects[pid].contracts[1].tenant='مستأجر الآخر 2';SV.doc.rev++;
  await run(`(()=>{S.db.projects[__pid].contracts[2].tenant='مستأجر محلي 3';persist();window.__f=flush().catch(e=>{window.__fe=String(e.stack)});flush()})()`);
  await sl(1800);
  R.toasts=await run('JSON.stringify(__t)');R.fe=await run('window.__fe+" busy="+S.cl.busy+" dirty="+dirty+" st="+S.cl.st+" ro="+S.cl.ro+" toast="+((document.querySelector(".toast")||{}).textContent)');R.merge=await run(`JSON.stringify([S.db.projects[__pid].contracts.slice(0,3).map(c=>c.tenant),!!document.querySelector('#stm[open]')])`);
  R.srvMerge=JSON.stringify(SV.doc.data.projects[pid].contracts.slice(0,3).map(c=>c.tenant))+' rev='+SV.doc.rev+' loc='+await run('S.cl.rev');
  // 4) تعارض على نفس الحقل
  SV.doc.data.projects[pid].contracts[0].tenant='الآخر يغلب';SV.doc.rev++;
  await run(`(()=>{S.db.projects[__pid].contracts[0].tenant='أنا';persist();window.__f=flush().catch(e=>{window.__fe=String(e.stack)});flush()})()`);
  await sl(1800);
  R.conf=await run(`JSON.stringify([S.db.projects[__pid].contracts[0].tenant,!!document.querySelector('#stm[open]'),(document.querySelector('#stm li')||{}).textContent])`);
  await run(`document.querySelector('[data-a="clMine"]').click()`);await sl(1800);
  R.mine=SV.doc.data.projects[pid].contracts[0].tenant+' rev='+SV.doc.rev;
  // 5) تحديث دوري
  SV.doc.data.projects[pid].contracts[3].tenant='تحديث دوري';SV.doc.rev++;
  await run('clPoll()');await sl(500);
  R.poll=await run(`S.db.projects[__pid].contracts[3].tenant+' '+S.cl.rev`);
  // 6) مشاهد فقط
  SV.role='viewer';await run('(async()=>{const r=await native.cloud("role");S.cl.role=r.v;S.cl.ro=true})()');
  const before=SV.saves;await run('persist();window.__f=flush().catch(e=>{window.__fe=String(e.stack)})');await sl(1200);R.viewer='saves='+(SV.saves-before);
  // 7) رفع محلي إلى سحابة فارغة
  SV.role='admin';SV.doc=null;await run('S.cl.ro=false;S.cl.role="admin"');
  await run(`(()=>{const b=document.createElement('button');b.dataset.armed=1;act.clUp(b)})()`);await sl(1500);
  R.up=SV.doc?SV.doc.rev+' '+Object.keys(SV.doc.data.projects).length:'none';
  await run('clDlg()');await sl(400);R.dlg=await run('document.querySelector("#stm h2").textContent+" "+document.querySelectorAll("#stm button").length');R.upmsg=await run(`(document.getElementById('cl_msg')||{}).textContent`);
 }catch(e){R.err=String(e.stack||e)}
 console.log(JSON.stringify(R,null,1));app.exit(0)});
