"""Browser verification of the encrypted gate using a CI-only password.
The public production password is never needed by this test.
"""
import functools
import http.server
import os
import pathlib
import shutil
import threading
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'docs')))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path,headless=True,args=['--no-sandbox'])
        page=browser.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url)
        assert page.locator('#studio').is_hidden()
        page.locator('#password').fill('incorrecta')
        page.locator('#unlock').click()
        expect(page.locator('#accessMessage')).to_have_text('Contraseña incorrecta.')
        assert page.locator('#studio').is_hidden()
        page.locator('#password').fill(os.environ['APP_PASSWORD'])
        page.locator('#unlock').click()
        page.locator('#studio').wait_for(state='visible',timeout=15000)
        host=page.frame(name='studio')
        expect(host.locator('#heading')).to_have_text('Nueva entrevista')
        assert host.evaluate('window.ESTUDIO_MODE')=='host'
        key=host.evaluate('window.ESTUDIO_GUEST_KEY')
        invite=url+'#room=entrevista-'+'a'*48+'&key='+'b'*48+'&access='+key
        guest=browser.new_page()
        guest.goto(invite)
        guest.locator('#studio').wait_for(state='visible',timeout=15000)
        frame=guest.frame(name='studio')
        expect(frame.locator('#heading')).to_have_text('Invitación a entrevista')
        assert frame.evaluate('window.ESTUDIO_MODE')=='guest'
        assert frame.evaluate('window.ESTUDIO_GUEST_KEY') is None
        assert frame.locator('#create').is_hidden()
        guest.goto(url+'#room=entrevista-'+'a'*48+'&key='+'b'*48)
        expect(guest.locator('#accessMessage')).to_have_text('La invitación no es válida o está incompleta.')
        assert guest.locator('#studio').is_hidden()
        assert not errors, errors
        print('PASS: contraseña incorrecta rechazada; contraseña correcta abre anfitrión; invitación abre invitado sin contraseña; enlace incompleto rechazado.')
        browser.close()
finally:
    server.shutdown()
