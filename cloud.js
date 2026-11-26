/* الاتصال بـ Supabase من العملية الرئيسية فقط (المفتاح والجلسة لا يصلان إلى صفحة التطبيق) */
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const DOC='main';
const DEF={url:'https://fiuzxwvqwkcbjykvulrz.supabase.co',key:'sb_publishable_aFAEk2aJfNnu8TzbW6vcAg_b7JkA2JB'}; // مفتاح عام مخصص للتطبيقات، الحماية في القاعدة (RLS)
module.exports=function(app,ipcMain,safeStorage,netFetch,attFile,openPath){
  const file=()=>path.join(app.getPath('userData'),'cloud.json');
  let cfg=null,mem=null; // mem: الجلسة في الذاكرة عند تعذّر التشفير
  const rd=()=>{if(cfg)return cfg;try{cfg=JSON.parse(fs.readFileSync(file(),'utf8'))}catch{cfg={}}if(!cfg.url||!cfg.key){cfg.url=DEF.url;cfg.key=DEF.key}return cfg};
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
  H('status',async()=>{const c=rd(),s=getSes();return{url:c.url||'',configured:true,email:s?s.email:'',signed:!!s,on:true,skip:process.env.RENT_NO_LOGIN==='1'}});
  H('config',async(url,key)=>{url=String(url||'').trim().replace(/\/+$/,'');key=String(key||'').trim();
    if(!URLRE.test(url)&&!(process.env.RENT_CLOUD_TEST&&/^http:\/\/127\.0\.0\.1:\d+$/.test(url)))throw err('رابط المشروع غير صحيح. الصيغة: https://xxxx.supabase.co');
    if(!KEYRE.test(key))throw err('المفتاح غير صحيح');
    if(/service_role/.test(Buffer.from(key.split('.')[1]||'','base64').toString()))throw err('هذا مفتاح service_role الخطير. استخدم مفتاح anon/publishable فقط');
    const c=rd();if(c.url!==url){setSes(null)}c.url=url;c.key=key;wr();return true});
  H('on',async v=>{const c=rd();c.on=!!v;wr();return true});
  const encOk=()=>{try{return safeStorage.isEncryptionAvailable()}catch{return false}};
  async function doLogin(email,pw,remember){
    email=String(email).trim();
    const j=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password:String(pw)})},false).catch(e=>{throw err(/Invalid login/i.test(e.message)?'البريد أو كلمة المرور غير صحيحة':(/fetch failed|network|timeout|abort/i.test(e.message)?'تعذّر الاتصال بالإنترنت':e.message))});
    keep(j,email);
    const pr=await raw('/rest/v1/profiles?select=role,full_name&user_id=eq.'+encodeURIComponent(getSes().uid));
    const role=pr&&pr[0]?pr[0].role:null,name=pr&&pr[0]&&pr[0].full_name||'';
    if(!role){setSes(null);throw err('هذا الحساب بلا صلاحية. اطلب من المدير إضافة دورك')}
    const c=rd();c.sv={email,name};
    if(remember&&encOk())c.sv.pw=safeStorage.encryptString(String(pw)).toString('base64');
    wr();
    return{email,role,name};
  }
  const savedPw=()=>{const c=rd();if(!c.sv||!c.sv.pw)return null;try{return safeStorage.decryptString(Buffer.from(c.sv.pw,'base64'))}catch{return null}};
  H('saved',async()=>{const c=rd();return{email:(c.sv&&c.sv.email)||'',name:(c.sv&&c.sv.name)||'',hasPw:!!savedPw(),canSave:encOk()}});
  H('login',async(email,pw,remember)=>doLogin(email,pw,!!remember));
  H('autologin',async()=>{const c=rd(),p=savedPw();if(!c.sv||!c.sv.email||!p)throw err('NO_SAVED');return doLogin(c.sv.email,p,true)});
  H('logout',async()=>{setSes(null);const c=rd();if(c.sv)delete c.sv.pw;wr();return true});
  H('role',()=>myRole());
  H('me',async()=>{const s=getSes();if(!s)return null;const r=await raw('/rest/v1/profiles?select=projects&user_id=eq.'+encodeURIComponent(s.uid));return{uid:s.uid,projects:(r&&r[0]&&r[0].projects)||[]}});
  H('get',async()=>{const r=await raw('/rest/v1/app_docs?select=data,rev,updated_at&id=eq.'+DOC);return r&&r[0]?r[0]:null});
  H('rev',async()=>{const r=await raw('/rest/v1/app_docs?select=rev,updated_at&id=eq.'+DOC);return r&&r[0]?r[0]:null});
  H('save',async(data,base)=>{const r=await raw('/rest/v1/rpc/save_doc',{method:'POST',body:JSON.stringify({p_id:DOC,p_base_rev:base,p_data:data})});return Number(r)});
  H('users',async body=>raw('/functions/v1/manage-users',{method:'POST',body:JSON.stringify(body)}));
  H('hist',async()=>raw('/rest/v1/app_doc_history?select=id,rev,saved_at&doc_id=eq.'+DOC+'&order=saved_at.desc&limit=50'));
  H('histGet',async id=>{const r=await raw('/rest/v1/app_doc_history?select=data&id=eq.'+Number(id));return r&&r[0]?r[0].data:null});
  H('histRestore',async id=>Number(await raw('/rest/v1/rpc/restore_history',{method:'POST',body:JSON.stringify({p_history_id:Number(id)})})));

  /* ===== الموافقات والمرفقات المؤقتة ===== */
  const MIME={'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
  const rpc=(fn,body)=>raw('/rest/v1/rpc/'+fn,{method:'POST',body:JSON.stringify(body)});
  async function stReq(method,p,body,ct){
    const c=rd(),t=await token();
    const r=await f(c.url+'/storage/v1/'+p,{method,headers:{apikey:c.key,Authorization:'Bearer '+t,...(ct?{'Content-Type':ct}:{})},body,signal:AbortSignal.timeout(60000)});
    return r;
  }
  async function stDel(paths){if(!paths||!paths.length)return;await stReq('DELETE','object/approvals',JSON.stringify({prefixes:paths}),'application/json').catch(()=>0)}
  H('apprList',async()=>raw('/rest/v1/approval_requests?select=*&order=created_at.desc&limit=300'));
  H('apprSubmit',async(kind,project,title,amount,payload,files)=>{
    const up=[],dir='u'+crypto.randomUUID();
    try{
      for(const [i,x] of (files||[]).entries()){
        const ext=path.extname(String(x.name||x.f||'')).toLowerCase(),mime=MIME[ext];
        if(!mime)throw err('نوع المرفق غير مدعوم ('+(ext||'؟')+'). المسموح: PDF أو صورة PNG/JPG');
        const p=attFile(x.f),buf=fs.readFileSync(p);
        if(buf.length>10*1048576)throw err('المرفق «'+x.name+'» أكبر من 10 MB');
        const sp=dir+'/'+(i+1)+ext,r=await stReq('POST','object/approvals/'+sp,buf,mime);
        if(!r.ok){const t=await r.text().catch(()=>'');throw err('تعذّر رفع المرفق «'+x.name+'»: '+t.slice(0,120))}
        up.push({path:sp,name:x.name,size:buf.length});
      }
      const id=await rpc('appr_submit',{p_kind:kind,p_project:project||'',p_title:title,p_amount:amount==null?null:Number(amount),p_payload:payload||{},p_files:up});
      return id;
    }catch(e){await stDel(up.map(u=>u.path));
      if(/FILES_REQUIRED/.test(e.message))throw err('المرفقات إلزامية لهذه العملية');
      throw e}
  });
  H('apprDecide',async(id,ok,note,all)=>rpc('appr_decide',{p_id:id,p_approve:!!ok,p_note:String(note||''),p_all:!!all}));
  H('apprApplied',async id=>{await rpc('appr_applied',{p_id:id});return true});
  H('apprCancel',async id=>{await rpc('appr_cancel',{p_id:id});return true});
  H('apprClean',async paths=>{await stDel((paths||[]).filter(p=>/^u[0-9a-f-]{36}\/\d+\.\w+$/.test(p)));return true});
  H('apprOpen',async(sp,name)=>{
    if(!/^u[0-9a-f-]{36}\/\d+\.\w+$/.test(String(sp)))throw err('BAD_PATH');
    const r=await stReq('GET','object/authenticated/approvals/'+sp);
    if(!r.ok)throw err('المرفق غير متاح (ربما حُذف بعد الاعتماد)');
    const d=path.join(os.tmpdir(),'kathib-approvals');fs.mkdirSync(d,{recursive:true});
    const fp=path.join(d,crypto.randomBytes(4).toString('hex')+'-'+String(name||'file').replace(/[^\w.\u0600-\u06FF-]/g,'_'));
    fs.writeFileSync(fp,Buffer.from(await r.arrayBuffer()));
    const m=await openPath(fp);return m||true;
  });
};
