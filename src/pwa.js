/* Optional installation of the same application, without a second data store. */
const pwa={registration:null,prompt:null,ready:false,error:'',reloading:false};
function pwaInstalled(){return typeof matchMedia==='function'&&matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function pwaInfo(){
 const status=!CLOUD_WEB?'Pour installer Repère, ouvrez la version Web HTTPS.':pwa.ready?'Application disponible hors connexion sur cet appareil.':pwa.error||'La préparation hors connexion nécessite une première ouverture avec Internet.';
 const update=pwa.registration?.waiting?'<button class="btn primary" data-pwa="update">Mettre à jour l’application</button>':'';
 modal(pwaInstalled()?'Application installée':'Installer Repère','Accès rapide depuis l’écran d’accueil',dialogBody('<div class="stack"><p>'+esc(status)+'</p>'+(pwa.prompt&&!pwaInstalled()?'<button class="btn primary" data-pwa="prompt">Installer</button>':'')+(!pwaInstalled()?'<p><strong>iPhone / iPad :</strong> dans Safari, ouvrez Partager puis « Sur l’écran d’accueil ».</p><p><strong>Android :</strong> dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p>':'')+'<p>Connectez-vous une première fois avec « Rester connecté ». Sans réseau, seules les données déjà présentes sur cet appareil sont accessibles. Les modifications restent enregistrées localement et seront synchronisées après le retour du réseau.</p>'+update+'</div>','<div class="form-actions">'+btn('Fermer','close-modal','close')+'</div>'));
}
function pwaUpdateNotice(){const old=document.getElementById('pwa-update-notice');if(old)old.remove();if(!pwa.registration?.waiting)return;const el=document.createElement('button');el.id='pwa-update-notice';el.type='button';el.className='pwa-update';el.dataset.pwa='install';el.textContent='Nouvelle version disponible';document.body.append(el)}
async function pwaInit(){
 if(!CLOUD_WEB||!('serviceWorker' in navigator)||!window.isSecureContext)return;
 try{
  const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});pwa.registration=registration;
  pwa.ready=!!registration.active;pwaUpdateNotice();
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'){pwa.ready=!!registration.active;pwaUpdateNotice()}})});
  navigator.serviceWorker.ready.then(()=>{pwa.ready=true});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{pwa.ready=true;if(pwa.reloading)location.reload()});
 }catch{pwa.error='Le mode hors connexion n’a pas pu être préparé. Réessayez en ligne.'}
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();pwa.prompt=e});
window.addEventListener('appinstalled',()=>{pwa.prompt=null});
document.addEventListener('click',async e=>{
 const b=e.target.closest?.('[data-pwa]');if(!b||cloud.locked)return;e.preventDefault();e.stopImmediatePropagation();
 if(b.dataset.pwa==='install')pwaInfo();
 if(b.dataset.pwa==='prompt'&&pwa.prompt){const prompt=pwa.prompt;pwa.prompt=null;await prompt.prompt();await prompt.userChoice;closeModal()}
 if(b.dataset.pwa==='update'&&pwa.registration?.waiting){
  b.disabled=true;try{await persist();if(storageError||loadError||conflict||dirty)throw Error('Sauvegardez ou exportez vos modifications avant de mettre à jour.');pwa.reloading=true;pwa.registration.waiting.postMessage({type:'ACTIVATE_UPDATE'})}catch(err){b.disabled=false;toast(err.message||'Mise à jour impossible pour le moment.')}
 }
});
window.addEventListener('load',pwaInit,{once:true});
