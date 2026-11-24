import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {webcrypto as crypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const password=process.env.ESTUDIO_PASSWORD;
if(!password)throw Error('ESTUDIO_PASSWORD debe establecerse solo en el entorno de construcción, nunca en el repositorio.');
const enc=new TextEncoder();
const b64=b=>Buffer.from(b).toString('base64');
const guestKeyBytes=crypto.getRandomValues(new Uint8Array(32));
const guestKey=await crypto.subtle.importKey('raw',guestKeyBytes,'AES-GCM',false,['encrypt']);
const salt=crypto.getRandomValues(new Uint8Array(16));
const keyMaterial=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
const iterations=310000;
const hostKey=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},keyMaterial,{name:'AES-GCM',length:256},false,['encrypt']);
const html=await readFile(path.join(root,'index.html'),'utf8');
const js=await readFile(path.join(root,'app.js'),'utf8');
async function seal(role,key){
 const code=`window.ESTUDIO_MODE=${JSON.stringify(role)};`+(role==='host'?`window.ESTUDIO_GUEST_KEY=${JSON.stringify(Buffer.from(guestKeyBytes).toString('base64url'))};`:'')+js;
 const payload=JSON.stringify({html,code});
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('estudio:'+role+':v1')},key,enc.encode(payload));
 const envelope={version:1,role,iv:b64(iv),ciphertext:b64(encrypted),...(role==='host'?{salt:b64(salt),iterations}:{})};
 await writeFile(path.join(root,'docs',`sealed-${role}.json`),JSON.stringify(envelope));
}
await mkdir(path.join(root,'docs','vendor'),{recursive:true});
await seal('host',hostKey);await seal('guest',guestKey);
for(const name of ['style.css','storage-worker.js','.nojekyll','vendor/peerjs-1.5.5.min.js','vendor/PeerJS-LICENSE.txt'])await copyFile(path.join(root,name),path.join(root,'docs',name));
console.log('Paquetes de anfitrión e invitado cifrados; contraseña excluida de la publicación.');
