"""Local Chromium smoke test with simulated signaling and genuine media/storage APIs."""
import http.server, threading, functools, pathlib, tempfile, subprocess, os, shutil
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
MOCK='''class E {constructor(){this.events={};}on(k,f){(this.events[k]??=[]).push(f);return this;}emit(k,...a){for(const f of this.events[k]||[])f(...a);}}
class C extends E{constructor(){super();this.peer='guest-test';this.open=true;}send(d){window.lastMessage=d;}close(){this.open=false;this.emit('close');}}
window.Peer=class extends E {constructor(id){super();this.id=id;setTimeout(()=>this.emit('open',id),10);}call(){let c=new C();navigator.mediaDevices.getUserMedia({video:true,audio:true}).then(s=>{window.testRemote=s;c.emit('stream',s);});return c;}destroy(){this.destroyed=true;} };'''
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path,headless=True,args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'])
  ctx=browser.new_context(accept_downloads=True,permissions=['camera','microphone'])
  page=ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/vendor/peerjs-1.5.5.min.js',lambda r:r.fulfill(content_type='application/javascript',body=MOCK))
  page.goto(f'http://127.0.0.1:{server.server_port}/');page.locator('#name').fill('Prueba');page.locator('#prepare').click();page.locator('#create').click();page.locator('#invitation').wait_for(state='visible');assert '#room=' in page.locator('#link').input_value()
  page.evaluate("""()=>{const c=new (class {constructor(){this.events={};this.peer='guest-test';this.open=true;}on(k,f){this.events[k]=f;}send(d){window.lastMessage=d;}close(){this.open=false;}})();peer.emit('connection',c);c.events.data({type:'request',token:'incorrecto',consent:true});} """)
  assert page.locator('#waiting').is_hidden()
  page.evaluate("""()=>{const c=new (class {constructor(){this.events={};this.peer='guest-test';this.open=true;}on(k,f){this.events[k]=f;}send(d){window.lastMessage=d;}close(){this.open=false;}})();peer.emit('connection',c);c.events.data({type:'request',token,consent:true,name:'Invitado de prueba'});} """)
  page.locator('#accept').click();page.evaluate("conn.events.data({type:'ready'})");page.locator('#recording').wait_for(state='visible',timeout=15000);page.wait_for_timeout(6500);assert page.evaluate('written>0');page.locator('#finish').click();page.locator('#result').wait_for(state='visible',timeout=15000)
  with page.expect_download() as d:page.locator('#download').click()
  with tempfile.TemporaryDirectory() as tmp:
   target=pathlib.Path(tmp)/d.value.suggested_filename;d.value.save_as(target);assert target.stat().st_size>10000
   result=subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,width,height','-of','json',str(target)],text=True); print(result);assert '"video"' in result and '"audio"' in result
  assert not errors, errors
  print('PASS: cámara/micrófono simulados, invitación, rechazo de token incorrecto, admisión, grabación real, escritura OPFS, exportación y pistas de audio/vídeo. Señalización simulada; no prueba WebRTC entre redes.')
  browser.close()
finally:server.shutdown()
