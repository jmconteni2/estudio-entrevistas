# Lumen Interview — v0.6.6

Aplicación estática para videollamadas de dos personas con grabación audiovisual local. El entrevistador crea la invitación, admite al invitado y guarda el vídeo en su dispositivo. El invitado acepta la grabación y solicita entrada. No utiliza Zoom ni captura una aplicación externa.

No requiere Cloudflare, base de datos, backend propio, suscripciones ni claves comerciales. La señalización utiliza PeerJS público gratuito; la conexión audiovisual es WebRTC directo con STUN. No hay TURN configurado, por lo que algunas redes no podrán conectarse.

## Estado

Lumen Interview está publicada en https://jmconteni2.github.io/estudio-entrevistas/ desde `main` y `/docs`. La dirección y el repositorio independiente se conservan.

Batería v0.06 aprobada: 29 pruebas de lógica y tres pruebas de navegador. Se verificaron el flujo de invitación, nombre, cierre, orientaciones independientes y restauración de las cámaras iguales al pulsar el fondo. Dos vídeos VP8/Opus se descargaron y decodificaron a 1280×720 y 1920×1080. Resultados en `tests/RESULTADOS_GITHUB_v0.06.txt`.

Los ocho recursos HTTPS comprobados coinciden con los archivos revisados. No se certifican todos los teléfonos físicos, todas las redes ni entrevistas de varias horas. Las limitaciones de conexión directa y del sistema operativo continúan aplicando.

## Acceso

La página inicial pide la contraseña del anfitrión. La contraseña elegida por el propietario se utiliza para descifrar el paquete del anfitrión mediante PBKDF2 y AES-GCM; no se incluye en el código público. El anfitrión genera invitaciones que abren un paquete distinto para invitados. No necesitan la contraseña y no muestran los controles para crear una entrevista. La invitación válida autoriza la conexión automática de un único invitado cuando el anfitrión abre el estudio.

Es una protección local para un sitio estático, no un servicio de autenticación con cuentas y servidor. La resistencia a intentos de adivinar la contraseña depende de su fuerza. Una invitación se puede reenviar y no prueba identidad. Los fuentes son públicos; esta protección no evita que otra persona copie el software y cree su propia versión. No se introduce un servicio de pago ni almacenamiento remoto para añadir el acceso.

Los paquetes de producción ya están preparados en `docs/`. `tools/seal.mjs` permite regenerarlos usando ESTUDIO_PASSWORD solo en el entorno de construcción; no escribir el valor en scripts ni documentación. La regeneración normal conserva la clave de invitado para mantener los enlaces enviados. ESTUDIO_ROTATE_INVITES permite invalidarlos deliberadamente; las pruebas usan ESTUDIO_TEST_BUILD para crear claves aisladas. Las pruebas automáticas regeneran una copia aislada con una contraseña de prueba; no publican esa copia.

## Uso

1. El anfitrión entra con su contraseña y pulsa **Generar enlace de invitación**. No se pide cámara ni se abre una conexión al preparar el enlace.
2. Copia o comparte el enlace. Puede cerrar la página y volver después desde el mismo navegador y dispositivo. El enlace y los datos de la entrevista se conservan localmente.
3. A la hora acordada, el anfitrión pulsa **Entrar al estudio** y concede los permisos de cámara y micrófono.
4. El invitado abre su enlace, escribe su nombre y pulsa **Aceptar y entrar**. Acepta la grabación y concede los permisos seguidos. La invitación válida autoriza su entrada: no hay un paso posterior de admisión del anfitrión.
5. Si el anfitrión no está conectado, el invitado ve **En espera de que el anfitrión se conecte.** La aplicación reintenta y conecta automáticamente cuando el anfitrión abre su estudio, sin nuevos botones.
6. **Finalizar** conserva el vídeo y ofrece **Descargar vídeo**. Las grabaciones anteriores se consultan en **Mis grabaciones**.

Nombre, título y calidad quedan bajo un control opcional. Las cámaras y los controles de llamada aparecen al entrar al estudio; la información técnica y el pie promocional se han retirado. El móvil muestra la cámara del invitado como vista principal y la propia en una miniatura.

Mantener la página visible y la pantalla activa durante la entrevista. El teléfono puede suspender el vídeo si se bloquea o se cambia de aplicación. Las grabaciones y las invitaciones pertenecen al navegador y dispositivo que las creó. Borrar sus datos las elimina; exportar el vídeo antes de hacerlo. No se garantiza recuperar un archivo tras un cierre abrupto.

## Ajustes v0.06

En vivo aparece arriba con su punto rojo pulsante; abajo queda Grabando. Los controles de orientación usan iconos SVG. Pulsar el fondo, fuera de las cámaras y de los controles, o Escape en la composición, devuelve la vista equilibrada. En horizontal ambas ventanas vuelven al mismo tamaño.

El fondo del estudio y del vídeo incorpora iluminación cálida y trazos geométricos sobre carbón. El selector de calidad, dentro de Opciones de la entrevista, ofrece Full HD 1080p: 1920×1080 para composición horizontal/mixta y 1080×1080 para inicio con dos cámaras verticales, con mayor bitrate. Se conserva 720p por defecto para dispositivos con menos recursos.

## Cámaras y composición del vídeo

Cada participante elige el encuadre horizontal o vertical de su cámara con el icono rectangular, antes de entrar o durante la entrevista. Se ajusta el encuadre sin girar de lado la imagen. La selección se comunica al otro participante.

| Cámaras al iniciar | Composición automática | Archivo en calidad HD |
| --- | --- | --- |
| Las dos horizontales | Dos ventanas escalonadas y parcialmente superpuestas, como en el boceto del propietario | 1280×720 |
| Las dos verticales | Ventanas verticales juntas, una al lado de la otra | 720×720 |
| Una horizontal y otra vertical | Distribución mixta que respeta los dos encuadres | 1280×720 |

Se puede pulsar cualquiera de las cámaras para destacarla y reducir la otra. La vista del invitado es independiente. La selección del anfitrión es la que se aplica a la grabación. El fondo es carbón con un degradado cálido; cada cámara lleva borde fino, esquinas redondeadas y su nombre. El vídeo incluye el icono de Lumi, la marca Lumen Interview y el indicador En vivo.

El tamaño del archivo de vídeo se fija al comenzar. Los cambios posteriores de encuadre o cámara principal adaptan la composición dentro de ese tamaño, para mantener un único archivo continuo.

## Cierre y pantalla activa

Al terminar, el invitado ve una despedida sin opción de volver a entrar. La invitación terminada se marca en su navegador y el anfitrión descarta la sala al finalizar; una nueva entrevista requiere un enlace nuevo. No se añade una base de datos de revocaciones: otro navegador puede abrir un enlace antiguo, pero no conecta con una sala del anfitrión que ya ha sido retirada.

Se solicita Screen Wake Lock desde la preparación y se vuelve a pedir al recuperar la visibilidad si se ha liberado. Se libera al terminar. La compatibilidad y las decisiones del sistema operativo siguen aplicando; no se garantiza impedir una suspensión forzada o una batería agotada.

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


## Revisión de acceso v0.6.6

La entrada utiliza un formulario HTML nativo y estilos propios. No carga la hoja general del estudio ni controla el foco o la escritura. Se verificaron escritura y borrado con JavaScript desactivado en los tres motores, acceso completo en Chrome/Brave/Firefox/WebKit y pulsaciones reales de Gboard en Brave 1.95.104 sobre Android 11 emulado. Evidencia en tests/RESULTADOS_ACCESO_v0.6.6.txt; el fallo del teléfono concreto no tiene causa confirmada.
