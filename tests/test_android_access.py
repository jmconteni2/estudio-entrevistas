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
adb('shell','am','start','-a','android.intent.action.VIEW','-d','http://10.0.2.2:8765/','com.brave.browser')
time.sleep(5)
for i in range(9):
 tree=dump('onboard-'+str(i))
 labels=[(n.attrib.get('text','')+' '+n.attrib.get('content-desc','')).strip() for n in tree.iter('node')]
 print('Android controls:',labels,flush=True)
 if any('Contraseña' in label or '10.0.2.2:8765' in label for label in labels):break
 node=next((n for n in tree.iter('node') if re.fullmatch(r'Get started|Skip|Not now|No thanks|Maybe later|Continue|Start browsing|Got it',n.attrib.get('text',''),re.I)),None)
 if node is not None:tap_node(node)
 else:
  cancel=next((n for n in tree.iter('node') if n.attrib.get('text')=='Cancel'),None)
  if cancel is not None:tap_node(cancel)
  else:break
 time.sleep(2)
adb('forward','tcp:9222','localabstract:chrome_devtools_remote')
# Control pages isolate stable HTML from the application's field replacement.
html=(ROOT/'docs/index.html').read_text()
html=re.sub(r'<script defer src="access.js[^"]*"></script>','',html)
(ROOT/'docs/native-frame.html').write_text(html)
(ROOT/'docs/native-alone.html').write_text(re.sub(r'<iframe[\s\S]*?</iframe>','',html))
with sync_playwright() as p:
 browser=p.chromium.connect_over_cdp('http://127.0.0.1:9222',timeout=20000)
 page=next((page for context in browser.contexts for page in context.pages if '10.0.2.2' in page.url),None)
 if page is None:page=browser.contexts[0].new_page()
 outcomes={}
 for mode,path in [('actual',''),('native-frame','native-frame.html'),('native-alone','native-alone.html')]:
  page.goto('http://10.0.2.2:8765/'+path)
  page.locator('#password').wait_for()
  page.evaluate("window.entryEvents=[];for(const type of ['input','beforeinput','compositionstart','compositionend','focus','blur']) document.getElementById('password').addEventListener(type,e=>entryEvents.push({type:e.type,inputType:e.inputType,length:e.target.value.length}))")
  tree=dump(mode+'-login')
  box=page.locator('#password').bounding_box()
  toolbar=next(n for n in tree.iter('node') if n.attrib.get('resource-id','').endswith('/control_container'))
  top=int(re.findall(r'\d+',toolbar.attrib['bounds'])[-1])
  scale=1080/page.evaluate('innerWidth')
  adb('shell','input','tap',str(round((box['x']+20)*scale)),str(round(top+(box['y']+20)*scale)))
  time.sleep(2)
  dump(mode+'-keyboard')
  # Pixel 2 / Android 11 Gboard coordinates were inspected in keyboard.png.
  # These are native screen taps into the software keyboard, not injected text.
  for x,y in [(110,1400),(645,1550),(430,1550)]:
   adb('shell','input','tap',str(x),str(y));time.sleep(.4)
  state=page.evaluate("({active:document.activeElement.id,value:document.getElementById('password').value,events:entryEvents})")
  outcomes[mode]=state
  print('KEYBOARD RESULT',mode,json.dumps(state),flush=True)
  dump(mode+'-typed')
  adb('shell','input','keyevent','4');time.sleep(.5)
 (OUT/'outcomes.json').write_text(json.dumps(outcomes,indent=2))
 print('ANDROID COMPARISON',json.dumps(outcomes),flush=True)
 assert any(state['value']=='abc' for state in outcomes.values()),'No scenario accepted native keyboard input'
 browser.close()
server.shutdown()
