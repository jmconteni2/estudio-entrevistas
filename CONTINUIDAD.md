# Continuidad — Estudio de entrevistas v0.03

Proyecto independiente del usuario, publicado en https://jmconteni2.github.io/estudio-entrevistas/ . Repositorio público: https://github.com/jmconteni2/estudio-entrevistas . No mezclar con BookTrigger ni J.M. Pocket.

## Condiciones y uso

Sin Cloudflare, servicios facturados, bases de datos ni claves comerciales. GitHub Pages sirve archivos estáticos desde `main` y `/docs`, con HTTPS. No seleccionar la raíz: allí están los fuentes de desarrollo sin la entrada protegida.

El propietario eligió una contraseña sencilla para identificarse como anfitrión; no escribirla en el repositorio, las pruebas o la documentación pública. La contraseña está en la conversación privada. `docs/sealed-host.json` contiene la aplicación cifrada con una clave derivada de esa contraseña. Al desbloquearla se abre el panel del anfitrión. La invitación añade room, key y access al fragmento del enlace y abre el paquete separado de invitado, sin pedirle contraseña. El anfitrión sigue teniendo que admitirlo antes de empezar.

La protección es local, sin autenticación de servidor. Los fuentes son públicos y no se pretende impedir su copia. El enlace de invitación se puede reenviar; no acredita identidad.

## Archivos

- `app.js`, `index.html`, `style.css`, `storage-worker.js`: fuentes de la aplicación.
- `docs/index.html`, `docs/access.js`: entrada protegida y descifrado de la aplicación en un iframe de su mismo origen.
- `docs/sealed-host.json`, `docs/sealed-guest.json`: paquetes cifrados preparados para producción.
- `tools/seal.mjs`: regeneración con ESTUDIO_PASSWORD en el entorno. Nunca incluir su valor en el script. Cambia la clave de invitado al regenerar, de modo que invalida enlaces anteriores.
- `tests/test_regressions.cjs`: 19 pruebas de lógica.
- `tests/test_browser.py`: prueba de medios y OPFS con señalización simulada.
- `tests/test_access.py`: comprueba rechazo de contraseña incorrecta, acceso de anfitrión y acceso de invitado e invitación inválida.
- `tests/test_live.py`: dos contextos, señalización PeerJS y WebRTC reales, consentimiento/admisión, grabación, salida y cierre, OPFS, descarga y decodificación.
- `.github/workflows/checks.yml`: pruebas en Ubuntu 24.04. Las pruebas regeneran `docs` con una contraseña de fixture en un checkout aislado; esa copia nunca se publica.

Si se modifica app.js o la plantilla HTML, regenerar los paquetes de producción con la contraseña del propietario antes de subirlos. No publicar los paquetes de fixture. Se ha verificado que la contraseña del propietario no aparece literalmente en los archivos públicos.

## Evidencia obtenida

BATERÍA FINAL COMPLETA APROBADA: ejecución 45350056966, trabajo 138293966446, commit 5214df37f8d478c0df73c987ad2daa6aabad9fd0. Las 19 pruebas Node, test_browser.py, test_access.py y test_live.py pasaron. Vídeo VP8 1280×720 y audio Opus decodificados correctamente. Se verificó explícitamente rechazo de contraseña incorrecta e invitación incompleta, acceso de anfitrión e invitado y cambio de invitación en una página ya abierta.

DESPLIEGUE FINAL CORRECTO: ejecución 45350055578 del mismo commit. URL HTTPS abierta y recursos comprobados por integridad.

Las 19 pruebas Node pasan localmente y en Actions. La sintaxis JS y Python es correcta. Este ejecutor local no permite arrancar Chromium, por lo que se completó la prueba audiovisual en GitHub Actions.

Trabajo `real-signaling`, ejecución 45345841007, commit 3f20e261b6c09934d8dd7cdc89b2e66f6525a43f: correcto. Dos contextos acceden por contraseña/enlace, se conectan por PeerJS y WebRTC reales y graban, cierran, exportan y recuperan el archivo tras recargar. ffprobe identificó vídeo VP9 1280×720 y audio Opus; ffmpeg lo decodificó correctamente. Medios sintéticos, sin teléfonos físicos.

Pages, ejecución 45348194904: correcto. URL HTTPS abierta y entrada con contraseña visible. Siete recursos publicados coinciden byte a byte con los locales, incluidos ambos paquetes cifrados. Comprobación criptográfica del paquete de producción: la contraseña elegida descifra los fuentes actuales; otra contraseña falla; la clave de invitado no descifra al anfitrión; un paquete modificado falla.

El primer CI falló por la migración de ubuntu-latest a Ubuntu 26.04; se fijó Ubuntu 24.04. Un trabajo adicional agotó el plazo instalando dependencias. La batería final usa el Chrome preinstalado del ejecutor y PyAV, sin instalación de paquetes del sistema, y pasó completa. No quedan comprobaciones automáticas pendientes.

## Límites

La aplicación hace su propia llamada: no graba Zoom ni otras aplicaciones. Usa PeerJS público gratuito y STUN, sin TURN configurado; algunas redes pueden impedir conectar. Mantener página visible y pantalla activa: los sistemas móviles pueden suspenderla. No están certificados móviles físicos, todas las redes, sesiones de horas ni recuperación de archivos después de un cierre abrupto. Las grabaciones son locales; exportarlas antes de borrar los datos del navegador.

El usuario quiere la URL final y una prueba normal de uso, sin encargarse de configuraciones ni comprobaciones intermedias. Seguir corrigiendo autónomamente dentro de ese alcance.
