const{app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path'),os=require('os');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rent-'));app.setPath('userData',tmp);
app.commandLine.appendSwitch('no-sandbox');
require('../main.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out=process.env.SHOTS||'/tmp/shots';fs.mkdirSync(out,{recursive:true});
app.whenReady().then(async()=>{
  await sleep(2500);const w=BrowserWindow.getAllWindows()[0];const ev=c=>w.webContents.executeJavaScript(c);
  const errs=[];w.webContents.on('console-message',(e)=>{const l=e.level;if(l==='error'||l===3)errs.push(e.message)});
  w.webContents.on('did-fail-load',(e,c,d)=>errs.push('fail '+d));
  const shot=async n=>{await sleep(300);fs.writeFileSync(path.join(out,n+'.png'),(await w.webContents.capturePage()).toPNG())};
  const pdf=async(n,html)=>{await ev(`document.getElementById('printarea').innerHTML=${JSON.stringify(html)};document.body.classList.add('pr')`);await sleep(400);fs.writeFileSync(path.join(out,n+'.pdf'),await w.webContents.printToPDF({printBackground:true,preferCSSPageSize:true}));await ev(`document.body.classList.remove('pr')`)};
  const b64=fs.readFileSync(process.argv.find(a=>a.endsWith('.xlsx'))).toString('base64');
  await ev(`(()=>{const bin=atob("${b64}");const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    S.imp=parseWb(XLSX,XLSX.read(u,{type:'array'}));S.db.projects=applyImp(P(),S.imp,'replace').next;persist();render();})()`);
  for(const v of ['dash','avail','contracts','ended','due','flow','renew','props','owners','tenants','agr','fin','rep','settings']){await ev(`go('${v}')`);await shot(v)}
  await ev(`J.soon()`);await shot('due30');
  await ev(`go('contracts');const pid=Object.keys(P())[0];openDet(pid,P()[pid].contracts[3].id)`);await shot('detail');
  await pdf('contract',await ev(`contractDoc(cur())`));
  await ev(`document.getElementById('det').close();go('contracts')`);
  await pdf('list',await ev(`(()=>{S.pm=null;render();return listDoc()})()`));
  await ev(`J.soon()`);await pdf('cash',await ev(`(()=>{S.due.print=true;S.pm=dueModel(rows());S.due.print=false;return listDoc()})()`));
  await ev(`go('owners');ownerDlg(ownerStatements(rows())[3].name)`);await shot('owner');await ev(`document.getElementById('stm').close()`);
  await ev(`(()=>{const pid=Object.keys(P())[0],c=P()[pid].contracts[3];payForm(pid,c.id,1000);document.getElementById('ff_from').value='2026-01-01';document.getElementById('ff_to').value='2026-03-31';document.getElementById('fsave').click()})()`);await sleep(400);await shot('receipt_ask');
  const rc=await ev(`(()=>{const{pid,cid,payId}=S.rc;return receiptDoc(pid,cid,payId).html})()`);await pdf('receipt',rc);
  await ev(`document.getElementById('frm').close();go('flow')`);await shot('flow2');await ev(`S.flow.mode='act';render()`);await shot('flow_act');
  await ev(`(()=>{const pid=Object.keys(P())[0],c=P()[pid].contracts[3];go('agr');agrForm(null);document.getElementById('ag_pick').value=pid+'|'+c.id;agrPick(pid+'|'+c.id);document.querySelector('.ai_m').checked=true;agrPreview()})()`);await shot('agr_form');
  await ev(`document.getElementById('ag_save').click()`);await sleep(300);await shot('agr_list');
  await pdf('agr',await ev(`agrDoc(S.db.agreements[0])`));
  await ev(`(()=>{const pid=Object.keys(P())[0],c=P()[pid].contracts[3];go('fin');anForm(null);document.getElementById('an_pick').value=pid+'|'+c.id;document.getElementById('an_pick').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('an_maint').value=500;anPreview()})()`);await shot('fin_form');
  await ev(`document.getElementById('an_save').click()`);await sleep(300);await shot('fin_list');
  await pdf('ana',await ev(`anDoc(S.db.analyses[0])`));
  await ev(`go('rep');S.rp.tab='owner';S.rp.owner=ownerNames(rows())[5];render()`);await shot('rep_owner');
  await ev(`S.rp.tab='tenant';S.rp.tenant=tenantNames(rows())[7];render()`);await shot('rep_tenant');
  await ev(`S.rp.tab='tab';S.rp.rep='age';render()`);await shot('rep_tab');
  await ev(`S.pr.tab='units';go('props')`);await shot('props_units');
  await ev(`S.en.s='all';go('ended')`);await shot('ended_all');
  await ev(`go('contracts');contractForm(false)`);await sleep(200);await shot('contract_new');await ev(`document.getElementById('cf_save')&&(()=>{const E=(i,v)=>{const e=document.getElementById(i);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))};E('cf_period','__c');document.getElementById('cf_pm').value=5;document.getElementById('cf_pm').dispatchEvent(new Event('input',{bubbles:true}));E('cf_freq','s');document.getElementById('cf_fqv').value=2;setDate('cf_start','2026-12-01');document.getElementById('cf_start').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('cf_rent').value=20000;document.getElementById('cf_rent').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#frm').scrollTo(0,400)})()`);await sleep(200);await shot('contract_new2');await ev(`(()=>{const pid=Object.keys(P())[0],c=P()[pid].contracts.find(c=>calc(c,MODE(),TODAY).st==='ساري'&&c.rent);document.getElementById('frm').close();payForm(pid,c.id,'')})()`);await sleep(200);await shot('pay_form');await ev(`(()=>{const pid=Object.keys(P())[0],c=P()[pid].contracts.find(c=>calc(c,MODE(),TODAY).st==='ساري');document.getElementById('frm').close();exitForm(pid,c.id)})()`);await sleep(200);await shot('exit_form');await ev(`document.getElementById('frm').close()`);
  const f1=await ev(`(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));contractForm(false);const E=(i,v,ev='change')=>{const e=document.getElementById(i);e.value=v;e.dispatchEvent(new Event(ev,{bubbles:true}))};
    const pids=Object.keys(P());const pid=pids[3];E('cf_pid',pid);await sl(50);
    const ui=document.querySelector('#cb_unit input');ui.focus();ui.dispatchEvent(new Event('focus'));await sl(50);const unitOpts=document.querySelectorAll('#cb_unit .cbo').length;
    const oi=document.querySelector('#cb_owner input');oi.dispatchEvent(new Event('focus'));await sl(50);const ownGrp=[...document.querySelectorAll('#cb_owner .cbg')].map(x=>x.textContent).join('|');const ownN=document.querySelectorAll('#cb_owner .cbo').length;
    const allOwn=new Set();for(const p of Object.values(P()))for(const c of p.contracts)if(c.owner)allOwn.add(c.owner);
    ui.value='Z-999';ui.dispatchEvent(new Event('input'));await sl(50);const addBtn=!!document.querySelector('#cb_unit .cbo.add');const nuShown=!document.getElementById('nu').hidden;
    document.querySelector('#cb_unit .cbo.add').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await sl(50);
    oi.value='مالك تجريبي جديد';oi.dispatchEvent(new Event('input'));await sl(30);const noShown=!document.getElementById('no').hidden;E('no_phone','0500000000','input');
    const ti=document.querySelector('#cb_ten input');ti.value='مستأجر تجريبي';ti.dispatchEvent(new Event('input'));await sl(30);
    E('cf_rent','50000','input');E('cf_freq','n');E('cf_fqv','2','input');E('cf_period','6 أشهر');E('cf_start','2026-12-01');const end=document.getElementById('cf_end').value;
    document.getElementById('cf_save').click();await sl(150);
    const c=P()[pid].contracts.find(c=>c.unit==='Z-999');const u=P()[pid].units.find(u=>u.no==='Z-999');const reg=(S.db.parties?.owners||[]).some(r=>r.name==='مالك تجريبي جديد'&&r.phone==='0500000000');
    return JSON.stringify({unitOpts,ownGrp,ownN,totalOwners:allOwn.size,addBtn,nuShown,noShown,end,saved:!!c,unitCreated:!!u,ownerReg:reg,ownerOnUnit:u&&u.owner})})()`);
  console.log('FORM',f1);
  const f2=await ev(`(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));const out={};
    const set=(i,v)=>{const e=document.getElementById(i);if(!e)throw new Error('no '+i);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};
    // project
    projForm(null);set('ff_name','مشروع اختبار');document.getElementById('fsave').click();await sl(100);const np=Object.keys(P()).find(k=>P()[k].name==='مشروع اختبار');out.proj=!!np;
    // unit
    unitForm(np,null);set('ff_no','T-1');set('ff_owner','مالك اختبار');set('ff_askRent','30000');document.getElementById('fsave').click();await sl(100);out.unit=P()[np].units.some(u=>u.no==='T-1');
    // contract on the new unit via picker + new tenant
    contractForm(false,{pid:np});await sl(60);const ui=document.querySelector('#cb_unit input');ui.focus();ui.dispatchEvent(new Event('focus'));await sl(40);out.unitListed=[...document.querySelectorAll('#cb_unit .cbo')].some(x=>x.textContent.includes('T-1'));
    document.querySelector('#cb_unit .cbo').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await sl(40);out.ownerFilled=document.querySelector('#cb_owner input').value;
    const ti=document.querySelector('#cb_ten input');ti.value='مستأجر اختبار';ti.dispatchEvent(new Event('input'));
    set('cf_freq','3');set('cf_period','سنة');set('cf_start','2026-01-01');out.end=document.getElementById('cf_end').value;document.getElementById('cf_rent').value=30000;document.getElementById('cf_rent').dispatchEvent(new Event('input'));
    // missing required check
    set('cf_start','');document.getElementById('cf_save').click();await sl(50);out.reqErr=document.getElementById('cf_err').textContent;set('cf_start','2026-01-01');set('cf_period','سنة');
    document.getElementById('cf_save').click();await sl(150);const nc=P()[np].contracts[0];out.contract=!!nc;
    // payments: partial and full
    document.getElementById('det').close&&document.getElementById('det').close();
    payForm(np,nc.id,7500);set('ff_date','2026-02-01');set('ff_method','منصة إيجار');set('ff_from','2026-01-01');set('ff_to','2026-03-31');document.getElementById('fsave').click();await sl(150);
    document.getElementById('frm').close();const p1=P()[np].contracts[0].payments[0];out.payMethod=p1.method;out.receiptPartial=/دفعة من إيجار شقة T-1/.test(receiptDoc(np,nc.id,p1.id).html);
    payForm(np,nc.id,30000);set('ff_date','2026-02-02');document.getElementById('fsave').click();await sl(150);document.getElementById('frm').close();
    const p2=P()[np].contracts[0].payments[1];out.receiptFull=/>إيجار شقة T-1/.test(receiptDoc(np,nc.id,p2.id).html.replace(/\s+/g,' '));out.noPeriodOnReceipt=!/استحقاق/.test(receiptDoc(np,nc.id,p2.id).html);
    // parties
    partyForm('tenants','مستأجر اختبار');set('ff_name','مستأجر اختبار معدل');set('ff_phone','0555');document.getElementById('fsave').click();await sl(100);out.renamed=P()[np].contracts[0].tenant==='مستأجر اختبار معدل';
    partyForm('owners','');set('ff_name','مالك مسجل فقط');document.getElementById('fsave').click();await sl(100);out.ownerListed=partyList('owners',rows()).some(o=>o.name==='مالك مسجل فقط');
    // exit + availability
    const pi=P()[np],ui2=pi.units.find(u=>u.no==='T-1');out.stBefore=unitInfo(pi,ui2).st;
    // agreement + analysis from it
    agrForm(null);set('ag_pick',np+'|'+nc.id);document.getElementById('ag_pick').dispatchEvent(new Event('change',{bubbles:true}));await sl(50);document.getElementById('ag_save').click();await sl(120);out.agr=S.db.agreements.length;
    anForm(null);set('an_pick',np+'|'+nc.id);document.getElementById('an_pick').dispatchEvent(new Event('change',{bubbles:true}));await sl(60);document.getElementById('an_save').click();await sl(120);out.ana=S.db.analyses.length;
    // v1.8 checks
    {const c0=P()[np].contracts[0];payForm(np,c0.id,'');out.payAuto=document.getElementById('ff_from').value+'>'+document.getElementById('ff_to').value+' '+document.getElementById('ff_amount').value;document.getElementById('frm').close();
    contractForm(false);const w=document.querySelector('[data-dt="cf_start"]'),d=w.querySelector('.dtd'),m=w.querySelector('.dtm'),y=w.querySelector('.dty');
    d.value='٥';d.dispatchEvent(new Event('input',{bubbles:true}));m.value='11';m.dispatchEvent(new Event('change',{bubbles:true}));y.value='26';y.dispatchEvent(new Event('input',{bubbles:true}));y.dispatchEvent(new Event('focusout',{bubbles:true}));out.dt=document.getElementById('cf_start').value;
    set('cf_period','__c');set('cf_pm','5');out.end5=document.getElementById('cf_end').value;set('cf_freq','s');set('cf_fqv','2');set('cf_rent','10000');out.sched5=document.querySelectorAll('#cf_sched .ch').length;
    document.getElementById('frm').close();
    const x1=P()[np].contracts[0];exitForm(np,x1.id);set('ff_date','2026-06-30');set('ff_rem','waive');document.getElementById('fsave').click();await sl(80);
    const rr=calc(P()[np].contracts[0],MODE(),TODAY);out.early=rr.st+'/'+rr.rem+'/'+rr.late+'/'+unitInfo(P()[np],P()[np].units.find(u=>u.no==='T-1')).st;
    attField('t1',[]);ATT.reg.t1.list.push({id:'x',name:'a.pdf',size:2048,f:'x.pdf'});out.att=attGet('t1').length;attDiscard();}
    return JSON.stringify(out)})()`);
  console.log('FLOWS',f2);
  await shot('contract_req');
  await ev(`document.getElementById('frm').close();partyForm('owners','');`);await sleep(200);await shot('party_new');await ev(`document.getElementById('frm').close();go('tenants')`);await shot('tenants2');
  await ev(`S.rp.tab='ov';S.rp.fo='';go('rep')`);await shot('rep_ov');
  const nx=await ev(`(()=>{const pid=Object.keys(P())[0];const c=P()[pid].contracts.find(c=>c.payments.length);return{pid,c:c.id,p:c.payments[0].id}})()`);
  await pdf('receipt2',await ev(`receiptDoc('${nx.pid}','${nx.c}','${nx.p}').html`));
  const chk=await ev(`(()=>{const x=rows().find(x=>x.r.st==='منتهي'&&endState(x.pid,x.c)==='pend');const p=P()[x.pid];const u=p.units.find(u=>normU(u.no)===normU(x.c.unit));const b=unitInfo(p,u).st;
    mutate(x.pid,q=>{q.contracts.find(c=>c.id===x.c.id).exit={date:'2026-11-01'}});const p2=P()[x.pid],u2=p2.units.find(u=>normU(u.no)===normU(x.c.unit));const a=unitInfo(p2,u2).st;return b+'>'+a})()`);
  console.log('EXITCHK',chk);
  await sleep(500);console.log('ERRS',JSON.stringify(errs));app.exit(0);
});
