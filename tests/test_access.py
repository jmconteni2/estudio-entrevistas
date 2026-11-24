"""Check native browser-prompt access, cancellation, wrong password and invitations."""
import functools,http.server,os,pathlib,shutil,threading
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'docs')))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as p:
  engine=os.environ.get('BROWSER_ENGINE','chromium');kind=getattr(p,engine)
  launch={'headless':True}
  if engine=='chromium':launch.update(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path,args=['--no-sandbox'])
  browser=kind.launch(**launch)
  def studio(top):
   top.frame_locator('#studio').locator('#heading').wait_for(timeout=15000)
   return top.locator('#studio').element_handle().content_frame()
  def answer(page,value):
   def respond(dialog):
    assert dialog.type=='prompt'
    if value is None:dialog.dismiss()
    else:dialog.accept(value)
   page.once('dialog',respond);page.locator('#hostAccess').click()
  page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url)
  assert page.locator('input,textarea,form,iframe').count()==0
  answer(page,None)
  assert page.locator('#hostAccess').is_enabled()
  assert page.locator('#studio').count()==0
  answer(page,'')
  expect(page.locator('#accessMessage')).to_have_text('Introduce la contraseña para entrar.')
  answer(page,'incorrecta')
  expect(page.locator('#accessMessage')).to_have_text('Contraseña incorrecta.')
  assert page.locator('#studio').count()==0
  answer(page,os.environ['APP_PASSWORD'])
  host=studio(page);assert host.evaluate('window.ESTUDIO_MODE')=='host'
  key=host.evaluate('window.ESTUDIO_GUEST_KEY')
  for width,height in [(360,640),(390,844),(844,390)]:
   ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=True,**({'is_mobile':True} if engine!='firefox' else {}))
   mobile=ctx.new_page();mobile.goto(url)
   assert mobile.locator('input,textarea,form,iframe').count()==0
   answer(mobile,os.environ['APP_PASSWORD'])
   expect(studio(mobile).locator('#heading')).to_have_text('Prepara tu próxima entrevista.')
   ctx.close()
  guest=browser.new_page()
  guest.goto(url+'#room=entrevista-'+'a'*48+'&key='+'b'*48+'&access='+key)
  frame=studio(guest)
  expect(frame.locator('#heading')).to_have_text('Tu entrevista.')
  assert frame.evaluate('window.ESTUDIO_MODE')=='guest'
  assert frame.locator('#create').is_hidden()
  frame.locator('#prepare').click()
  expect(frame.locator('#notice')).to_have_text('Escribe tu nombre para entrar.')
  guest.goto(url+'#room=entrevista-'+'a'*48+'&key='+'b'*48)
  expect(guest.locator('#accessMessage')).to_have_text('La invitación no es válida o está incompleta.')
  assert guest.locator('#hostAccess').is_hidden()
  assert not errors,errors
  print('PASS: native prompt access; cancel/empty/wrong/correct; mobile/landscape; guest invitations unchanged. Engine:',engine)
  browser.close()
finally:server.shutdown()
