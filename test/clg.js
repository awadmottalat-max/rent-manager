const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os'),http=require('http');
process.env.RENT_CLOUD_TEST='1';
{const{safeStorage}=require('electron');safeStorage.isEncryptionAvailable=()=>true;safeStorage.encryptString=s=>Buffer.from('ENC'+s);safeStorage.decryptString=b=>b.toString().slice(3)}
const ud=fs.mkdtempSync(path.join(os.tmpdir(),'rent-'));app.setPath('userData',ud);app.commandLine.appendSwitch('no-sandbox');app.commandLine.appendSwitch('password-store','basic');
const D=JSON.parse(fs.readFileSync('/tmp/db3.json','utf8'));const sl=ms=>new Promise(r=>setTimeout(r,ms));
const srv=http.createServer((q,r)=>{let b='';q.setEncoding('utf8');q.on('data',c=>b+=c);q.on('end',()=>{const u=new URL(q.url,'http://x'),send=(c,o)=>{r.writeHead(c,{'Content-Type':'application/json'});r.end(JSON.stringify(o))};
 if(u.pathname==='/auth/v1/token'){const j=JSON.parse(b||'{}');if(j.password!=='Secret12345')return send(400,{error_description:'Invalid login credentials'});return send(200,{access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u1',email:j.email}})}
 if(q.headers.authorization!=='Bearer t')return send(401,{message:'JWT'});
 if(u.pathname==='/rest/v1/profiles')return send(200,[{role:'editor',full_name:'موظف الحسابات'}]);
 if(u.pathname==='/rest/v1/app_docs')return send(200,[{data:D,rev:5}]);
 send(404,{})})});
srv.listen(0,'127.0.0.1',async()=>{const port=srv.address().port;
 fs.writeFileSync(path.join(ud,'cloud.json'),JSON.stringify({url:'http://127.0.0.1:'+port,key:'x'.repeat(40)}));
 require('../main.js');await app.whenReady();await sl(3000);
 const w=BrowserWindow.getAllWindows()[0];w.setSize(1400,900);const run=c=>w.webContents.executeJavaScript(c);const R={};
 try{
  R.gate=await run(`!!document.getElementById('clg')`);
  R.viewEmpty=await run(`document.getElementById('view').children.length===0&&document.getElementById('nav').children.length===0`);
  await run(`document.getElementById('clg_e').value='emp@x.com';document.getElementById('clg_p').value='wrong';document.querySelector('#clg form').requestSubmit()`);await sl(600);
  R.badMsg=await run(`document.getElementById('clg_m').textContent`);R.stillGate=await run(`!!document.getElementById('clg')`);
  await run(`document.getElementById('clg_p').value='Secret12345';document.querySelector('#clg form').requestSubmit()`);await sl(1500);
  R.opened=await run(`!document.getElementById('clg')&&document.getElementById('nav').children.length>0`);
  R.who=await run(`(document.querySelector('#nav .who')||{}).textContent`);
  R.lastNav=await run(`[...document.querySelectorAll('#nav button')].pop().textContent`);
  const raw=fs.readFileSync(path.join(ud,'cloud.json'),'utf8');R.plainPwInFile=raw.includes('Secret12345');R.hasEnc=!!JSON.parse(raw).sv&&!!JSON.parse(raw).sv.pw;
  R.saved=JSON.stringify((await run(`native.cloud('saved')`)).v);
  R.autoGate=await run(`(async()=>{const ok=await clGate();return ok+' gateShown='+!!document.getElementById('clg')+' email='+S.cl.email})()`);
  await run(`native.cloud('logout')`);R.afterLogoutSaved=JSON.stringify((await run(`native.cloud('saved')`)).v);
 }catch(e){R.e=String(e)}console.log(JSON.stringify(R,null,1));app.exit(0)});
