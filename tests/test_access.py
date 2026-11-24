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
        engine=os.environ.get('BROWSER_ENGINE','chromium')
        browser_type=getattr(p,engine)
        launch={'headless':True}
        if engine=='chromium':
            launch.update(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path,args=['--no-sandbox'])
        browser=browser_type.launch(**launch)
        # With all page JavaScript disabled, native typing and editing must work.
        plain_ctx=browser.new_context(java_script_enabled=False)
        plain=plain_ctx.new_page();plain.goto(url)
        plain.locator('#password').click()
        plain.keyboard.insert_text('abc')
        plain.keyboard.press('Backspace')
        assert plain.locator('#password').input_value()=='ab'
        plain_ctx.close()
        def studio(top):
            top.frame_locator('#studio').locator('#heading').wait_for(timeout=15000)
            return top.locator('#studio').element_handle().content_frame()
        page=browser.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def unexpected_dialog(dialog):
            errors.append('Unexpected native dialog: '+dialog.type)
            dialog.dismiss()
        page.on('dialog',unexpected_dialog)
        page.goto(url)
        assert page.locator('#studio').is_hidden()
        page.locator('#password').fill('incorrecta')
        page.locator('#unlock').click()
        expect(page.locator('#accessMessage')).to_have_text('Contraseña incorrecta.')
        assert page.locator('#studio').is_hidden()
        page.locator('#password').fill(os.environ['APP_PASSWORD'])
        page.locator('#unlock').click()
        page.locator('#studio').wait_for(state='visible',timeout=15000)
        host=studio(page)
        expect(host.locator('#heading')).to_have_text('Prepara tu próxima entrevista.')
        assert host.evaluate('window.ESTUDIO_MODE')=='host'
        host.locator('#detailsToggle').click()
        host.locator('#name').click()
        page.keyboard.insert_text('Juanma Álvarez')
        page.keyboard.press('Backspace')
        assert host.locator('#name').input_value()=='Juanma Álvare'
        page.keyboard.insert_text('z')
        assert host.locator('#name').input_value()=='Juanma Álvarez'
        host.locator('#title').click()
        page.keyboard.insert_text('Entrevista de prueba')
        assert host.locator('#title').input_value()=='Entrevista de prueba'
        # Touch the real field and type through the keyboard, without fill(),
        # so an unfocusable or covered mobile input cannot silently pass.
        for width,height in [(360,640),(390,844),(844,390)]:
            mobile_ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=True,**({'is_mobile':True} if engine!='firefox' else {}))
            mobile=mobile_ctx.new_page()
            mobile.on('dialog',unexpected_dialog)
            mobile.goto(url)
            password=mobile.locator('#password')
            password.tap()
            assert password.evaluate('el => document.activeElement===el')
            assert password.evaluate("el=>el.tagName==='INPUT'")
            assert mobile.locator('iframe').count()==0
            assert mobile.locator('link[rel=stylesheet]').count()==0
            assert password.get_attribute('type')=='password'
            # Insert committed text as a software keyboard/IME does, rather
            # than only generating desktop physical-key events.
            mobile.keyboard.insert_text('inco')
            mobile.keyboard.insert_text('rrecta')
            assert password.input_value()=='incorrecta'
            mobile.locator('#showPassword').tap()
            assert password.get_attribute('type')=='text'
            assert password.input_value()=='incorrecta'
            mobile.locator('#showPassword').tap()
            assert password.get_attribute('type')=='password'
            mobile.locator('#unlock').tap()
            expect(mobile.locator('#accessMessage')).to_have_text('Contraseña incorrecta.')
            password.tap()
            mobile.keyboard.press('ControlOrMeta+A')
            mobile.keyboard.insert_text(os.environ['APP_PASSWORD'])
            mobile.keyboard.press('Enter')
            mobile.locator('#studio').wait_for(state='visible',timeout=15000)
            expect(studio(mobile).locator('#heading')).to_have_text('Prepara tu próxima entrevista.')
            mobile_host=studio(mobile)
            mobile_host.locator('#detailsToggle').tap()
            mobile_host.locator('#name').tap()
            mobile.keyboard.insert_text('Juanma')
            mobile.keyboard.press('Backspace')
            assert mobile_host.locator('#name').input_value()=='Juanm'
            mobile.keyboard.insert_text('a')
            assert mobile_host.locator('#name').input_value()=='Juanma'
            mobile_host.locator('#title').tap()
            mobile.keyboard.insert_text('Título de prueba')
            assert mobile_host.locator('#title').input_value()=='Título de prueba'
            mobile_ctx.close()
        print('PASS: acceso táctil del anfitrión a 360x640, 390x844 y 844x390; foco, escritura con teclado, mostrar/ocultar, rechazo y apertura con Enter.')
        fallback_ctx=browser.new_context()
        fallback_ctx.add_init_script("const original=CSS.supports.bind(CSS);CSS.supports=(...args)=>args[0]==='-webkit-text-security'?false:original(...args)")
        fallback=fallback_ctx.new_page()
        fallback.goto(url)
        assert fallback.locator('#password').get_attribute('type')=='password'
        fallback.locator('#showPassword').click()
        assert fallback.locator('#password').get_attribute('type')=='text'
        fallback.locator('#showPassword').click()
        assert fallback.locator('#password').get_attribute('type')=='password'
        fallback_ctx.close()
        print('PASS: campo password nativo estable, sin iframe durante la escritura; ojo conserva el valor; el navegador gestiona el foco y la edición. Motor:',engine)
        key=host.evaluate('window.ESTUDIO_GUEST_KEY')
        invite=url+'#room=entrevista-'+'a'*48+'&key='+'b'*48+'&access='+key
        guest=browser.new_page()
        guest.on('dialog',unexpected_dialog)
        guest.goto(invite)
        guest.locator('#studio').wait_for(state='visible',timeout=15000)
        frame=studio(guest)
        expect(frame.locator('#heading')).to_have_text('Tu entrevista.')
        assert frame.evaluate('window.ESTUDIO_MODE')=='guest'
        assert frame.evaluate('window.ESTUDIO_GUEST_KEY') is None
        assert frame.locator('#create').is_hidden()
        frame.locator('#prepare').click()
        expect(frame.locator('#notice')).to_have_text('Escribe tu nombre para entrar.')
        assert frame.locator('#stage').is_hidden()
        frame.locator('#name').click()
        guest.keyboard.insert_text('Invitada Ñ')
        guest.keyboard.press('Backspace')
        guest.keyboard.insert_text('Á')
        assert frame.locator('#name').input_value()=='Invitada Á'
        guest.goto(url+'#room=entrevista-'+'a'*48+'&key='+'b'*48)
        expect(guest.locator('#accessMessage')).to_have_text('La invitación no es válida o está incompleta.')
        assert guest.locator('#studio').is_hidden()
        assert not errors, errors
        print('PASS: contraseña incorrecta rechazada; contraseña correcta abre anfitrión; invitación abre invitado sin contraseña; enlace incompleto rechazado.')
        browser.close()
finally:
    server.shutdown()
