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
req=urllib.request.Request('https://api.github.com/repos/brave/brave-browser/releases/latest',headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'User-Agent':'Lumen-CI'})
with urllib.request.urlopen(req,timeout=40) as response:release=json.load(response)
asset=next(a for a in release['assets'] if a['name']=='BraveMonox64.apk')
apk=OUT/'brave.apk';urllib.request.urlretrieve(asset['browser_download_url'],apk)
print('Brave Android',release['tag_name'],flush=True)
print(adb('install','-r',str(apk)),flush=True);apk.unlink()
adb('shell','am','set-debug-app','--persistent','com.brave.browser')
adb('shell','sh','-c',"'echo brave --no-first-run --disable-fre --no-default-browser-check > /data/local/tmp/brave-command-line'")
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
with sync_playwright() as p:
 browser=p.chromium.connect_over_cdp('http://127.0.0.1:9222',timeout=20000)
 page=next((page for context in browser.contexts for page in context.pages if '10.0.2.2' in page.url),None)
 if page is None:page=browser.contexts[0].new_page()
 page.goto('http://10.0.2.2:8765/')
 page.locator('#password').wait_for()
 tree=dump('login')
 node=next((n for n in tree.iter('node') if 'Contraseña del anfitrión' in (n.attrib.get('text','')+n.attrib.get('content-desc',''))),None)
 if node is not None:tap_node(node)
 else:
  box=page.locator('#password').bounding_box()
  web=next(n for n in tree.iter('node') if 'WebView' in n.attrib.get('class','') or n.attrib.get('text')=='Web View')
  x1,y1,x2,y2=map(int,re.findall(r'\d+',web.attrib['bounds']))
  scale=(x2-x1)/page.evaluate('innerWidth')
  adb('shell','input','tap',str(round(x1+(box['x']+20)*scale)),str(round(y1+(box['y']+20)*scale)))
 time.sleep(2)
 tree=dump('keyboard')
 keys=[(n.attrib.get('text',''),n.attrib.get('content-desc',''),n.attrib.get('bounds','')) for n in tree.iter('node')]
 print('Keyboard controls:',keys,flush=True)
 # Tap visible soft-keyboard keys, rather than injecting text through CDP.
 for letter in 'abc':
  node=next((n for n in tree.iter('node') if letter in [n.attrib.get('text','').lower(),n.attrib.get('content-desc','').lower()]),None)
  if node is None:raise AssertionError('Keyboard key not exposed: '+letter)
  tap_node(node);time.sleep(.3)
 assert page.locator('#password').input_value()=='abc',page.locator('#password').input_value()
 dump('typed')
 print('PASS: Android 11 + Brave: physical touch on onscreen a,b,c produces abc in host password field.',flush=True)
 browser.close()
server.shutdown()
