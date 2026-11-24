# Estudio de entrevistas — v0.03

Aplicación estática para videollamadas de dos personas con grabación audiovisual local. El entrevistador crea la invitación, admite al invitado y guarda el vídeo en su dispositivo. El invitado acepta la grabación y solicita entrada. No utiliza Zoom ni captura una aplicación externa.

No requiere Cloudflare, base de datos, backend propio, suscripciones ni claves comerciales. La señalización utiliza PeerJS público gratuito; la conexión audiovisual es WebRTC directo con STUN. No hay TURN configurado, por lo que algunas redes no podrán conectarse.

## Estado

Publicada en https://jmconteni2.github.io/estudio-entrevistas/ desde la carpeta `docs` de `main`. Repositorio independiente: https://github.com/jmconteni2/estudio-entrevistas .

Batería completa aprobada en GitHub Actions, ejecución 45350056966: 19 pruebas de lógica, grabación con medios sintéticos y señalización simulada, acceso del anfitrión, rechazo de contraseña incorrecta e invitación incompleta, entrada del invitado y conexión PeerJS/WebRTC real entre dos contextos con grabación, persistencia OPFS, descarga y decodificación de vídeo VP8 a 1280×720 y audio Opus. Los siete recursos de producción comprobados responden por HTTPS y coinciden byte a byte con los revisados. No se han probado teléfonos físicos, redes físicas distintas ni sesiones de horas.

## Acceso

La página inicial pide la contraseña del anfitrión. La contraseña elegida por el propietario se utiliza para descifrar el paquete del anfitrión mediante PBKDF2 y AES-GCM; no se incluye en el código público. El anfitrión genera invitaciones que abren un paquete distinto para invitados. No necesitan la contraseña y no muestran los controles para crear una entrevista. La admisión sigue siendo manual.

Es una protección local para un sitio estático, no un servicio de autenticación con cuentas y servidor. La resistencia a intentos de adivinar la contraseña depende de su fuerza. Una invitación se puede reenviar y no prueba identidad. Los fuentes son públicos; esta protección no evita que otra persona copie el software y cree su propia versión. No se introduce un servicio de pago ni almacenamiento remoto para añadir el acceso.

Los paquetes de producción ya están preparados en `docs/`. `tools/seal.mjs` permite regenerarlos usando ESTUDIO_PASSWORD solo en el entorno de construcción; no escribir el valor en scripts ni documentación. Regenerar cambia la clave de invitado e invalida invitaciones de la publicación anterior. Las pruebas automáticas regeneran una copia aislada con una contraseña de prueba; no publican esa copia.

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
- Web Audio: mezcla de los dos micrófonos; MediaRecorder elige MP4 AVC cuando se admite; si no, prioriza WebM para escritura por bloques.
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

La validación del archivo utiliza PyAV, incluido en los requisitos Python. `CHROMIUM_PATH` permite seleccionar un ejecutable. Por defecto se usa Chromium del sistema si existe y, si no, el de Playwright.

`test_browser.py` simula únicamente la señalización y comprueba medios/almacenamiento reales con dispositivos sintéticos. `test_live.py` utiliza PeerJS y WebRTC reales entre dos contextos independientes, comprueba descarga y decodificación y no requiere claves. Dos contextos en un mismo ejecutor no prueban conectividad entre redes físicas diferentes ni móviles reales.

Para verificar la publicación HTTPS:

```sh
APP_URL=<URL real de GitHub Pages> APP_PASSWORD=<contraseña solo en el entorno local> python tests/test_live.py
```

`.github/workflows/checks.yml` ejecuta las comprobaciones al subir a `main`, sin secretos configurados por el usuario. Los resultados de Actions deben revisarse antes de declarar la aplicación comprobada.

## Publicación GitHub Pages

Repositorio público independiente `jmconteni2/estudio-entrevistas`. Pages está configurado para servir `main` y `/docs`, con HTTPS. La raíz del repositorio conserva fuentes y pruebas; la carpeta `docs` contiene la entrada con contraseña, los paquetes cifrados y los recursos necesarios. No cambiar Pages a raíz: serviría la aplicación de desarrollo sin la puerta de acceso.

Los tests verifican y no despliegan. Para cambios de la aplicación, regenerar los paquetes con la contraseña del propietario en el entorno de construcción y subir los archivos resultantes. La contraseña y las grabaciones no se suben.
