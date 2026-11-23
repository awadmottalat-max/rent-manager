const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
const ud=fs.mkdtempSync(path.join(os.tmpdir(),'rent-'));app.setPath('userData',ud);app.commandLine.appendSwitch('no-sandbox');
const F=process.env.FILE||'rent-data.json';fs.writeFileSync(path.join(ud,F),fs.readFileSync(process.env.DB||'/tmp/db2.json'));
require('../main.js');
app.whenReady().then(async()=>{const w=BrowserWindow.getAllWindows()[0];w.webContents.on('console-message',(e,l,m)=>{if(l>=2)console.log('CONSOLE',m)});await new Promise(r=>setTimeout(r,4000));
 console.log('NAV',await w.webContents.executeJavaScript("document.getElementById('nav').children.length+' view='+document.getElementById('view').innerHTML.length+' ver='+S.ver+' projs='+Object.keys(S.db.projects).length"));
 require('fs').writeFileSync('/tmp/boot.png',(await w.webContents.capturePage()).toPNG());app.exit(0)});
