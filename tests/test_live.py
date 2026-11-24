"""Two independent contexts, real PeerJS signaling and real WebRTC/media/OPFS.
Set APP_URL to test an HTTPS deployment; defaults to a temporary local server.
This does not certify two different physical networks or real phones.
"""
import base64
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
        guest.locator('#name').fill('Invitada de prueba')
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
        assert 'grabando' in host.locator('#recording').inner_text().casefold()
        assert host.locator('#status').inner_text()=='En vivo'
        assert 'grabando' in guest.locator('#recording').inner_text().casefold()
        assert guest.evaluate('audio.state')=='running', 'Audio del invitado suspendido'
        assert guest.evaluate('!!playbackSource'), 'No se ha conectado la salida de audio'
        assert guest.locator('#remoteName').inner_text()=='Entrevistador automático'
        assert host.locator('#remoteName').inner_text()=='Invitada de prueba'
        assert guest.locator('#localName').inner_text()=='Invitada de prueba'
        assert 'activar su sonido' not in guest.locator('#notice').inner_text()
        host.wait_for_function('written > 10000', timeout=20000)
        assert host.evaluate('remoteStream.getVideoTracks().some(t=>t.readyState==="live")')
        assert guest.evaluate('remoteStream.getAudioTracks().some(t=>t.readyState==="live")')
        guest.wait_for_function('document.getElementById("remote").readyState>=2 && !document.getElementById("remote").paused',timeout=15000)
        host.wait_for_function('document.getElementById("remote").readyState>=2 && !document.getElementById("remote").paused',timeout=15000)
        def export_scene(label):
            host.wait_for_timeout(800)
            image=host.evaluate('canvas.toDataURL("image/png")')
            (results/('export-'+label+'.png')).write_bytes(base64.b64decode(image.split(',',1)[1]))
        export_scene('mixed')
        guest.locator('#orientation').click()
        host.wait_for_function("remoteOrientation==='landscape'")
        assert host.evaluate('localOrientation')=='landscape'
        export_scene('horizontal')
        host.locator('#orientation').click()
        guest.wait_for_function("remoteOrientation==='portrait'")
        assert guest.evaluate('localOrientation')=='landscape'
        export_scene('mixed-reversed')
        guest.locator('#orientation').click()
        host.wait_for_function("remoteOrientation==='portrait'")
        export_scene('vertical')
        guest.locator('#focusLocal').click()
        assert guest.evaluate('focusedCamera')=='local'
        assert host.evaluate('focusedCamera') is None, 'La vista del invitado alteró la grabación'
        host.locator('#focusRemote').click()
        assert host.evaluate('focusedCamera')=='remote'
        export_scene('focused')
        host.locator('#stage').click(position={'x':5,'y':5})
        assert host.evaluate('focusedCamera') is None
        host.locator('#orientation').click()
        guest.locator('#orientation').click()
        host.wait_for_function("remoteOrientation==='landscape'")
        assert host.evaluate("sceneLayout(1280,720,'landscape','landscape').boxes.local.w===sceneLayout(1280,720,'landscape','landscape').boxes.remote.w")
        export_scene('restored-equal')
        guest_top.screenshot(path=str(results/'guest-recording-mobile.png'),full_page=True)
        host_top.screenshot(path=str(results/'host-recording.png'),full_page=True)
        # Ending the interview retires the guest view. Reload must not offer entry again.
        host.locator('#finish').click()
        host.locator('#result').wait_for(state='visible',timeout=20000)
        guest.locator('#guestEnd').wait_for(state='visible',timeout=10000)
        assert guest.locator('#again').is_hidden()
        guest_top.reload()
        guest_top.locator('#studio').wait_for(state='visible')
        guest=guest_top.frame(name='studio')
        guest.locator('#guestEnd').wait_for(state='visible')
        assert guest.locator('#prepare').is_hidden()
        assert host.evaluate('stream.getTracks().every(t=>t.readyState==="ended")')
        with host_top.expect_download() as download:
            host.locator('#download').click()
        with tempfile.TemporaryDirectory() as tmp:
            target = pathlib.Path(tmp) / download.value.suggested_filename
            download.value.save_as(target)
            assert target.stat().st_size > 10000
            info = check_media(target)
            print(json.dumps(info))
        # A fresh invitation permits a new session; two vertical cameras produce a square export.
        host=unlock_host(host_top)
        host.locator('#libraryToggle').click()
        host.get_by_role('button',name='Guardar vídeo',exact=True).wait_for(timeout=10000)
        host.locator('#create').click()
        new_invitation=host.locator('#link').input_value()
        assert new_invitation!=invitation
        host.locator('#detailsToggle').click()
        host.locator('#quality').select_option('1080')
        assert host.evaluate('localOrientation')=='landscape'
        assert host.evaluate('!stream'), 'Cambiar encuadre pidió cámara antes de entrar'
        host.locator('#prepare').click()
        guest_top.close()
        guest_top=guest_ctx.new_page();guest_top.on('pageerror',lambda e:errors.append(str(e)))
        guest_top.goto(new_invitation)
        guest_top.locator('#studio').wait_for(state='visible')
        guest=guest_top.frame(name='studio')
        guest.locator('#orientationSetup').click()
        guest.locator('#name').fill('Segunda invitación')
        guest.locator('#prepare').click()
        host.locator('#recording').wait_for(state='visible',timeout=30000)
        host.wait_for_function('written>10000',timeout=20000)
        assert host.evaluate('canvas.width===1920 && canvas.height===1080'), 'No se está grabando en Full HD'
        export_scene('square-vertical')
        guest.locator('#leave').click()
        host.locator('#result').wait_for(state='visible',timeout=20000)
        with host_top.expect_download() as download2:
            host.locator('#download').click()
        with tempfile.TemporaryDirectory() as tmp:
            target=pathlib.Path(tmp)/download2.value.suggested_filename
            download2.value.save_as(target)
            info=check_media(target)
            assert info['width']==1920 and info['height']==1080,info
            print(json.dumps(info))
        assert not errors, errors
        print('PASS: invitación anticipada, nombre obligatorio y visible, cámaras y orientaciones independientes, composiciones exportadas HH/VV/mixtas, foco independiente, invitación terminada bloqueada tras recargar, invitación nueva válida, vídeos 1280x720 y 720x720 decodificados.')
        browser.close()
finally:
    if server:
        server.shutdown()
