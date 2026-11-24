'use strict';
const panel=document.getElementById('accessPanel');
const form=document.getElementById('login');
const message=document.getElementById('accessMessage');
const frame=document.getElementById('studio');
const params=new URLSearchParams(location.hash.slice(1));
const enc=new TextEncoder(),dec=new TextDecoder();
const unbase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
let busy=false;
let passwordInput=document.getElementById('password');
const showPassword=document.getElementById('showPassword');
// Use a stable textarea on engines with visual masking support. This avoids
// input[type=password] and its autofill/IME integration without exposing text.
// Browsers without text-security keep their native password input.
const cssPasswordMask=!!(window.CSS && CSS.supports('-webkit-text-security','disc'));
let passwordVisible=false;
if(cssPasswordMask){
 const editor=document.createElement('textarea');
 editor.id=passwordInput.id;
 editor.name='host-access';
 editor.rows=1;
 editor.required=true;
 editor.autocomplete='off';
 editor.setAttribute('autocapitalize','none');
 editor.setAttribute('autocorrect','off');
 editor.setAttribute('enterkeyhint','go');
 editor.setAttribute('inputmode','text');
 editor.setAttribute('aria-label','Contraseña del anfitrión');
 editor.spellcheck=false;
 editor.className='password-masked';
 editor.value=passwordInput.value;
 passwordInput.replaceWith(editor);
 passwordInput=editor;
 // A textarea does not submit a form on Enter by default. Handle both the
 // physical key and the soft-keyboard action, while leaving IME composition alone.
 editor.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.isComposing){event.preventDefault();form.requestSubmit();}
 });
 editor.addEventListener('beforeinput',event=>{
  if(!event.isComposing&&['insertLineBreak','insertParagraph'].includes(event.inputType)){
   event.preventDefault();form.requestSubmit();
  }
 });
 editor.addEventListener('input',()=>{
  // A pasted line ending is formatting, not part of the host access phrase.
  if(/[\r\n]/.test(editor.value))editor.value=editor.value.replace(/[\r\n]/g,'');
 });
}
showPassword.addEventListener('pointerdown',event=>event.preventDefault());
showPassword.addEventListener('click',()=>{
 passwordVisible=!passwordVisible;
 if(cssPasswordMask){
  passwordInput.classList.toggle('password-masked',!passwordVisible);
 }else{
  passwordInput.type=passwordVisible?'text':'password';
 }
 const label=passwordVisible?'Ocultar contraseña':'Mostrar contraseña';
 showPassword.setAttribute('aria-label',label);
 showPassword.title=label;
 showPassword.setAttribute('aria-pressed',String(passwordVisible));
 passwordInput.focus();
});
async function envelope(role){
 const response=await fetch(`sealed-${role}.json`,{cache:'no-store'});
 if(!response.ok)throw Error('No se pudo cargar el acceso. Recarga la página.');
 const data=await response.json();
 if(data.version!==1||data.role!==role)throw Error('Formato de acceso no válido.');
 return data;
}
async function decrypt(data,key){
 return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(data.iv),additionalData:enc.encode('estudio:'+data.role+':v1')},key,unbase64(data.ciphertext))));
}
function openApp(payload){
 const entry=new URL(location.href);entry.hash='';
 const doc=new DOMParser().parseFromString(payload.html,'text/html');
 const base=doc.createElement('base');base.href=entry.href;doc.head.prepend(base);
 doc.querySelector('script[src="app.js"]')?.remove();
 const codeURL=URL.createObjectURL(new Blob([payload.code],{type:'text/javascript'}));
 const config=doc.createElement('script');
 config.textContent='window.ESTUDIO_ENTRY_URL='+JSON.stringify(entry.href)+';';
 doc.head.prepend(config);
 const script=doc.createElement('script');script.defer=true;script.src=codeURL;doc.head.append(script);
 const pageURL=URL.createObjectURL(new Blob(['<!doctype html>'+doc.documentElement.outerHTML],{type:'text/html'}));
 frame.src=pageURL+location.hash;panel.hidden=true;frame.hidden=false;
 // URLs remain valid for this tab, including the Nueva entrevista reload.
 window.addEventListener('pagehide',()=>{URL.revokeObjectURL(codeURL);URL.revokeObjectURL(pageURL);},{once:true});
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busy=true;
 const button=document.getElementById('unlock');button.disabled=true;message.textContent='Abriendo estudio…';
 try{
  const data=await envelope('host');
  const material=await crypto.subtle.importKey('raw',enc.encode(document.getElementById('password').value),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:unbase64(data.salt),iterations:data.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const payload=await decrypt(data,key);document.getElementById('password').value='';openApp(payload);
 }catch(e){message.textContent=e.name==='OperationError'?'Contraseña incorrecta.':(e.message||'No se pudo abrir el estudio.');}
 finally{busy=false;button.disabled=false;}
});
if(params.has('room')){
 form.hidden=true;document.getElementById('accessDescription').textContent='Acceso mediante invitación';
 (async()=>{
  try{
   if(!/^entrevista-[a-f0-9]{48}$/.test(params.get('room')||'')||!/^[a-f0-9]{48}$/.test(params.get('key')||'')||!/^[A-Za-z0-9_-]{43}$/.test(params.get('access')||''))throw Error('La invitación no es válida o está incompleta.');
   message.textContent='Abriendo invitación…';
   const raw=unbase64(params.get('access').replace(/-/g,'+').replace(/_/g,'/')+'=');
   const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
   openApp(await decrypt(await envelope('guest'),key));
  }catch(e){message.textContent=e.name==='OperationError'?'La invitación no es válida. Solicita un enlace nuevo al anfitrión.':(e.message||'No se pudo abrir la invitación.');}
 })();
}
// A different invitation is a new session, even when only the fragment changes.
window.addEventListener('hashchange',()=>location.reload());
