"""Two independent contexts, real PeerJS signaling and real WebRTC/media/OPFS.
Set APP_URL to test an HTTPS deployment; defaults to a temporary local server.
This does not certify two different physical networks or real phones.
"""
import functools
import http.server
import json
import os
import pathlib
import shutil
import subprocess
import tempfile
import threading
from playwright.sync_api import sync_playwright
from media_check import check_media

ROOT = pathlib.Path(__file__).resolve().parents[1]
server = None
url = os.environ.get('APP_URL')
if not url:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args): pass
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}/' + ('docs/' if os.environ.get('APP_PASSWORD') else '')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path,
            headless=True, args=['--no-sandbox', '--use-fake-device-for-media-stream',
                                '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
        host_ctx = browser.new_context(accept_downloads=True, permissions=['camera', 'microphone'])
        guest_ctx = browser.new_context(permissions=['camera', 'microphone'], viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        host_top, guest_top = host_ctx.new_page(), guest_ctx.new_page()
        host, guest = host_top, guest_top
        errors = []
        for page in (host_top, guest_top):
            page.on('pageerror', lambda e: errors.append(str(e)))
        def unlock_host(top):
            top.goto(url)
            if not os.environ.get('APP_PASSWORD'):
                return top
            top.locator('#password').fill(os.environ['APP_PASSWORD'])
            top.locator('#unlock').click()
            top.locator('#studio').wait_for(state='visible', timeout=20000)
            frame = top.frame(name='studio')
            frame.locator('#heading').wait_for(timeout=10000)
            return frame
        host = unlock_host(host_top)
        results=ROOT/'test-results';results.mkdir(exist_ok=True)
        host_top.screenshot(path=str(results/'host-home.png'),full_page=True)
        host.locator('#detailsToggle').click()
        host.locator('#name').fill('Entrevistador automático')
        host.locator('#title').fill('Verificación técnica')
        host.locator('#create').click()
        host.locator('#invitation').wait_for(state='visible')
        assert host.evaluate('!stream && !peer'), 'El enlace requiere cámara o anfitrión conectado'
        invitation=host.locator('#link').input_value()
        host_top.screenshot(path=str(results/'invitation-ready.png'),full_page=True)
        host_top.close()
        guest_top.goto(invitation)
        if os.environ.get('APP_PASSWORD'):
            guest_top.locator('#studio').wait_for(state='visible',timeout=20000)
            guest=guest_top.frame(name='studio')
            guest.locator('#prepare').wait_for(timeout=10000)
        guest.locator('#prepare').click()
        guest.locator('#waitingTitle').filter(has_text='En espera de que el anfitrión se conecte.').wait_for(timeout=25000)
        guest_top.screenshot(path=str(results/'guest-waiting-mobile.png'),full_page=True)
        assert guest.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Desbordamiento en móvil'
        host_top=host_ctx.new_page();host_top.on('pageerror',lambda e:errors.append(str(e)))
        host=unlock_host(host_top)
        assert host.locator('#link').input_value()==invitation, 'Cambió el enlace al volver más tarde'
        host.locator('#prepare').click()
        # The same guest waits and joins automatically: no further button on either side.
        host.locator('#recording').wait_for(state='visible',timeout=40000)
        guest.locator('#recording').wait_for(state='visible',timeout=10000)
        guest_top.screenshot(path=str(results/'guest-recording-mobile.png'),full_page=True)
        host_top.screenshot(path=str(results/'host-recording.png'),full_page=True)
        assert guest.evaluate('audio.state')=='running', 'Audio del invitado suspendido'
        assert guest.locator('#remoteName').inner_text()=='Entrevistador automático'
        assert 'activar su sonido' not in guest.locator('#notice').inner_text()
        host.wait_for_function('written > 10000', timeout=20000)
        assert host.evaluate('remoteStream.getVideoTracks().some(t=>t.readyState==="live")')
        assert guest.evaluate('remoteStream.getAudioTracks().some(t=>t.readyState==="live")')
        host.wait_for_timeout(6500)
        # Guest departure must finalize the host recording and stop both cameras.
        guest.locator('#leave').click()
        host.locator('#result').wait_for(state='visible', timeout=20000)
        assert host.evaluate('stream.getTracks().every(t=>t.readyState==="ended")')
        with host_top.expect_download() as download:
            host.locator('#download').click()
        with tempfile.TemporaryDirectory() as tmp:
            target = pathlib.Path(tmp) / download.value.suggested_filename
            download.value.save_as(target)
            assert target.stat().st_size > 10000
            info = check_media(target)
            print(json.dumps(info))
        # Reload must retain OPFS recording and permit another download.
        host = unlock_host(host_top)
        host.locator('#libraryToggle').click()
        host.get_by_role('button', name='Guardar vídeo', exact=True).wait_for(timeout=10000)
        assert not errors, errors
        print('PASS: invitación anticipada sin cámara, anfitrión cerrado y reabierto, invitado espera y entra automáticamente sin más botones, WebRTC real, grabación, cierre, descarga y decodificación. Diseño móvil sin desbordamiento.')
        browser.close()
finally:
    if server:
        server.shutdown()
