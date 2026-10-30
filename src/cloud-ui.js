// Firebase client configuration is public. Authorization is enforced by Firestore rules.
const FIREBASE_CONFIG={apiKey:'AIzaSyCgveMBckBmNXIGBpALlR-Ma0xpawR8Rvo',authDomain:'repere-affaires.firebaseapp.com',projectId:'repere-affaires',storageBucket:'repere-affaires.firebasestorage.app',messagingSenderId:'721521791922',appId:'1:721521791922:web:ec14b05bad4a180d0ecaab'};
const CLOUD_IDLE_MS=180000;
const CLOUD_META=STORE+'-sync', CLOUD_URL='https://madec01.github.io/affaires/';
const localState={store:RepereLocal.create(STORE),ready:false,revision:0,generation:0,chain:Promise.resolve(),channel:null};
const cloud={sdk:null,auth:null,fire:null,user:null,controller:null,unsubscribe:null,timer:null,locked:true,epoch:0,sdkPromise:null,view:{status:CLOUD_WEB?'loading':'local',pending:false,busy:false},error:'',loading:false,lastCanonical:null,lastEditAt:0,retryAt:0,remoteNotice:null,readNotice:null,transport:null,watchEpoch:0,watchStarting:false,runAt:0,retryCount:0,quota:null,owner:Date.now().toString(36)+Math.random().toString(36).slice(2)};
function cloudError(e){
 const code=String(e?.code||'').replace(/^firestore\//,'');
 return ({'auth/invalid-credential':'Adresse e-mail ou mot de passe incorrect.','auth/invalid-login-credentials':'Adresse e-mail ou mot de passe incorrect.','auth/wrong-password':'Adresse e-mail ou mot de passe incorrect.','auth/user-not-found':'Adresse e-mail ou mot de passe incorrect.','auth/invalid-email':'Vérifiez le format de l’adresse e-mail.','auth/user-disabled':'Ce compte a été désactivé dans Firebase.','auth/too-many-requests':'Trop de tentatives. Patientez avant de réessayer.','auth/network-request-failed':'Firebase est inaccessible. Vérifiez votre connexion et les restrictions du réseau.','auth/operation-not-allowed':'Activez Adresse e-mail/Mot de passe dans Firebase Authentication.','auth/unauthorized-domain':'Ajoutez madec01.github.io dans les domaines autorisés de Firebase Authentication.','permission-denied':'Accès Firestore refusé. Vérifiez que les règles publiées contiennent votre UID et le chemin users/{userId}.','resource-exhausted':'Quota Firebase atteint. Vos modifications restent sur cet appareil ; réessayez plus tard.','unavailable':'Connexion à Firebase indisponible. Vos modifications restent sur cet appareil.','repere/owner':'Ce compte n’est pas autorisé pour cet espace Repère.','repere/local':'Enregistrement local impossible. Exportez vos données avant de continuer.'})[code]||e?.message||'La connexion n’a pas abouti. Réessayez.';
}
function cloudSetLocked(value){
 cloud.locked=value;document.body.toggleAttribute('data-cloud-locked',value);
 for(const id of ['sidebar','main','modal-root','slash-root','toast-root']){const el=document.getElementById(id);if(el)el.inert=value}
 const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=!value;
}
function cloudGate(message=''){
 const gate=document.getElementById('cloud-gate');
 gate.innerHTML='<div class="cloud-login"><div class="cloud-brand">'+ic('leaf',30)+'<strong>repère</strong></div><h1>Votre espace de travail</h1><p>Connectez-vous pour retrouver vos affaires sur vos appareils.</p><form id="cloud-login-form"><label class="field">Adresse e-mail<input class="input" name="email" type="email" autocomplete="username" required maxlength="254"></label><label class="field">Mot de passe<input class="input" name="password" type="password" autocomplete="current-password" required></label><label class="cloud-remember"><input type="checkbox" name="remember" checked> Rester connecté sur cet appareil personnel</label><button type="submit" class="btn primary" '+(!cloud.sdk?'disabled':'')+'>Se connecter</button><button type="button" class="text-button" data-cloud="reset" '+(!cloud.sdk?'disabled':'')+'>Mot de passe oublié</button></form><p id="cloud-login-message" class="cloud-message" role="status" aria-live="polite">'+esc(message||(!cloud.sdk?'Chargement de la connexion…':''))+'</p>'+(!cloud.sdk?'<button type="button" class="text-button" data-cloud="reload">Réessayer le chargement</button>':'')+'<p class="cloud-login-note">Compte personnel · Les sauvegardes JSON restent disponibles après connexion.</p></div>';
}
function cloudGateMessage(text){const n=document.getElementById('cloud-login-message');if(n)n.textContent=text}
function cloudLabel(){
 if(!CLOUD_WEB)return 'Mode local';
 if(!cloud.user)return 'Connexion';
 if(!navigator.onLine)return 'Hors connexion';
 if(cloud.view.status==='pending'&&cloud.lastEditAt&&Date.now()<cloud.lastEditAt+CLOUD_IDLE_MS)return 'Envoi auto à '+new Date(cloud.lastEditAt+CLOUD_IDLE_MS).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 return ({loading:'Connexion…',syncing:'Synchronisation…',synced:'Synchronisé',pending:'En attente',offline:'Hors connexion',error:'Erreur de synchro',conflict:'Conflit à résoudre',initial:'Premier envoi',remote:'Mise à jour disponible',blocked:'Sauvegarde à vérifier',paused:'Synchro en pause'})[cloud.view.status]||'Connexion';
}
function cloudTopButton(){return '<button type="button" class="btn small" data-cloud="retry" title="Enregistrer localement et synchroniser" aria-label="Enregistrer maintenant">'+ic('check',16)+'</button><button type="button" class="btn small cloud-status" data-cloud="account" title="Compte et synchronisation" aria-label="Compte · '+esc(cloudLabel())+'"><span class="cloud-dot" data-state="'+esc(cloud.view.status)+'"></span><span data-cloud-label>'+esc(cloudLabel())+'</span></button>'}
function cloudCounts(data){return data?data.projects.length+' affaires · '+data.tasks.length+' actions · '+data.pages.length+' pages · '+data.contacts.length+' contacts':'Aucune copie en ligne'}
function cloudDetails(){
 const v=cloud.view;
 if(!CLOUD_WEB)return '<p>Ce fichier enregistre vos modifications dans IndexedDB, sans synchronisation.</p><button type="button" class="btn" data-cloud="retry">Enregistrer maintenant</button><a class="btn primary" href="'+CLOUD_URL+'" target="_blank" rel="noopener noreferrer">Ouvrir Repère en ligne</a><p class="form-hint">Exportez vos données en JSON, puis importez le fichier après connexion à la version Web.</p>';
 let html='<div class="cloud-status-line"><strong>'+esc(cloudLabel())+'</strong><small>'+esc(cloud.user?.email||'')+'</small></div>';
 if(v.error)html+='<p class="notice warn" role="alert">'+esc(v.error)+'</p>';
 if(v.status==='conflict'||v.status==='initial'){
  html+='<p>'+(v.status==='initial'?'Cette copie locale n’a jamais été associée à Firebase. Choisissez explicitement de l’envoyer.':'Les deux copies ont changé. Aucune version n’est écrasée automatiquement. Le choix porte sur tout l’espace de travail.')+'</p><div class="cloud-versions"><div><strong>Sur cet appareil</strong><p>'+esc(cloudCounts(db))+'</p><button type="button" class="btn small" data-cloud="export-local">Exporter cette copie</button></div><div><strong>Sur Firebase</strong><p>'+esc(cloudCounts(v.remote?.data))+'</p>'+(v.remote?'<button type="button" class="btn small" data-cloud="export-remote">Exporter cette copie</button>':'')+'</div></div><div class="flex wrap"><button type="button" class="btn primary" data-cloud="choose-local">'+(v.status==='initial'?'Envoyer cette copie':'Conserver ma version locale')+'</button>'+(v.remote?'<button type="button" class="btn" data-cloud="choose-remote">Reprendre la version Firebase</button>':'')+'</div><p class="form-hint">Une copie de la version remplacée sera conservée sur cet appareil. Vous pourrez l’exporter ci-dessous.</p>';
 }else if(v.status==='remote')html+='<p>Terminez le formulaire ou quittez le champ en cours pour recevoir la mise à jour.</p>';
 else if(v.status==='offline')html+='<p>Les modifications enregistrées restent sur cet appareil. La synchronisation reprendra au retour du réseau, tant que la page est ouverte.</p>';
 else html+='<p>Les modifications sont enregistrées dans IndexedDB, puis regroupées pour Firebase : 3 minutes après la dernière modification. Toute nouvelle modification relance ce délai. Les autres appareils ouverts reçoivent automatiquement les changements via l’index des versions. Les formulaires non validés ne sont pas enregistrés.</p>';
 html+='<div class="flex wrap"><button type="button" class="btn small" data-cloud="retry">Enregistrer et synchroniser</button><button type="button" class="btn small" data-cloud="signout">Se déconnecter</button></div><details class="cloud-recovery"><summary>Reprise et copies de sécurité</summary><div class="stack"><button type="button" class="btn small" data-cloud="legacy">Reprendre les anciennes données de ce navigateur</button><button type="button" class="btn small" data-cloud="saved-local">Exporter la copie locale remplacée</button><button type="button" class="btn small" data-cloud="saved-remote">Exporter la copie Firebase remplacée</button><p class="form-hint">Les exports automatiques restent disponibles dans Réglages. La synchronisation ne remplace pas une sauvegarde datée.</p></div></details>';
 html+='<p class="form-hint">Limite par appareil : 200 lectures et 200 écritures estimées sur 5 minutes. La fermeture conserve en priorité la copie locale ; attendez « Synchronisé » pour garantir l’envoi.</p>';
 if(cloud.quota){const q=RepereLocal.budgetNext(cloud.quota,0,0);html+='<p class="form-hint">Réservées sur les 5 dernières minutes : '+q.reads+' lectures · '+q.writes+' écritures. Compteurs de précaution, hors connexions et console Firebase.</p>'}
 return html;
}
function cloudPanel(){return '<section class="panel"><div class="panel-head"><h2>Compte et synchronisation</h2>'+ic('user')+'</div><div class="panel-body stack" data-cloud-details>'+cloudDetails()+'</div></section>'}
function cloudRefresh(){
 for(const n of document.querySelectorAll('[data-cloud-label]'))n.textContent=cloudLabel();
 for(const n of document.querySelectorAll('.cloud-dot'))n.dataset.state=cloud.view.status;
 for(const n of document.querySelectorAll('[data-cloud-details]'))n.innerHTML=cloudDetails();
 for(const n of document.querySelectorAll('.cloud-status'))n.setAttribute('aria-label','Compte · '+cloudLabel());
}
function cloudAccount(){modal('Compte et synchronisation',CLOUD_WEB?'Vos affaires sont rattachées à votre compte personnel.':'Fichier local',dialogBody('<div class="stack" data-cloud-account data-cloud-details>'+cloudDetails()+'</div>','<div class="form-actions">'+btn('Fermer','close-modal','close')+'</div>'))}
function cloudSameVersion(meta,base=cloud.view.base){return !!base&&(meta?.revision||0)===base.revision&&(meta?.hash||'')===base.hash}
function cloudObsoleteVersion(meta,base=cloud.view.base){return cloudSameVersion(meta,base)||!!(meta&&base&&meta.revision<base.revision)}
function cloudSchedule(delay=1000){
 if(!CLOUD_WEB||!cloud.user||cloud.locked||!cloud.controller)return;
 if(['error','conflict','initial'].includes(cloud.view.status))return;
 const now=Date.now();
 if(cloud.view.status==='paused'&&delay>1000)cloud.retryAt=Math.max(cloud.retryAt,now+delay);
 const idleDue=cloud.lastEditAt?cloud.lastEditAt+CLOUD_IDLE_MS:0;
 const spacing=cloud.remoteNotice?10000:60000;
 const due=Math.max(now+delay,idleDue,cloud.runAt+spacing,cloud.retryAt);
 clearTimeout(cloud.timer);cloud.timer=setTimeout(()=>cloudRun(false),Math.max(0,due-now));
}
function cloudWatchStop(){cloud.watchEpoch++;cloud.unsubscribe?.();cloud.unsubscribe=null;cloud.watchStarting=false}
async function cloudWatchStart(){
 if(!CLOUD_WEB||!cloud.user||cloud.locked||!cloud.transport||cloud.unsubscribe||cloud.watchStarting||!navigator.onLine||document.visibilityState==='hidden'||conflict||loadError||storageError||['error','paused'].includes(cloud.view.status))return;
 const token=++cloud.watchEpoch,epoch=cloud.epoch;cloud.watchStarting=true;
 const active=()=>token===cloud.watchEpoch&&epoch===cloud.epoch&&!cloud.locked&&document.visibilityState!=='hidden';
 let first=true,lastSignature='',fromServer=false,serial=Promise.resolve();
 function failed(e){
  if(!active())return;cloudWatchStop();
  cloud.view={...cloud.view,status:e.code==='repere/budget'?'paused':'error',pending:true,error:cloudError(e)};
  if(e.code==='repere/budget'){cloud.retryAt=e.retryAt;cloudSchedule(Math.max(1000,e.retryAt-Date.now()))}
  cloudRefresh();
 }
 try{
  // Reserve the initial document read before opening the listener.
  cloud.quota=await localState.store.reserve(1,0);if(!active())return;
  const unsubscribe=cloud.sdk.onSnapshot(cloud.transport.root,{includeMetadataChanges:true},snapshot=>{
   if(!active())return;
   if(snapshot.metadata.fromCache){fromServer=false;return}
   if(snapshot.metadata.hasPendingWrites)return;
   let meta;try{meta=snapshot.exists()?RepereTransport.manifest(snapshot.data()):null}catch(e){failed(e);return}
   const signature=JSON.stringify([meta?.revision||0,meta?.hash||'']);
   if(fromServer&&signature===lastSignature)return;
   fromServer=true;lastSignature=signature;const prepaid=first;first=false;
   serial=serial.then(async()=>{
    if(!active())return;
    if(!prepaid)cloud.quota=await localState.store.reserve(1,0);
    if(!active())return;
    if(cloudObsoleteVersion(meta))return; // Includes our own confirmed commit.
    cloud.remoteNotice={meta};cloudSchedule(0);cloudRefresh();
   }).catch(failed);
  },failed);
  if(active())cloud.unsubscribe=unsubscribe;else unsubscribe();
 }catch(e){failed(e)}finally{if(token===cloud.watchEpoch)cloud.watchStarting=false}
}
async function cloudRun(manual=false,direction=null,observed=null){
 if(!cloud.controller||cloud.locked||cloud.view.busy)return false;
 clearTimeout(cloud.timer);cloud.timer=null;
 if(dirty&&!await persist())return false;
 // No automatic event (visibility, notification, reconnect) bypasses the inactivity delay.
 if(!manual&&((cloud.lastEditAt&&Date.now()<cloud.lastEditAt+CLOUD_IDLE_MS)||Date.now()<cloud.retryAt)){cloudSchedule(0);return false}
 if(!navigator.onLine){cloud.view={...cloud.view,status:'offline'};cloudRefresh();return false}
 let acquired=false,heartbeat;
 try{
  await localState.store.acquire(cloud.owner,manual||!!cloud.remoteNotice);acquired=true;cloud.runAt=Date.now();
  cloud.readNotice=manual?null:cloud.remoteNotice;cloud.remoteNotice=null;
  heartbeat=setInterval(()=>localState.store.renew(cloud.owner).catch(()=>{}),30000);
  return direction?await cloud.controller.resolve(direction,observed):await cloud.controller.run();
 }catch(e){
  if(e.code==='repere/cooldown'){if(cloud.view.pending||cloud.remoteNotice)cloudSchedule(Math.max(1000,e.retryAt-Date.now()));if(manual)toast('Demande regroupée avec la précédente. Patientez quelques secondes.');return false}
  if(e.code==='repere/busy'){if(cloud.view.pending||cloud.remoteNotice)cloudSchedule(10000);if(manual)toast(e.message);return false}
  cloud.view={...cloud.view,status:'error',error:cloudError(e)};cloudRefresh();return false;
 }finally{
  clearInterval(heartbeat);cloud.readNotice=null;
  try{if(acquired)await localState.store.release(cloud.owner);cloud.quota=await localState.store.get('budget')}catch(e){storageError=e.message;setSaveState()}
  if(cloud.remoteNotice&&cloudObsoleteVersion(cloud.remoteNotice.meta))cloud.remoteNotice=null;
  if(!cloud.remoteNotice&&cloud.view.status==='synced'&&!cloud.lastEditAt){clearTimeout(cloud.timer);cloud.timer=null}
  if(cloud.remoteNotice)cloudSchedule(0);
  if(!['paused','error'].includes(cloud.view.status))cloudWatchStart();cloudRefresh();
 }
}
async function localLoad(){
 let saved=await localState.store.get('workspace');
 if(!saved){const legacy=localStorage.getItem(STORE);if(legacy){const data=validateDB(JSON.parse(legacy));saved=await localState.store.save(data,0);const previous=localStorage.getItem(BACKUP);if(previous)await localState.store.update('workspace',row=>({...row,previous:validateDB(JSON.parse(previous))}))}}
 localState.revision=saved?.revision||0;db=saved?validateDB(saved.data):emptyDB();lastRaw=JSON.stringify(db);localState.ready=true;dirty=false;cloud.lastCanonical=RepereSync.canonical(db);cloud.lastEditAt=Math.min(Number(saved?.editedAt)||0,Date.now());
 if(!localState.channel&&typeof BroadcastChannel!=='undefined'){
  localState.channel=new BroadcastChannel(STORE);
  localState.channel.onmessage=e=>{if(!cloud.locked&&e.data.revision!==localState.revision){conflict=true;setSaveState()}};
 }
}
function localAnnounce(){localState.channel?.postMessage({revision:localState.revision})}

function cloudChanged(saved=db,editedAt=Date.now()){const raw=RepereSync.canonical(saved);if(raw===cloud.lastCanonical)return;cloud.lastCanonical=raw;cloud.lastEditAt=Math.max(cloud.lastEditAt,editedAt);if(CLOUD_WEB&&cloud.user&&!cloud.locked)cloud.controller?.changed()}
function cloudHasPending(){return CLOUD_WEB&&!!cloud.user&&!!cloud.view.pending}
function cloudEditing(){return !!document.querySelector('#modal-root .modal:not(:has([data-cloud-account]))')||!!document.activeElement?.matches('input:not([type="checkbox"]):not([type="file"]),textarea,[contenteditable="true"]')||!!slash}
function cloudResetUI(){ui={...ui,view:'home',projectId:'',pageId:'',tab:'summary',navHistory:[],navCurrent:null,mobileNavOpen:false};undoSnapshot=null;savedRange=null;lastEditable=null;modalStack=[];modalSubmit=null;document.getElementById('modal-root').replaceChildren();document.getElementById('slash-root').replaceChildren();document.getElementById('toast-root').replaceChildren();slash=null}
async function cloudApply(data){
 const generation=localState.generation,original=RepereSync.canonical(db),next=validateDB(data);
 next.lastExport=db.lastExport;next.updatedAt=stamp();
 for(const key of ['autoExportMinutes','warnUnexported','theme','elementSections'])next.settings[key]=db.settings[key];
 const operation=localState.chain.then(async()=>{
  if(dirty||conflict||generation!==localState.generation||RepereSync.canonical(db)!==original)throw Object.assign(Error('Une modification locale est en cours. Relancez la synchronisation.'),{code:'repere/local'});
  const saved=await localState.store.save(next,localState.revision,(old,d)=>hasBackupContent(old)&&backupFingerprint(old)!==backupFingerprint(d));localState.revision=saved.revision;localAnnounce();
  if(generation!==localState.generation||RepereSync.canonical(db)!==original){conflict=true;setSaveState();throw Object.assign(Error('Une saisie a eu lieu pendant la réception. Exportez votre session avant de recharger.'),{code:'repere/local'})}
  db=next;lastRaw=JSON.stringify(next);cloud.lastCanonical=RepereSync.canonical(db);dirty=false;storageError='';loadError='';invalidateUndo();render();
 });localState.chain=operation.catch(()=>{});return operation;
}
async function cloudPreserve(data,kind){await localState.store.set('conflict:'+kind,{savedAt:stamp(),data})}
async function cloudReadMeta(){const m=await localState.store.get('sync');return m&&Number.isSafeInteger(m.revision)&&m.revision>=0&&/^[a-f0-9]{64}$/.test(m.hash)?m:null}
async function cloudSDK(){
 if(cloud.sdk)return cloud.sdk;
 if(!cloud.sdkPromise)cloud.sdkPromise=Promise.all([
  import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
 ]).then(parts=>Object.assign({},...parts)).catch(e=>{cloud.sdkPromise=null;throw e});
 return cloud.sdkPromise;
}
function cloudTransport(sdk,fire,userId){const epoch=cloud.epoch;return RepereTransport.create({sdk,fire,userId,cache:localState.store,local:()=>db,valid:validateDB,active:()=>epoch===cloud.epoch&&!cloud.locked})}
async function cloudAuthChanged(user){
 if(cloud.user&&dirty&&!cloud.locked&&!await persist())cloud.unsaved=JSON.stringify(db);
 const epoch=++cloud.epoch;clearTimeout(cloud.timer);cloudWatchStop();cloud.controller?.stop();cloud.controller=null;cloud.transport=null;cloud.remoteNotice=null;cloud.readNotice=null;cloud.retryAt=0;
 cloudSetLocked(true);
 if(!user||user.uid!==CLOUD_OWNER){
  cloud.user=null;cloud.view={status:'loading',pending:false,busy:false};
  db=emptyDB();dirty=false;clearTimeout(saveTimer);cloudResetUI();document.getElementById('sidebar').replaceChildren();document.getElementById('content').replaceChildren();document.getElementById('topbar').replaceChildren();
  if(user){await cloud.sdk.signOut(cloud.auth);if(epoch!==cloud.epoch)return;}
  cloudGate(user?'Ce compte n’est pas autorisé pour cet espace.':'');return;
 }
 cloud.user=user;cloud.view={status:'loading',pending:true,busy:false};loadError='';storageError='';conflict=false;dirty=false;
 try{await localLoad();if(cloud.unsaved){db=validateDB(JSON.parse(cloud.unsaved));dirty=true;cloudSetLocked(false);if(await persist())cloud.unsaved=null;cloudSetLocked(true)}}catch(e){db=emptyDB();loadError='La copie IndexedDB ne peut pas être lue. Elle est conservée. Exportez ou restaurez une sauvegarde depuis Réglages.';storageError=e.message}
 if(epoch!==cloud.epoch)return;
 exportState=readExportState();cloudResetUI();cloudSetLocked(false);render();
 const transport=cloudTransport(cloud.sdk,cloud.fire,user.uid);cloud.transport=transport;
 const base=await cloudReadMeta();
 if(base?.hash===await RepereSync.digest(RepereSync.canonical(db)))cloud.lastEditAt=0;
 if(epoch!==cloud.epoch)return;
 cloud.controller=RepereSync.createController({
  base,local:()=>db,hasContent:hasBackupContent,online:()=>navigator.onLine,
  blocked:()=>!!(dirty||loadError||storageError||conflict||cloud.locked),editing:cloudEditing,
  read:()=>transport.read(cloud.readNotice?cloud.readNotice.meta:undefined),write:(p,e)=>transport.write(p,e),apply:cloudApply,preserve:cloudPreserve,
  saveMeta:meta=>localState.store.set('sync',meta),schedule:cloudSchedule,errorText:cloudError,
  onState:v=>{
   if(epoch!==cloud.epoch)return;cloud.view=v;cloudRefresh();
   if(!v.busy&&v.status==='synced'){cloud.retryCount=0;cloud.retryAt=0;if(!dirty)cloud.lastEditAt=0}
   if(v.status==='paused'||v.status==='error')cloudWatchStop();
   if(!v.busy&&v.status==='offline'&&navigator.onLine&&cloud.retryCount<3)cloudSchedule(60000*2**cloud.retryCount++);
  }
 });
 await cloudWatchStart();cloudSchedule(0);
}
async function cloudInit(){
 if(!CLOUD_WEB){try{await localLoad()}catch(e){loadError='Impossible d’ouvrir IndexedDB. Les données existantes sont conservées.';storageError=e.message}cloudSetLocked(false);render();return}
 cloudSetLocked(true);cloudGate();
 try{
  cloud.sdk=await cloudSDK();const app=cloud.sdk.initializeApp(FIREBASE_CONFIG);
  cloud.auth=cloud.sdk.getAuth(app);cloud.auth.languageCode='fr';cloud.fire=cloud.sdk.initializeFirestore(app,{localCache:cloud.sdk.memoryLocalCache()});
  cloud.sdk.onAuthStateChanged(cloud.auth,user=>cloudAuthChanged(user).catch(e=>{cloudSetLocked(true);cloudGate(cloudError(e))}),e=>cloudGate(cloudError(e)));
  cloudGate('');
 }catch(e){cloudGate('Le service de connexion n’a pas pu se charger. Vérifiez votre réseau, puis réessayez.');}
}
async function cloudLogin(form){
 if(!cloud.sdk||cloud.loading)return;
 if(!form.reportValidity())return;
 cloud.loading=true;form.querySelector('button[type="submit"]').disabled=true;cloudGateMessage('Connexion en cours…');
 try{
  await cloud.sdk.setPersistence(cloud.auth,form.elements.remember.checked?cloud.sdk.browserLocalPersistence:cloud.sdk.browserSessionPersistence);
  const result=await cloud.sdk.signInWithEmailAndPassword(cloud.auth,form.elements.email.value.trim(),form.elements.password.value);
  if(result.user.uid!==CLOUD_OWNER){await cloud.sdk.signOut(cloud.auth);cloudGateMessage('Ce compte n’est pas autorisé pour cet espace.');}
 }catch(e){cloudGateMessage(cloudError(e))}finally{cloud.loading=false;if(document.contains(form))form.querySelector('button[type="submit"]').disabled=false;form.elements.password.value=''}
}
async function cloudResetPassword(){
 const form=document.getElementById('cloud-login-form'),email=form.elements.email;
 if(!email.reportValidity()||!cloud.sdk||cloud.loading)return;
 cloud.loading=true;cloudGateMessage('Envoi de la demande…');
 try{await cloud.sdk.sendPasswordResetEmail(cloud.auth,email.value.trim());cloudGateMessage('Si cette adresse correspond à un compte, un e-mail de réinitialisation vous sera envoyé. Vérifiez également les indésirables.')}catch(e){cloudGateMessage(cloudError(e))}finally{cloud.loading=false}
}
function cloudDownload(data,label){validateDB(data);download('Repere_sauvegarde_'+label+'_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',JSON.stringify(data,null,2));toast('Export déclenché. Vérifiez le fichier dans vos téléchargements.')}
function cloudChoose(direction){
 if(cloud.view.busy)return;
 const observed=cloud.view.remote?.meta||null;
 const label=direction==='local'?'Conserver la version de cet appareil ?':'Reprendre la version Firebase ?';
 modal(label,'Le choix concerne toutes les affaires, actions, notes et contacts.',dialogBody('<p>'+esc(direction==='local'?'La copie en ligne sera remplacée après vérification qu’elle n’a pas changé depuis votre choix.':'Les données de cet appareil seront remplacées par la version en ligne.')+'</p><p>Une copie de la version remplacée sera conservée sur cet appareil, accessible dans Compte et synchronisation.</p>',actions('Confirmer le choix')),()=>{closeModal();cloudRun(true,direction,observed).then(ok=>{if(ok)toast('Version retenue et synchronisée.');cloudAccount()})});
}
async function cloudSignOut(){
 if(dirty&&!await persist()){toast('Enregistrement local impossible. Exportez avant de vous déconnecter.');return}
 if(cloud.view.busy){toast('Une synchronisation est en cours. Attendez sa fin avant de vous déconnecter.');return}
 const pending=cloudHasPending();
 modal('Se déconnecter ?',cloud.user?.email||'',dialogBody('<p>'+(pending?'Des modifications ne sont pas encore synchronisées. Elles resteront dans ce navigateur et seront reprises à votre prochaine connexion sur cet appareil. Exportez une sauvegarde avant de partir.':'Votre session sera fermée. La copie locale restera dans ce navigateur pour la prochaine connexion.')+'</p><p class="form-hint">Utilisez un profil de navigateur personnel : cette copie locale n’est pas chiffrée par Repère.</p>',actions('Se déconnecter',btn('Exporter avant de partir','export','download'))),async()=>{closeModal();try{await cloud.sdk.signOut(cloud.auth)}catch(e){toast(cloudError(e))}});
}
async function cloudAction(action){
 try{
  if(action==='reload'){location.reload();return}
  if(action==='reset'){await cloudResetPassword();return}
  if(action==='account'){cloudAccount();return}
  if(cloud.locked)return;
  if(action==='retry'){const ok=await persist();if(ok){if(CLOUD_WEB)await cloudRun(true);else toast('Enregistré dans IndexedDB.')}cloudRefresh()}
  if(action==='signout')await cloudSignOut();
  if(action==='export-local')exportData();
  if(action==='export-remote'&&cloud.view.remote)cloudDownload(cloud.view.remote.data,'Firebase');
  if(action==='choose-local')cloudChoose('local');
  if(action==='choose-remote')cloudChoose('remote');
  if(action==='legacy'){
   const raw=localStorage.getItem('repere-affaires-v1');if(!raw){toast('Aucune ancienne copie sur cette adresse. Exportez un JSON depuis votre ancien fichier local, puis utilisez Importer.');return}
   closeModal();proposeRestore(JSON.parse(raw),'Anciennes données de ce navigateur · la confirmation remplacera également votre espace synchronisé.');
  }
  if(action==='saved-local'||action==='saved-remote'){
   const saved=await localState.store.get('conflict:'+action.slice(6));if(!saved){toast('Aucune copie remplacée conservée sur cet appareil.');return}cloudDownload(saved.data,'conflit_'+action.slice(6));
  }
 }catch(e){toast(cloudError(e))}
}
// Registered before the application's document handlers: keyboard shortcuts never act behind login.
for(const type of ['click','keydown','input','change','submit','focusin','focusout','paste'])document.addEventListener(type,e=>{
 if(e.target.closest?.('#cloud-gate')){
  if(type==='submit'){e.preventDefault();cloudLogin(e.target)}
  if(type==='click'){const b=e.target.closest('[data-cloud]');if(b)cloudAction(b.dataset.cloud)}
  e.stopImmediatePropagation();return;
 }
 if(cloud.locked){e.stopImmediatePropagation();return}
 if(type==='click'){const b=e.target.closest?.('[data-cloud]');if(b){e.preventDefault();e.stopImmediatePropagation();cloudAction(b.dataset.cloud)}}
});
window.addEventListener('online',()=>{cloudWatchStart();cloudSchedule(0)});
window.addEventListener('offline',()=>{cloudWatchStop();if(cloud.user){cloud.view={...cloud.view,status:'offline'};cloudRefresh()}});
window.addEventListener('pageshow',()=>{if(cloud.auth&&!cloud.auth.currentUser&&CLOUD_WEB)cloudSetLocked(true);else if(cloud.user){cloudWatchStart();cloudSchedule(0)}});

document.addEventListener('visibilitychange',()=>{if(cloud.locked)return;if(document.visibilityState==='hidden'){cloudWatchStop();persist().then(ok=>{if(ok&&cloud.view.pending)cloudSchedule(0)})}else if(cloud.user){cloudWatchStart();cloudSchedule(0)}});
window.addEventListener('pagehide',()=>{cloudWatchStop();if(!cloud.locked&&dirty)persist()});
document.addEventListener('focusout',()=>{if(cloud.view.status==='remote')cloudSchedule()});
