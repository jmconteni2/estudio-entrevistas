"""Exercise Brave Android using Android touch events and its onscreen keyboard."""
import functools,http.server,json,os,pathlib,re,subprocess,threading,time,urllib.request,xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/android';OUT.mkdir(parents=True,exist_ok=True)
def adb(*args):return subprocess.check_output(['adb',*args],text=True).strip()
def dump(name):
 adb('shell','uiautomator','dump','/sdcard/window.xml')
 xml=adb('shell','cat','/sdcard/window.xml');(OUT/(name+'.xml')).write_text(xml)
 with open(OUT/(name+'.png'),'wb') as f:subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True)
 return ET.fromstring(xml)
def tap_node(node):
 x1,y1,x2,y2=map(int,re.findall(r'\d+',node.attrib['bounds']));adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
req=urllib.request.Request('https://api.github.com/repos/brave/brave-browser/releases/tags/v1.95.104',headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'User-Agent':'Lumen-CI'})
with urllib.request.urlopen(req,timeout=40) as response:release=json.load(response)
asset=next(a for a in release['assets'] if a['name']=='BraveMonox64.apk')
apk=OUT/'brave.apk';urllib.request.urlretrieve(asset['browser_download_url'],apk)
print('Brave Android',release['tag_name'],flush=True)
print(adb('install','-r',str(apk)),flush=True);apk.unlink()
adb('shell','am','set-debug-app','--persistent','com.brave.browser')
adb('shell','sh','-c',"'echo _ --no-first-run --disable-fre --no-default-browser-check --force-renderer-accessibility > /data/local/tmp/chrome-command-line'")
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('0.0.0.0',8765),functools.partial(Quiet,directory=str(ROOT/'docs')))
threading.Thread(target=server.serve_forever,daemon=True).start()
adb('reverse','tcp:8765','tcp:8765')
adb('shell','am','start','-a','android.intent.action.VIEW','-d','http://localhost:8765/','com.brave.browser')
time.sleep(5)
for i in range(9):
 tree=dump('onboard-'+str(i))
 labels=[(n.attrib.get('text','')+' '+n.attrib.get('content-desc','')).strip() for n in tree.iter('node')]
 print('Android controls:',labels,flush=True)
 if any('Contraseña' in label or 'localhost:8765' in label for label in labels):break
 node=next((n for n in tree.iter('node') if re.fullmatch(r'Get started|Skip|Not now|No thanks|Maybe later|Continue|Start browsing|Got it',n.attrib.get('text',''),re.I)),None)
 if node is not None:tap_node(node)
 else:
  cancel=next((n for n in tree.iter('node') if n.attrib.get('text')=='Cancel'),None)
  if cancel is not None:tap_node(cancel)
  else:break
 time.sleep(2)
adb('forward','tcp:9222','localabstract:chrome_devtools_remote')
with sync_playwright() as p:
 browser=p.chromium.connect_over_cdp('http://127.0.0.1:9222',timeout=20000)
 page=next((page for context in browser.contexts for page in context.pages if 'localhost' in page.url),None)
 if page is None:page=browser.contexts[0].new_page()
 page.goto('http://localhost:8765/')
 assert page.locator('input,textarea,form,iframe').count()==0
 # Leave the native dialog open for Android touch input instead of accepting via CDP.
 page.on('dialog',lambda dialog:None)
 tree=dump('entry')
 box=page.locator('#hostAccess').bounding_box()
 toolbar=next(n for n in tree.iter('node') if n.attrib.get('resource-id','').endswith('/control_container'))
 top=int(re.findall(r'\d+',toolbar.attrib['bounds'])[-1]);scale=1080/page.evaluate('innerWidth')
 adb('shell','input','tap',str(round((box['x']+box['width']/2)*scale)),str(round(top+(box['y']+box['height']/2)*scale)))
 time.sleep(1)
 tree=dump('native-dialog')
 editor=next(n for n in tree.iter('node') if n.attrib.get('class')=='android.widget.EditText')
 tap_node(editor);time.sleep(1)
 dump('native-keyboard')
 for x,y in [(110,1400),(645,1550),(430,1550)]:
  adb('shell','input','tap',str(x),str(y));time.sleep(.3)
 def text():
  tree=dump('dialog-state')
  return next(n for n in tree.iter('node') if n.attrib.get('class')=='android.widget.EditText').attrib.get('text','')
 typed=text();assert typed.lower()=='abc',typed
 adb('shell','input','tap','995','1550');time.sleep(.3)
 assert text()==typed[:-1],'Native dialog Backspace failed'
 adb('shell','input','tap','430','1550');time.sleep(.3)
 typed=text();assert typed.lower()=='abc'
 # Seal a test-only fixture using exactly the case supplied by Android's keyboard.
 subprocess.run(['node',str(ROOT/'tools/seal.mjs')],env={**os.environ,'ESTUDIO_PASSWORD':typed,'ESTUDIO_TEST_BUILD':'1'},check=True)
 tree=dump('dialog-edited')
 ok=next(n for n in tree.iter('node') if n.attrib.get('resource-id')=='android:id/button1' or n.attrib.get('resource-id','').endswith('/positive_button') or n.attrib.get('text') in ['OK','Aceptar'])
 tap_node(ok)
 page.frame_locator('#studio').locator('#heading').wait_for(timeout=20000)
 assert page.frame_locator('#studio').locator('#heading').inner_text()=='Prepara tu próxima entrevista.'
 dump('host-unlocked')
 print('PASS: Brave Android 1.95.104 / Android 11: native Android EditText dialog receives software-keyboard touches, Backspace/retype and opens host. No web password field, CDP typing or paste.',flush=True)
 browser.close()
server.shutdown()
