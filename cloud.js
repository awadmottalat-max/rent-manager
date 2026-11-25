/* الاتصال بـ Supabase من العملية الرئيسية فقط (المفتاح والجلسة لا يصلان إلى صفحة التطبيق) */
const fs=require('fs'),path=require('path');
const DOC='main';
module.exports=function(app,ipcMain,safeStorage,netFetch){
  const file=()=>path.join(app.getPath('userData'),'cloud.json');
  let cfg=null,mem=null; // mem: الجلسة في الذاكرة عند تعذّر التشفير
  const rd=()=>{if(cfg)return cfg;try{cfg=JSON.parse(fs.readFileSync(file(),'utf8'))}catch{cfg={}}return cfg};
  const wr=()=>{const t=file()+'.tmp';fs.writeFileSync(t,JSON.stringify(cfg));fs.renameSync(t,file())};
  const URLRE=/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.supabase\.(co|in)$/i;
  const KEYRE=/^[A-Za-z0-9_\-.]{20,}$/;
  const getSes=()=>{const c=rd();if(mem)return mem;if(!c.ses)return null;try{return JSON.parse(safeStorage.decryptString(Buffer.from(c.ses,'base64')))}catch{return null}};
  const setSes=s=>{const c=rd();mem=null;
    if(!s){delete c.ses;wr();return}
    if(safeStorage.isEncryptionAvailable()){c.ses=safeStorage.encryptString(JSON.stringify(s)).toString('base64');wr()}else mem=s};
  const f=(u,o)=>(netFetch||fetch)(u,o);
  const err=(m,code)=>Object.assign(new Error(m),{code:code||(/^[A-Z_]+$/.test(m)?m:undefined)});
  async function raw(p,o={},auth=true){
    const c=rd();if(!c.url||!c.key)throw err('NO_CONFIG');
    const h={apikey:c.key,'Content-Type':'application/json',...(o.headers||{})};
    if(auth){const t=await token();h.Authorization='Bearer '+t}
    const r=await f(c.url+p,{...o,headers:h,signal:AbortSignal.timeout(25000)});
    const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch{}
    if(!r.ok){const m=(j&&(j.message||j.msg||j.error_description||j.error))||('HTTP '+r.status);
      if(/REV_CONFLICT/.test(m))throw err('REV_CONFLICT');
      if(/FORBIDDEN/.test(m)||r.status===403)throw err('FORBIDDEN');
      if(r.status===401)throw err('AUTH');
      throw err(String(m).slice(0,200))}
    return j;
  }
  async function token(){
    const s=getSes();if(!s)throw err('AUTH');
    if(s.exp-Date.now()>60e3)return s.at;
    const j=await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.rt})},false).catch(e=>{if(e.message!=='AUTH'&&!/refresh|invalid|HTTP 4/i.test(e.message))throw e;setSes(null);throw err('AUTH')});
    keep(j,s.email);return j.access_token;
  }
  function keep(j,email){setSes({at:j.access_token,rt:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,uid:j.user&&j.user.id||(getSes()||{}).uid,email:email||(j.user&&j.user.email)||''})}
  async function myRole(){const s=getSes();if(!s)return null;const r=await raw('/rest/v1/profiles?select=role&user_id=eq.'+encodeURIComponent(s.uid));return r&&r[0]?r[0].role:null}
  const H=(n,fn)=>ipcMain.handle('cloud:'+n,async(_e,...a)=>{try{return{ok:true,v:await fn(...a)}}catch(e){return{ok:false,e:e.code||'ERR',m:String(e.message||e)}}});
  H('status',async()=>{const c=rd(),s=getSes();return{url:c.url||'',configured:!!(c.url&&c.key),email:s?s.email:'',signed:!!s,on:!!c.on}});
  H('config',async(url,key)=>{url=String(url||'').trim().replace(/\/+$/,'');key=String(key||'').trim();
    if(!URLRE.test(url)&&!(process.env.RENT_CLOUD_TEST&&/^http:\/\/127\.0\.0\.1:\d+$/.test(url)))throw err('رابط المشروع غير صحيح. الصيغة: https://xxxx.supabase.co');
    if(!KEYRE.test(key))throw err('المفتاح غير صحيح');
    if(/service_role/.test(Buffer.from(key.split('.')[1]||'','base64').toString()))throw err('هذا مفتاح service_role الخطير. استخدم مفتاح anon/publishable فقط');
    const c=rd();if(c.url!==url){setSes(null)}c.url=url;c.key=key;wr();return true});
  H('on',async v=>{const c=rd();c.on=!!v;wr();return true});
  H('login',async(email,pw)=>{
    const j=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:String(email).trim(),password:String(pw)})},false).catch(e=>{throw err(/Invalid login/i.test(e.message)?'البريد أو كلمة المرور غير صحيحة':e.message)});
    keep(j,String(email).trim());const role=await myRole();
    if(!role){setSes(null);throw err('هذا الحساب بلا صلاحية. اطلب من المدير إضافة دورك')}
    return{email:String(email).trim(),role}});
  H('logout',async()=>{setSes(null);return true});
  H('role',()=>myRole());
  H('get',async()=>{const r=await raw('/rest/v1/app_docs?select=data,rev,updated_at&id=eq.'+DOC);return r&&r[0]?r[0]:null});
  H('rev',async()=>{const r=await raw('/rest/v1/app_docs?select=rev,updated_at&id=eq.'+DOC);return r&&r[0]?r[0]:null});
  H('save',async(data,base)=>{const r=await raw('/rest/v1/rpc/save_doc',{method:'POST',body:JSON.stringify({p_id:DOC,p_base_rev:base,p_data:data})});return Number(r)});
  H('users',async body=>raw('/functions/v1/manage-users',{method:'POST',body:JSON.stringify(body)}));
  H('hist',async()=>raw('/rest/v1/app_doc_history?select=id,rev,saved_at&doc_id=eq.'+DOC+'&order=saved_at.desc&limit=50'));
  H('histGet',async id=>{const r=await raw('/rest/v1/app_doc_history?select=data&id=eq.'+Number(id));return r&&r[0]?r[0].data:null});
  H('histRestore',async id=>Number(await raw('/rest/v1/rpc/restore_history',{method:'POST',body:JSON.stringify({p_history_id:Number(id)})})));
};
