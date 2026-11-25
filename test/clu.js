const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os'),http=require('http');
process.env.RENT_CLOUD_TEST='1';
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'rent-')));app.commandLine.appendSwitch('no-sandbox');require('../main.js');
const U=[{id:'362dfcae-f87b-4e3b-8e20-e7e69f90241b',email:'me@x.com',role:'admin',full_name:'أنا',me:true,last_sign_in_at:'2026-11-25T10:00:00Z'}];const calls=[];
const srv=http.createServer((q,r)=>{let b='';q.setEncoding('utf8');q.on('data',c=>b+=c);q.on('end',()=>{const u=new URL(q.url,'http://x'),send=(c,o)=>{r.writeHead(c,{'Content-Type':'application/json'});r.end(JSON.stringify(o))};
 if(u.pathname==='/auth/v1/token')return send(200,{access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u1',email:'a@b.c'}});
 if(u.pathname==='/rest/v1/profiles')return send(200,[{role:'admin'}]);
 if(u.pathname==='/functions/v1/manage-users'){const j=JSON.parse(b);calls.push(j);
  if(j.action==='list')return send(200,{users:U});
  if(j.action==='create'){if(j.password.length<10)return send(400,{error:'كلمة المرور قصيرة'});U.push({id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',email:j.email,role:j.role,full_name:j.full_name});return send(200,{ok:true})}
  if(j.action==='setRole'){const x=U.find(z=>z.id===j.user_id);if(x)x.role=j.role;return send(200,{ok:true})}
  if(j.action==='remove'){const i=U.findIndex(z=>z.id===j.user_id);U.splice(i,1);return send(200,{ok:true})}
  return send(200,{ok:true})}
 send(404,{})})});
srv.listen(0,'127.0.0.1',async()=>{const port=srv.address().port;await new Promise(r=>setTimeout(r,2500));const w=BrowserWindow.getAllWindows()[0];w.setSize(1400,900);
 const run=c=>w.webContents.executeJavaScript(c);const R={};
 try{await run(`(async()=>{await native.cloud('config','http://127.0.0.1:${port}','x'.repeat(40));await native.cloud('login','a@b.c','p');S.cl.on=true;S.cl.role='admin';S.cl.email='a@b.c';go('settings')})()`);
  const sl=ms=>new Promise(r=>setTimeout(r,ms));await sl(300);
  R.btn=await run(`!!document.querySelector('#view [data-a="clUsers"]')`);
  await run(`document.querySelector('#view [data-a="clUsers"]').click()`);await sl(400);
  R.rows=await run(`document.querySelectorAll('#stm tbody tr').length`);
  await run(`document.querySelector('[data-a="clUAdd"]').click()`);await sl(300);
  R.pwdef=(await run(`document.getElementById('ff_pw').value`)).length;
  await run(`document.getElementById('ff_email').value='new@x.com';document.getElementById('ff_name').value='موظف';document.getElementById('ff_role').value='viewer';document.getElementById('fsave').click()`);await sl(700);
  R.rows2=await run(`document.querySelectorAll('#stm tbody tr').length`);
  R.msg=await run(`(document.querySelector('#stm .sub')||{}).textContent`);
  await run(`const s=document.querySelector('.clur[data-i="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]');s.value='editor';s.dispatchEvent(new Event('change',{bubbles:true}))`);await sl(300);
  R.calls=calls.map(c=>c.action+(c.role?':'+c.role:'')).join(',');
  fs.writeFileSync('/tmp/clu.png',(await w.webContents.capturePage()).toPNG());
 }catch(e){R.e=String(e)}console.log(JSON.stringify(R,null,1));app.exit(0)});
