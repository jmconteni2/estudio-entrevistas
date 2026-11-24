# Estudio de entrevistas — v0.04

Aplicación estática para videollamadas de dos personas con grabación audiovisual local. El entrevistador crea la invitación, admite al invitado y guarda el vídeo en su dispositivo. El invitado acepta la grabación y solicita entrada. No utiliza Zoom ni captura una aplicación externa.

No requiere Cloudflare, base de datos, backend propio, suscripciones ni claves comerciales. La señalización utiliza PeerJS público gratuito; la conexión audiovisual es WebRTC directo con STUN. No hay TURN configurado, por lo que algunas redes no podrán conectarse.

## Estado

Publicada en https://jmconteni2.github.io/estudio-entrevistas/ desde la carpeta `docs` de `main`. Repositorio independiente: https://github.com/jmconteni2/estudio-entrevistas .

La v0.04 simplifica el diseño y permite preparar invitaciones sin cámara ni conexión en directo. El invitado se conecta automáticamente cuando el anfitrión abre el estudio. La prueba de dos contextos verifica cierre y reapertura del anfitrión con el mismo enlace, espera del invitado sin nuevas pulsaciones, grabación, descarga y decodificación, además de la vista móvil a 390 px. Consultar `tests/RESULTADOS_GITHUB_v0.04.txt` para los resultados de la batería de esta versión. No se han probado todos los teléfonos físicos, todas las redes ni sesiones de horas.

## Acceso

La página inicial pide la contraseña del anfitrión. La contraseña elegida por el propietario se utiliza para descifrar el paquete del anfitrión mediante PBKDF2 y AES-GCM; no se incluye en el código público. El anfitrión genera invitaciones que abren un paquete distinto para invitados. No necesitan la contraseña y no muestran los controles para crear una entrevista. La invitación válida autoriza la conexión automática de un único invitado cuando el anfitrión abre el estudio.

Es una protección local para un sitio estático, no un servicio de autenticación con cuentas y servidor. La resistencia a intentos de adivinar la contraseña depende de su fuerza. Una invitación se puede reenviar y no prueba identidad. Los fuentes son públicos; esta protección no evita que otra persona copie el software y cree su propia versión. No se introduce un servicio de pago ni almacenamiento remoto para añadir el acceso.

Los paquetes de producción ya están preparados en `docs/`. `tools/seal.mjs` permite regenerarlos usando ESTUDIO_PASSWORD solo en el entorno de construcción; no escribir el valor en scripts ni documentación. La regeneración normal conserva la clave de invitado para mantener los enlaces enviados. ESTUDIO_ROTATE_INVITES permite invalidarlos deliberadamente; las pruebas usan ESTUDIO_TEST_BUILD para crear claves aisladas. Las pruebas automáticas regeneran una copia aislada con una contraseña de prueba; no publican esa copia.

## Uso

1. El anfitrión entra con su contraseña y pulsa **Generar enlace de invitación**. No se pide cámara ni se abre una conexión al preparar el enlace.
2. Copia o comparte el enlace. Puede cerrar la página y volver después desde el mismo navegador y dispositivo. El enlace y los datos de la entrevista se conservan localmente.
3. A la hora acordada, el anfitrión pulsa **Entrar al estudio** y concede los permisos de cámara y micrófono.
4. El invitado abre su enlace y pulsa **Aceptar y entrar**. Acepta la grabación y concede los permisos seguidos. La invitación válida autoriza su entrada: no hay un paso posterior de admisión del anfitrión.
5. Si el anfitrión no está conectado, el invitado ve **En espera de que el anfitrión se conecte.** La aplicación reintenta y conecta automáticamente cuando el anfitrión abre su estudio, sin nuevos botones.
6. **Finalizar** conserva el vídeo y ofrece **Descargar vídeo**. Las grabaciones anteriores se consultan en **Mis grabaciones**.

Nombre, título y calidad quedan bajo un control opcional. Las cámaras y los controles de llamada aparecen al entrar al estudio; la información técnica y el pie promocional se han retirado. El móvil muestra la cámara del invitado como vista principal y la propia en una miniatura.

Mantener la página visible y la pantalla activa durante la entrevista. El teléfono puede suspender el vídeo si se bloquea o se cambia de aplicación. Las grabaciones y las invitaciones pertenecen al navegador y dispositivo que las creó. Borrar sus datos las elimina; exportar el vídeo antes de hacerlo. No se garantiza recuperar un archivo tras un cierre abrupto.

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
