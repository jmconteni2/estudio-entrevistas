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
        expect(host.locator('#heading')).to_have_text('Prepara tu próxima entrevista.')
        assert host.evaluate('window.ESTUDIO_MODE')=='host'
        # Touch the real field and type through the keyboard, without fill(),
        # so an unfocusable or covered mobile input cannot silently pass.
        for width,height in [(360,640),(390,844),(844,390)]:
            mobile_ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
            mobile=mobile_ctx.new_page()
            mobile.goto(url)
            password=mobile.locator('#password')
            password.tap()
            assert password.evaluate('el => document.activeElement===el')
            mobile.keyboard.type('incorrecta')
            assert password.input_value()=='incorrecta'
            mobile.locator('#showPassword').tap()
            assert password.get_attribute('type')=='text'
            assert password.input_value()=='incorrecta'
            assert password.evaluate('el => document.activeElement===el')
            mobile.locator('#showPassword').tap()
            assert password.get_attribute('type')=='password'
            mobile.locator('#unlock').tap()
            expect(mobile.locator('#accessMessage')).to_have_text('Contraseña incorrecta.')
            password.tap()
            mobile.keyboard.press('ControlOrMeta+A')
            mobile.keyboard.type(os.environ['APP_PASSWORD'])
            mobile.keyboard.press('Enter')
            mobile.locator('#studio').wait_for(state='visible',timeout=15000)
            expect(mobile.frame(name='studio').locator('#heading')).to_have_text('Prepara tu próxima entrevista.')
            mobile_ctx.close()
        print('PASS: acceso táctil del anfitrión a 360x640, 390x844 y 844x390; foco, escritura con teclado, mostrar/ocultar, rechazo y apertura con Enter.')
        key=host.evaluate('window.ESTUDIO_GUEST_KEY')
        invite=url+'#room=entrevista-'+'a'*48+'&key='+'b'*48+'&access='+key
        guest=browser.new_page()
        guest.goto(invite)
        guest.locator('#studio').wait_for(state='visible',timeout=15000)
        frame=guest.frame(name='studio')
        expect(frame.locator('#heading')).to_have_text('Tu entrevista.')
        assert frame.evaluate('window.ESTUDIO_MODE')=='guest'
        assert frame.evaluate('window.ESTUDIO_GUEST_KEY') is None
        assert frame.locator('#create').is_hidden()
        frame.locator('#prepare').click()
        expect(frame.locator('#notice')).to_have_text('Escribe tu nombre para entrar.')
        assert frame.locator('#stage').is_hidden()
        guest.goto(url+'#room=entrevista-'+'a'*48+'&key='+'b'*48)
        expect(guest.locator('#accessMessage')).to_have_text('La invitación no es válida o está incompleta.')
        assert guest.locator('#studio').is_hidden()
        assert not errors, errors
        print('PASS: contraseña incorrecta rechazada; contraseña correcta abre anfitrión; invitación abre invitado sin contraseña; enlace incompleto rechazado.')
        browser.close()
finally:
    server.shutdown()
