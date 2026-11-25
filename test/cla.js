const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os'),http=require('http');
process.env.RENT_CLOUD_TEST='1';
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const D=JSON.parse(fs.readFileSync('/tmp/db3.json','utf8'));const SV={doc:null,role:'admin'};
const srv=http.createServer((q,r)=>{let b='';q.setEncoding('utf8');q.on('data',c=>b+=c);q.on('end',()=>{const u=new URL(q.url,'http://x'),send=(c,o)=>{r.writeHead(c,{'Content-Type':'application/json'});r.end(JSON.stringify(o))};
 if(u.pathname==='/auth/v1/token')return send(200,{access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u1',email:'a@b.c'}});
 if(u.pathname==='/rest/v1/profiles')return send(200,[{role:SV.role}]);
 if(u.pathname==='/rest/v1/app_docs')return send(200,SV.doc?[{data:SV.doc.data,rev:SV.doc.rev}]:[]);
 if(u.pathname==='/rest/v1/rpc/save_doc'){const j=JSON.parse(b);const cur=SV.doc?SV.doc.rev:0;if(cur!==j.p_base_rev)return send(400,{message:'REV_CONFLICT'});SV.doc={data:j.p_data,rev:cur+1};return send(200,cur+1)}send(404,{})})});
srv.listen(0,'127.0.0.1',async()=>{const port=srv.address().port;await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];
 const R={};try{R.o=await w.webContents.executeJavaScript(`(async()=>{normalize(${JSON.stringify(D)});S.db=normalize(${JSON.stringify(D)});
  await native.cloud('config','http://127.0.0.1:${port}','x'.repeat(40));await native.cloud('login','a@b.c','p');await native.cloud('on',true);S.cl.on=true;S.cl.email='a@b.c';
  const ok=await clPull(true);return ok+' '+S.cl.rev+' '+(S.cl.lastUp||'')+' ST='+document.getElementById('toast').textContent})()`);
 R.base=await w.webContents.executeJavaScript('JSON.stringify(S.cl.base)');const d=(a,b,p,o)=>{if(a===b)return;if(a&&b&&typeof a=='object'&&typeof b=='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))d(a[k],b[k],p+'/'+k,o)}else if(o.length<6)o.push(p+' '+JSON.stringify(a)+' vs '+JSON.stringify(b))};const o=[];if(SV.doc)d(JSON.parse(R.base),SV.doc.data,'',o);R.diff=o;R.base=undefined;R.cmp1=await w.webContents.executeJavaScript('clCompare()');await w.webContents.executeJavaScript(`(()=>{const p=Object.keys(S.db.projects)[0];S.db.projects[p].contracts[0].tenant='تغيير محلي';})()`);R.cmp2=(await w.webContents.executeJavaScript('clCompare()')).slice(0,400);R.srv=SV.doc?SV.doc.rev+' projects='+Object.keys(SV.doc.data.projects).length:'none'}catch(e){R.e=String(e)}
 console.log(JSON.stringify(R,null,1));app.exit(0)});
