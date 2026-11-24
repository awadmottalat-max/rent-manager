const{app,BrowserWindow,ipcMain,dialog,shell,Menu,nativeImage}=require('electron');
const path=require('path'),fs=require('fs');
let autoUpdater=null;try{autoUpdater=require('electron-updater').autoUpdater}catch{}
let win=null,cfgPath,dataDir,lastBackup=0;
const{pngToIco}=require('./src/ico.js');
const FILE='rent-data.json',MAXB=40;
const exists=p=>{try{fs.accessSync(p);return true}catch{return false}};
function readCfg(){try{return JSON.parse(fs.readFileSync(cfgPath,'utf8'))}catch{return{}}}
function init(){
  cfgPath=path.join(app.getPath('userData'),'config.json');
  const c=readCfg();dataDir=c.dataDir&&exists(c.dataDir)?c.dataDir:path.join(app.getPath('userData'),'data');
  fs.mkdirSync(path.join(dataDir,'backups'),{recursive:true});
}
const dataFile=()=>path.join(dataDir,FILE),bdir=()=>path.join(dataDir,'backups');
function atomicWrite(file,txt){const t=file+'.tmp';const fd=fs.openSync(t,'w');fs.writeSync(fd,txt);fs.fsyncSync(fd);fs.closeSync(fd);fs.renameSync(t,file)}
const stamp=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`};
function backup(tag){
  if(!exists(dataFile()))return null;
  const f=path.join(bdir(),`rent-${stamp()}${tag?'-'+tag:''}.json`);fs.copyFileSync(dataFile(),f);lastBackup=Date.now();
  const all=fs.readdirSync(bdir()).filter(n=>/^rent-.*\.json$/.test(n)).sort();
  // لا نحذف نسخ ما قبل الاستيراد/الاستعادة تلقائيًا إلا إذا زادت كثيرًا
  const auto=all.filter(n=>!/-(import|restore|manual)\.json$/.test(n));
  while(auto.length>MAXB)fs.unlinkSync(path.join(bdir(),auto.shift()));
  return f;
}
function load(){
  const f=dataFile();
  const tryRead=p=>{try{const j=JSON.parse(fs.readFileSync(p,'utf8'));return j&&j.projects?j:null}catch{return null}};
  let d=exists(f)?tryRead(f):null,recovered=false;
  if(!d&&exists(f)){ // الملف تالف: نحاول آخر نسخة سليمة
    const bs=fs.readdirSync(bdir()).filter(n=>/\.json$/.test(n)).sort().reverse();
    for(const n of bs){d=tryRead(path.join(bdir(),n));if(d){recovered=n;break}}
    fs.renameSync(f,f+'.corrupt-'+stamp());
  }
  return{data:d,recovered,dir:dataDir};
}
function save(data){
  if(Date.now()-lastBackup>24*3600e3)backup('auto');
  atomicWrite(dataFile(),JSON.stringify(data));return true;
}
/* ---------- أيقونة مخصصة ---------- */
const iconPng=()=>path.join(app.getPath('userData'),'custom-icon.png'),iconIco=()=>path.join(app.getPath('userData'),'custom-icon.ico');
function updateShortcuts(useCustom){
  if(process.platform!=='win32'||!app.isPackaged)return 0;let n=0;
  const dirs=[app.getPath('desktop'),path.join(app.getPath('appData'),'Microsoft','Windows','Start Menu','Programs')];
  for(const d of dirs){let l;try{l=fs.readdirSync(d)}catch{continue}
    for(const f of l){if(!/\.lnk$/i.test(f))continue;const p=path.join(d,f);
      try{const o=shell.readShortcutLink(p);if(path.resolve(o.target||'').toLowerCase()!==path.resolve(process.execPath).toLowerCase())continue;
        if(shell.writeShortcutLink(p,'update',{icon:useCustom?iconIco():process.execPath,iconIndex:0}))n++}catch{}}}
  return n;
}
function applyWindowIcon(){
  const f=exists(iconPng())?iconPng():path.join(__dirname,'build','icon.png');
  try{win&&win.setIcon(nativeImage.createFromPath(f))}catch{}
}
function createWindow(){
  win=new BrowserWindow({width:1360,height:860,minWidth:980,minHeight:600,title:'متابعة الإيجارات وإدارة الأملاك',backgroundColor:'#edf0f3',icon:exists(iconPng())?iconPng():path.join(__dirname,'build','icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:false}});
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname,'src','index.html'));
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
}
const lock=app.requestSingleInstanceLock();
if(!lock)app.quit();else{
  app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}});
  app.whenReady().then(()=>{init();
    ipcMain.handle('data:load',()=>load());
    ipcMain.handle('data:save',(_e,d)=>save(d));
    ipcMain.on('data:saveSync',(e,d)=>{try{save(d);e.returnValue=true}catch{e.returnValue=false}});
    ipcMain.handle('backup:now',()=>backup('manual'));
    ipcMain.handle('backup:pre',(_e,tag)=>backup(tag));
    ipcMain.handle('backup:list',()=>fs.readdirSync(bdir()).filter(n=>/\.json$/.test(n)).sort().reverse().slice(0,60).map(n=>({name:n,size:fs.statSync(path.join(bdir(),n)).size,time:fs.statSync(path.join(bdir(),n)).mtimeMs})));
    ipcMain.handle('backup:read',(_e,n)=>{if(n!==path.basename(n))throw new Error('bad');return JSON.parse(fs.readFileSync(path.join(bdir(),n),'utf8'))});
    const attDir=()=>{const d=path.join(dataDir,'attachments');fs.mkdirSync(d,{recursive:true});return d};
    const attPath=f=>{if(!f||f!==path.basename(String(f)))throw new Error('bad');return path.join(attDir(),f)};
    ipcMain.handle('att:add',async()=>{
      const r=await dialog.showOpenDialog(win,{title:'اختر المرفقات',properties:['openFile','multiSelections']});
      if(r.canceled)return[];const out=[];
      for(const src of r.filePaths){const st=fs.statSync(src),id=Date.now().toString(36)+Math.random().toString(36).slice(2,7),ext=path.extname(src).replace(/[^\w.]/g,'').slice(0,12),f=id+ext;
        fs.copyFileSync(src,path.join(attDir(),f));out.push({id,name:path.basename(src),size:st.size,added:new Date().toISOString().slice(0,10),f})}
      return out;
    });
    ipcMain.handle('att:open',async(_e,f)=>{const p=attPath(f);if(!exists(p))return'الملف غير موجود (ربما حُذف من مجلد المرفقات)';return shell.openPath(p)});
    ipcMain.handle('att:del',(_e,f)=>{try{fs.unlinkSync(attPath(f))}catch{}return true});
    ipcMain.handle('att:dir',()=>shell.openPath(attDir()));
    ipcMain.handle('dir:open',()=>shell.openPath(dataDir));
    ipcMain.handle('ext:open',(_e,u)=>{u=String(u||'');if(!/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(u))return false;shell.openExternal(u);return true});
    ipcMain.handle('dir:info',()=>dataDir);
    ipcMain.handle('dir:change',async()=>{
      const r=await dialog.showOpenDialog(win,{title:'اختر مجلد التخزين',properties:['openDirectory','createDirectory']});
      if(r.canceled)return null;const nd=r.filePaths[0];
      fs.mkdirSync(path.join(nd,'backups'),{recursive:true});
      if(!exists(path.join(nd,FILE))&&exists(dataFile()))fs.copyFileSync(dataFile(),path.join(nd,FILE));
      try{const oa=path.join(dataDir,'attachments'),na=path.join(nd,'attachments');if(exists(oa)&&!exists(na))fs.cpSync(oa,na,{recursive:true})}catch{}
      fs.writeFileSync(cfgPath,JSON.stringify({dataDir:nd}));dataDir=nd;return nd;
    });
    ipcMain.handle('file:open',async(_e,filters)=>{
      const r=await dialog.showOpenDialog(win,{properties:['openFile'],filters});
      if(r.canceled)return null;const b=fs.readFileSync(r.filePaths[0]);
      return{name:path.basename(r.filePaths[0]),bytes:new Uint8Array(b)};
    });
    ipcMain.handle('file:save',async(_e,name,bytes)=>{
      const ext=path.extname(name).slice(1);
      const r=await dialog.showSaveDialog(win,{defaultPath:name,filters:[{name:ext.toUpperCase(),extensions:[ext]}]});
      if(r.canceled)return null;fs.writeFileSync(r.filePath,Buffer.from(bytes));return r.filePath;
    });
    ipcMain.handle('print:pdf',async(_e,name)=>{
      const r=await dialog.showSaveDialog(win,{defaultPath:name,filters:[{name:'PDF',extensions:['pdf']}]});
      if(r.canceled)return null;
      const pdf=await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true});
      fs.writeFileSync(r.filePath,pdf);return r.filePath;
    });
    ipcMain.handle('print:now',(_e,a5)=>{win.webContents.print(a5?{printBackground:true,pageSize:'A5',landscape:true,margins:{marginType:'none'}}:{printBackground:true})});
    ipcMain.handle('path:show',(_e,p)=>shell.showItemInFolder(p));
    ipcMain.handle('template:save',async()=>{
      const buf=await require('./src/template.js').build();
      const r=await dialog.showSaveDialog(win,{defaultPath:'قالب-استيراد-العقود.xlsx',filters:[{name:'Excel',extensions:['xlsx']}]});
      if(r.canceled)return null;fs.writeFileSync(r.filePath,buf);return r.filePath;
    });
    ipcMain.handle('icon:get',()=>exists(iconPng())?'data:image/png;base64,'+fs.readFileSync(iconPng()).toString('base64'):null);
    ipcMain.handle('icon:set',(_e,bytes)=>{
      const buf=Buffer.from(bytes);if(!nativeImage.createFromBuffer(buf).getSize().width)throw new Error('صورة غير صالحة');
      fs.writeFileSync(iconPng(),buf);fs.writeFileSync(iconIco(),pngToIco(buf,256));
      applyWindowIcon();return{shortcuts:updateShortcuts(true)};
    });
    ipcMain.handle('icon:reset',()=>{try{fs.unlinkSync(iconPng());fs.unlinkSync(iconIco())}catch{}applyWindowIcon();return{shortcuts:updateShortcuts(false)}});
    ipcMain.handle('app:version',()=>app.getVersion());
    ipcMain.handle('upd:check',()=>{if(!app.isPackaged||!autoUpdater)return{dev:true};return autoUpdater.checkForUpdates().then(r=>({ok:true,v:r?.updateInfo?.version})).catch(e=>({err:String(e.message||e)}))});
    ipcMain.handle('upd:install',()=>{if(autoUpdater)autoUpdater.quitAndInstall()});
    createWindow();
    if(exists(iconIco()))updateShortcuts(true);
    if(app.isPackaged&&autoUpdater){
      const send=(t,d)=>{try{win&&win.webContents.send('upd',{t,...d})}catch{}};
      autoUpdater.autoDownload=true;autoUpdater.autoInstallOnAppQuit=true;
      autoUpdater.on('update-available',i=>send('available',{v:i.version}));
      autoUpdater.on('download-progress',p=>send('progress',{pct:Math.round(p.percent)}));
      autoUpdater.on('update-downloaded',i=>send('ready',{v:i.version}));
      autoUpdater.on('error',e=>send('error',{m:String(e.message||e)}));
      win.webContents.once('did-finish-load',()=>setTimeout(()=>autoUpdater.checkForUpdates().catch(()=>{}),4000));
      setInterval(()=>autoUpdater.checkForUpdates().catch(()=>{}),30*60e3);win.on('focus',()=>{autoUpdater.checkForUpdates().catch(()=>{})});
    }
    app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow()});
  });
  app.on('window-all-closed',()=>app.quit());
}
