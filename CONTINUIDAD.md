# Continuidad — Lumen Interview v0.06

Proyecto independiente del usuario, publicado en https://jmconteni2.github.io/estudio-entrevistas/ . Repositorio público: https://github.com/jmconteni2/estudio-entrevistas . No mezclar con BookTrigger ni J.M. Pocket.

## Condiciones y uso

Sin Cloudflare, servicios facturados, bases de datos ni claves comerciales. GitHub Pages sirve archivos estáticos desde `main` y `/docs`, con HTTPS. No seleccionar la raíz: allí están los fuentes de desarrollo sin la entrada protegida.

El propietario eligió una contraseña sencilla para identificarse como anfitrión; no escribirla en el repositorio, las pruebas o la documentación pública. La contraseña está en la conversación privada. `docs/sealed-host.json` contiene la aplicación cifrada con una clave derivada de esa contraseña. Al desbloquearla se abre el panel del anfitrión. La invitación añade room, key y access al fragmento del enlace y abre el paquete separado de invitado, sin pedirle contraseña. Desde v0.04 el enlace válido autoriza la entrada automática; no pedir admisión manual al anfitrión.

La protección es local, sin autenticación de servidor. Los fuentes son públicos y no se pretende impedir su copia. El enlace de invitación se puede reenviar; no acredita identidad.

## Flujo v0.04

La petición del usuario es preparar enlaces antes de la entrevista, sin activar cámara ni conectar el anfitrión, y que todas las aceptaciones del invitado sean seguidas. Crear guarda room/token y metadatos localmente. Al volver al mismo navegador/dispositivo se restaura el mismo enlace. La cámara solo se pide al pulsar Entrar al estudio. El invitado pulsa Aceptar y entrar; si el anfitrión no está conectado se muestra «En espera de que el anfitrión se conecte.» y se reintenta automáticamente. Un enlace válido se admite sin otro botón del anfitrión. Se mantiene la limitación a un solo invitado y la validación de token/consentimiento.

Diseño claro marfil y violeta; cámara y botones solo durante la sesión; detalles opcionales y grabaciones plegadas. En móvil, cámara propia en miniatura. Retirados información técnica, diagnóstico y pie promocional.

## Cambios v0.05

Marca visible Lumen Interview, icono de Lumi con micrófono adaptado dentro de un cuadrado redondeado; colores crema/naranja según la captura del propietario, utilizada solo como referencia de color. El icono está en assets/lumi-icon.webp y docs/assets/lumi-icon.webp; no se debe copiar la captura del otro sitio a esta aplicación.

El invitado debe indicar su nombre antes de pedir cámara. Al acabar no se ofrece Volver a entrar; se marca la invitación terminada en ese navegador y se retira la sala del anfitrión. Otra sesión requiere una nueva invitación.

Cada participante puede cambiar su orientación (encuadre, sin giro de 90°) con el icono rectangular, antes o después de entrar. Se sincroniza por el canal existente. Pulsar una cámara la destaca y reduce la otra. El foco del invitado solo cambia su propia vista; el foco del anfitrión afecta a la grabación.

sceneLayout es la fuente común de posiciones para los elementos de cámara y la composición Canvas. Por defecto HH usa disposición diagonal superpuesta; VV usa dos retratos juntos; mixto distribuye ambos encuadres. recordingSize elige 1280×720 en HD salvo inicio VV, que utiliza 720×720. No cambiar las dimensiones del Canvas durante la captura: los cambios de orientación posteriores se encuadran dentro del tamaño inicial.

El fondo y los bordes, nombres y marca quedan incrustados en el archivo. El distintivo dice En vivo y tiene punto rojo pulsante. Wake Lock se solicita durante preparación/espera/entrevista y se libera al acabar; se ha retirado el recordatorio permanente de mantener pantalla encendida, sin prometer compatibilidad universal.

## Ajustes v0.06

Indicador En vivo con punto rojo pulsante en la cabecera; abajo Grabando sin punto. Iconos de orientación SVG, sin glifos de texto. resetCameraFocus devuelve el foco a null al pulsar el fondo o Escape; en HH las dos ventanas usan el mismo ancho y alto. El clic global excluye cámaras y controles interactivos.

Fondo CSS con luz y trazos cálidos sobre carbón; el Canvas incorpora luces, trama y ondas para que la decoración se conserve en la grabación. Full HD opcional en el selector: 1920×1080, o 1080×1080 si se inicia VV, a 5 Mbps de vídeo. 720p sigue siendo el valor inicial. El selector está dentro de Opciones de la entrevista.

## Archivos

- `app.js`, `index.html`, `style.css`, `storage-worker.js`: fuentes de la aplicación.
- `docs/index.html`, `docs/access.js`: entrada protegida y descifrado de la aplicación en un iframe de su mismo origen.
- `docs/sealed-host.json`, `docs/sealed-guest.json`: paquetes cifrados preparados para producción.
- `tools/seal.mjs`: regeneración con ESTUDIO_PASSWORD en el entorno. Nunca incluir su valor en el script. Conserva la clave de invitado al regenerar con la contraseña correcta para no invalidar enlaces anteriores. Usar ESTUDIO_TEST_BUILD=1 solo en la copia de pruebas.
- `tests/test_regressions.cjs`: 19 pruebas de lógica.
- `tests/test_browser.py`: prueba de medios y OPFS con señalización simulada.
- `tests/test_access.py`: comprueba rechazo de contraseña incorrecta, acceso de anfitrión y acceso de invitado e invitación inválida.
- `tests/test_live.py`: dos contextos, señalización PeerJS y WebRTC reales, consentimiento/admisión, grabación, salida y cierre, OPFS, descarga y decodificación.
- `.github/workflows/checks.yml`: pruebas en Ubuntu 24.04. Las pruebas regeneran `docs` con una contraseña de fixture en un checkout aislado; esa copia nunca se publica.

Si se modifica app.js o la plantilla HTML, regenerar los paquetes de producción con la contraseña del propietario antes de subirlos. No publicar los paquetes de fixture. Se ha verificado que la contraseña del propietario no aparece literalmente en los archivos públicos.

## Evidencia obtenida

Batería final v0.06 aprobada: ejecución 45381039403, trabajo 138399806268, commit 8950ea0709c72ded3047cc52b320d08b89b04512. Las 29 pruebas Node y las tres pruebas de navegador pasaron. Se verificaron invitaciones, nombre, cierre, orientaciones y foco independientes y restauración de cámaras de igual tamaño pulsando el fondo. Vídeos VP8/Opus a 1280×720 y 1920×1080 descargados y decodificados correctamente.

Despliegue correcto: ejecución 45381038394. Se revisó la imagen exportada con el nuevo fondo, En vivo arriba y cámaras horizontales de igual tamaño.

La prueba comprueba también que el invitado ve cierre sin Volver a entrar y que recargar el mismo enlace mantiene la sesión terminada en su navegador. Una invitación nueva permite otra entrevista. No hay base de datos ni servidor de revocaciones; la sala antigua del anfitrión se retira al acabar.

El bloqueo de pantalla se valida con un doble de Wake Lock para solicitarlo una vez y liberarlo; esto no equivale a certificar que todos los sistemas operativos impidan apagar la pantalla. Las capturas y los vídeos de pruebas utilizan medios sintéticos, no personas reales.

## Límites

La aplicación hace su propia llamada: no graba Zoom ni otras aplicaciones. Usa PeerJS público gratuito y STUN, sin TURN configurado; algunas redes pueden impedir conectar. Mantener página visible y pantalla activa: los sistemas móviles pueden suspenderla. No están certificados móviles físicos, todas las redes, sesiones de horas ni recuperación de archivos después de un cierre abrupto. Las grabaciones son locales; exportarlas antes de borrar los datos del navegador.

El usuario quiere la URL final y una prueba normal de uso, sin encargarse de configuraciones ni comprobaciones intermedias. Seguir corrigiendo autónomamente dentro de ese alcance.


## Acceso móvil v0.6.3

El propietario confirmó que el teclado escribía en Chrome Android y no en Brave. Los cambios previos de autofocus y de tipo de input no resolvieron su caso. No dar el fallo por reproducido ni su causa por confirmada.

El acceso usa ahora una textarea de una línea con máscara CSS en motores compatibles, sin autocompletado ni cambios de tipo. Evita la integración de input/password con el teclado y el gestor de credenciales. En motores sin text-security conserva el input password nativo. El ojo modifica solo la máscara, mantiene el contenido y el foco. Enter y la acción del teclado móvil envían el formulario sin introducir saltos de línea. No se modificaron el cifrado, la contraseña ni las invitaciones.

Ejecución 45390427468 aprobada: 29 pruebas Node, navegador de aplicación, acceso en Chrome y Brave estable oficial v1.100.58 instalado en Ubuntu, y entrevista/grabación. Ambos navegadores verifican entrada táctil/IME y apertura con contraseña en vistas 360×640, 390×844 y 844×390. Esto incluye Brave de escritorio con emulación táctil, no un teléfono Android físico. Producción index.html y access.js iguales a la revisión local. El resultado en el teléfono concreto del propietario sigue sin confirmación.


## Acceso v0.6.5 — comprobación Android y motores

El propietario informó que Chrome Android admitía escritura y Brave 1.95.104 (Chromium 153.0.8010.53) permitía pegar la contraseña, pero no escribir ni modificarla con el teclado. Esto apunta al recorrido de edición/foco/IME, no a una contraseña incorrecta. No se ha confirmado la causa exacta de su teléfono.

Se compararon con pulsaciones reales del teclado de Android 11 el campo personalizado, un input password estático con iframe y otro sin iframe. Los tres recibieron abc en el emulador: ejecución 45398197404. Por tanto, no atribuir como hecho probado el fallo del teléfono al iframe ni al reemplazo del campo. La textarea usó insertCompositionText y los inputs password nativos usaron insertText.

Se retiraron las sustituciones del input, la máscara CSS y los manejadores de escritura/composición. El campo es el input password del HTML inicial, sin autofocus. El ojo termina la edición anterior antes de cambiar el tipo y conserva valor, selección y foco. El iframe del estudio solo se crea después de autenticar. Al ocultar la página o restaurarla desde bfcache se libera un posible foco de edición conservado, para iniciar otra sesión nativa con el siguiente toque. No existe detección por marca, versión o dispositivo: es el acceso común.

Pruebas finales: la ejecución de comprobaciones es 45399478205, con éxito en Chrome, Brave estable de escritorio, Firefox y WebKit, además de las 29 pruebas Node y las pruebas de entrevista/grabación. Android: 45399478794, trabajo 138463977210, correcto. Brave Android oficial 1.95.104 sobre Android 11 emulado recibió pulsaciones en las teclas de Gboard para escribir, borrar y reescribir; después del ojo siguió editando; tras ir a Inicio y volver a Brave conservó el valor, aceptó más edición y entró como anfitrión mediante la tecla del teclado. Se utilizó una contraseña de fixture aislada, no la de producción. No se inyectó el texto mediante CDP ni se pegó.

Los ensayos en emulador no equivalen a observar el teléfono concreto. No declarar su causa exacta confirmada ni prometer ausencia universal de fallos. La revisión de recursos v0.6.5 cambia también la URL de access.js para evitar reutilizar versiones anteriores de la caché. No se cambiaron la contraseña real, el cifrado, las invitaciones ni los paquetes cifrados de producción.


## Acceso v0.6.6 — reconstrucción aislada

Se revisó la construcción del acceso, no solo el comportamiento específico de Brave. PBKDF2/AES-GCM solo interviene al enviar el formulario y no participa en la escritura. Se retiraron la hoja CSS general del estudio en la entrada, todos los ajustes no necesarios del input (máscara, appearance, text-fill, user-select y touch-action) y toda gestión manual de foco, selección, pulsaciones o composición. El ojo solo cambia el tipo y su etiqueta; después el usuario puede volver a tocar el campo de forma nativa. No hay autofocus ni iframe antes del desbloqueo. La pantalla de entrada tiene estilos propios, pequeños y autocontenidos; la aplicación se carga tras autenticar.

Se captura el valor al enviar, antes de esperar la carga del paquete. No se modificaron la contraseña de producción, PBKDF2/AES-GCM ni las invitaciones. No hay detección de navegador ni excepción para un teléfono. La causa del fallo observado en el teléfono del propietario continúa sin confirmación; no declarar que los estilos ni el foco fueron su causa demostrada. El cambio elimina complejidad innecesaria y permite comprobar el comportamiento base.

Comprobaciones 45401875391: correctas en Chrome, Brave de escritorio, Firefox y WebKit, incluyendo escritura y borrado con JavaScript desactivado; acceso correcto/incorrecto, ojo, invitación y entrada. También pasaron las 29 pruebas Node y el recorrido de entrevista y grabación. Android 45401875448, trabajo 138472277365: correcto con Brave Android oficial 1.95.104 sobre Android 11 emulado. Toques en el teclado real de Gboard escribieron abc, borraron y reescribieron, cambiaron el ojo y editaron de nuevo; después de salir y volver a Brave continuó la edición y entró como anfitrión mediante la tecla del teclado. No se usó texto inyectado por CDP ni pegado. Las claves y el paquete de pruebas son de fixture aislado, no de producción.

HTML y access.js públicos v0.6.6 verificados byte a byte con la revisión local. Se mantiene la referencia de recurso versionada para evitar reutilizar un script anterior. El emulador no sustituye la observación del teléfono concreto.


## Acceso v0.7.0 — sustitución por diálogo nativo

El formulario web se ha eliminado de la entrada de producción. El botón Entrar como anfitrión llama directamente, dentro del gesto del usuario y antes de cualquier espera, a window.prompt. La escritura tiene lugar en el diálogo propio del navegador; no hay input, textarea, formulario ni controles de teclado en la página. Los caracteres se muestran al escribir, y el mensaje del diálogo lo advierte. Cancelar no autentica, un valor vacío solicita contraseña, uno incorrecto se rechaza. La contraseña correcta descifra el mismo paquete de anfitrión. Invitaciones, contraseña real y cifrado no se modificaron.

Comprobaciones 45405667896: correctas en Chrome, Brave de escritorio, Firefox y WebKit; cancelación, vacío, incorrecta, correcta, vistas móviles, invitación y entrevista/grabación. Las 29 pruebas Node pasaron. Android 45405667909, trabajo 138485604133: correcto en Brave 1.95.104 / Android 11 emulado. Se localizó específicamente el control nativo com.brave.browser:id/js_modal_dialog_prompt, evitando la barra de direcciones. Toques reales en Gboard escribieron, borraron y reescribieron; pulsar OK abrió el anfitrión. No se aceptó el diálogo mediante CDP ni se pegó texto. Las credenciales de prueba son aisladas.

HTML y access.js v0.7.0 públicos coinciden con la revisión local. El bloqueo original del teléfono concreto no se ha reproducido: no atribuirlo como causa confirmada al cifrado ni a una característica de Brave. Este acceso sustituye el recorrido de edición web por uno nativo.
