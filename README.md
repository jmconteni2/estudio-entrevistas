# Estudio de entrevistas — v0.02

Aplicación estática para videollamadas de dos personas con grabación audiovisual local. El entrevistador crea la invitación, admite al invitado y guarda el vídeo en su dispositivo. El invitado acepta la grabación y solicita entrada. No utiliza Zoom ni captura una aplicación externa.

No requiere Cloudflare, base de datos, backend propio, suscripciones ni claves comerciales. La señalización utiliza PeerJS público gratuito; la conexión audiovisual es WebRTC directo con STUN. No hay TURN configurado, por lo que algunas redes no podrán conectarse.

## Estado

Revisión de código y correcciones v0.02 realizadas. 18 pruebas de lógica aprobadas; sintaxis JavaScript y Python comprobada. Las pruebas audiovisuales están preparadas, pero este entorno bloqueó el arranque de Chromium. No publicada ni certificada para uso estable. Consultar `AUDITORIA.md` para evidencia, hallazgos y límites concretos.

## Uso

1. El anfitrión introduce nombre y título y activa cámara y micrófono. La aplicación comprueba primero que puede escribir en el almacenamiento local.
2. Genera una invitación y comparte su enlace con el invitado. No publiques el enlace: permite solicitar entrada a la sala.
3. El invitado abre el enlace, introduce su nombre, acepta la grabación, activa cámara/micrófono y solicita acceso.
4. El anfitrión admite al invitado. Tras la confirmación del invitado y la recepción del flujo remoto comienza la grabación.
5. Finalizar y guardar ofrece la descarga. Si sale el invitado o se cierra la llamada, el anfitrión intenta cerrar y conservar la grabación.

Mantener la página visible y la pantalla activa durante la entrevista. En móviles, cambiar de aplicación o bloquear la pantalla puede interrumpir el vídeo aunque haya Wake Lock. Las grabaciones OPFS permanecen en el navegador y dispositivo que las creó; exportarlas antes de borrar sus datos. No se garantiza recuperar un archivo tras un cierre abrupto.

La invitación se conserva localmente si el navegador lo permite y se descarta al finalizar la entrevista. La sala solo está disponible mientras el anfitrión esté conectado. Si localStorage está bloqueado, la sesión puede funcionar sin recordar la invitación después de recargar.

## Arquitectura

- `index.html`, `style.css`, `app.js`: interfaz, admisión y ciclo de sesión.
- `vendor/peerjs-1.5.5.min.js`: biblioteca incluida; no se descarga desde un CDN al usar la página. Licencia en `vendor/PeerJS-LICENSE.txt`.
- PeerJS: señalización gratuita; STUN público para intentar conexión WebRTC directa. No se configura ningún servicio facturado.
- Canvas a 720p o 480p: composición de las dos cámaras, sin controles de la interfaz.
- Web Audio: mezcla de los dos micrófonos; MediaRecorder genera MP4 si lo admite o WebM.
- `storage-worker.js`: worker del propio navegador que escribe y vacía bloques en OPFS. No es un Cloudflare Worker ni ejecuta código en un servidor.
- Cola de escritura limitada a 32 MiB: si el dispositivo no guarda al ritmo necesario, se detiene e intenta preservar la parte escrita. No limita la memoria interna del navegador.
- No se suben las grabaciones a GitHub, PeerJS ni un servidor de almacenamiento. PeerJS y STUN sí intervienen en el establecimiento de conexión y pueden conocer metadatos.

## Comprobaciones

Sin dependencias Node:

```sh
npm run check
npm test
```

Pruebas audiovisuales en un ejecutor que permita Chromium:

```sh
pip install -r tests/requirements.txt
python -m playwright install --with-deps chromium
python tests/test_browser.py
python tests/test_live.py
```

Instalar ffmpeg/ffprobe desde los paquetes del sistema si no están disponibles. `CHROMIUM_PATH` permite seleccionar un ejecutable. Por defecto se usa Chromium del sistema si existe y, si no, el de Playwright.

`test_browser.py` simula únicamente la señalización y comprueba medios/almacenamiento reales con dispositivos sintéticos. `test_live.py` utiliza PeerJS y WebRTC reales entre dos contextos independientes, comprueba descarga y decodificación y no requiere claves. Dos contextos en un mismo ejecutor no prueban conectividad entre redes físicas diferentes ni móviles reales.

Para verificar la publicación HTTPS:

```sh
APP_URL=<URL real de GitHub Pages> python tests/test_live.py
```

`.github/workflows/checks.yml` ejecuta las comprobaciones al subir a `main`, sin secretos configurados por el usuario. Los resultados de Actions deben revisarse antes de declarar la aplicación comprobada.

## Publicación GitHub Pages

Crear un repositorio público independiente `estudio-entrevistas` y subir el contenido de esta carpeta a `main`. Conservar `.nojekyll`. Activar Pages desde `main` y `/(root)`. No hacen falta compilación ni secretos de despliegue. Obtener la URL efectiva desde Pages y comprobarla por HTTPS; no deducirla como si ya estuviese publicada.

Los tests son de verificación y no despliegan. El bloqueo actual de acceso a GitHub está registrado en `CONTINUIDAD.md` y `AUDITORIA.md`.
