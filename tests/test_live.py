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

ROOT = pathlib.Path(__file__).resolve().parents[1]
server = None
url = os.environ.get('APP_URL')
if not url:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args): pass
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}/'

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path,
            headless=True, args=['--no-sandbox', '--use-fake-device-for-media-stream',
                                '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
        host_ctx = browser.new_context(accept_downloads=True, permissions=['camera', 'microphone'])
        guest_ctx = browser.new_context(permissions=['camera', 'microphone'])
        host, guest = host_ctx.new_page(), guest_ctx.new_page()
        errors = []
        for page in (host, guest):
            page.on('pageerror', lambda e: errors.append(str(e)))
        host.goto(url)
        host.locator('#name').fill('Entrevistador automático')
        host.locator('#title').fill('Verificación técnica')
        host.locator('#prepare').click()
        host.locator('#create').wait_for(state='visible', timeout=20000)
        host.locator('#create').click()
        host.locator('#invitation').wait_for(state='visible', timeout=25000)
        invitation = host.locator('#link').input_value()
        guest.goto(invitation)
        guest.locator('#name').fill('Invitado automático')
        guest.locator('#consent').check()
        guest.locator('#prepare').click()
        guest.locator('#join').wait_for(state='visible', timeout=15000)
        guest.locator('#join').click()
        host.locator('#waiting').wait_for(state='visible', timeout=25000)
        assert host.locator('#recording').is_hidden(), 'Grabó antes de la admisión'
        host.locator('#accept').click()
        host.locator('#recording').wait_for(state='visible', timeout=35000)
        guest.locator('#recording').wait_for(state='visible', timeout=10000)
        host.wait_for_function('written > 10000', timeout=20000)
        assert host.evaluate('remoteStream.getVideoTracks().some(t=>t.readyState==="live")')
        assert guest.evaluate('remoteStream.getAudioTracks().some(t=>t.readyState==="live")')
        host.wait_for_timeout(6500)
        # Guest departure must finalize the host recording and stop both cameras.
        guest.locator('#leave').click()
        host.locator('#result').wait_for(state='visible', timeout=20000)
        assert host.evaluate('stream.getTracks().every(t=>t.readyState==="ended")')
        with host.expect_download() as download:
            host.locator('#download').click()
        with tempfile.TemporaryDirectory() as tmp:
            target = pathlib.Path(tmp) / download.value.suggested_filename
            download.value.save_as(target)
            assert target.stat().st_size > 10000
            info = json.loads(subprocess.check_output([
                'ffprobe','-v','error','-show_entries',
                'stream=codec_type,codec_name,width,height','-of','json',str(target)], text=True))
            assert {s['codec_type'] for s in info['streams']} >= {'audio','video'}
            subprocess.run(['ffmpeg','-v','error','-i',str(target),'-t','3','-f','null','-'], check=True)
            print(json.dumps(info))
        # Reload must retain OPFS recording and permit another download.
        host.reload()
        host.get_by_role('button', name='Guardar vídeo', exact=True).wait_for(timeout=10000)
        assert not errors, errors
        print('PASS: señalización PeerJS real, WebRTC en dos contextos, consentimiento, admisión, grabación, salida, cierre, persistencia OPFS, descarga y decodificación de audio/vídeo.')
        browser.close()
finally:
    if server:
        server.shutdown()
