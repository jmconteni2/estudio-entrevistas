# Acceso v0.6.5 — revisión común y prueba Android


## Acceso v0.6.5 — comprobación Android y motores

El propietario informó que Chrome Android admitía escritura y Brave 1.95.104 (Chromium 153.0.8010.53) permitía pegar la contraseña, pero no escribir ni modificarla con el teclado. Esto apunta al recorrido de edición/foco/IME, no a una contraseña incorrecta. No se ha confirmado la causa exacta de su teléfono.

Se compararon con pulsaciones reales del teclado de Android 11 el campo personalizado, un input password estático con iframe y otro sin iframe. Los tres recibieron abc en el emulador: ejecución 45398197404. Por tanto, no atribuir como hecho probado el fallo del teléfono al iframe ni al reemplazo del campo. La textarea usó insertCompositionText y los inputs password nativos usaron insertText.

Se retiraron las sustituciones del input, la máscara CSS y los manejadores de escritura/composición. El campo es el input password del HTML inicial, sin autofocus. El ojo termina la edición anterior antes de cambiar el tipo y conserva valor, selección y foco. El iframe del estudio solo se crea después de autenticar. Al ocultar la página o restaurarla desde bfcache se libera un posible foco de edición conservado, para iniciar otra sesión nativa con el siguiente toque. No existe detección por marca, versión o dispositivo: es el acceso común.

Pruebas finales: la ejecución de comprobaciones es 45399478205, con éxito en Chrome, Brave estable de escritorio, Firefox y WebKit, además de las 29 pruebas Node y las pruebas de entrevista/grabación. Android: 45399478794, trabajo 138463977210, correcto. Brave Android oficial 1.95.104 sobre Android 11 emulado recibió pulsaciones en las teclas de Gboard para escribir, borrar y reescribir; después del ojo siguió editando; tras ir a Inicio y volver a Brave conservó el valor, aceptó más edición y entró como anfitrión mediante la tecla del teclado. Se utilizó una contraseña de fixture aislada, no la de producción. No se inyectó el texto mediante CDP ni se pegó.

Los ensayos en emulador no equivalen a observar el teléfono concreto. No declarar su causa exacta confirmada ni prometer ausencia universal de fallos. La revisión de recursos v0.6.5 cambia también la URL de access.js para evitar reutilizar versiones anteriores de la caché. No se cambiaron la contraseña real, el cifrado, las invitaciones ni los paquetes cifrados de producción.


# Ajustes v0.06 — resultado comprobado

En vivo con punto rojo arriba; Grabando abajo. Iconos SVG de orientación, restauración de la vista equilibrada al pulsar el fondo, fondo decorado tanto en pantalla como en el vídeo y opción Full HD de 1920×1080. La calidad inicial sigue siendo 720p.

Ejecución 45381039403 aprobada: 29 pruebas Node y tres pruebas de navegador. Se descargaron y decodificaron vídeos a 1280×720 y 1920×1080 y se revisó una imagen del Canvas exportado. Despliegue 45381038394 correcto. Evidencia en tests/RESULTADOS_GITHUB_v0.06.txt. Las limitaciones de redes sin TURN y de suspensión del dispositivo siguen siendo aplicables.

# Lumen Interview v0.05 — cámaras, identidad y presentación

El nombre visible es Lumen Interview. La captura de otro sitio se utilizó solo como referencia de color: crema, naranja y carbón. El personaje de Lumi con micrófono se adaptó mediante generación de imagen a un icono propio de esquinas redondeadas, incorporado a la cabecera, acceso, favicon y marca del vídeo. No se publicó la captura ni la fotografía original sin adaptar.

Se exige el nombre del invitado antes de pedir cámara; aparece tanto en la llamada como en el archivo. Al terminar, la vista del invitado queda cerrada sin Volver a entrar y se marca la invitación usada en su navegador. La sala del anfitrión se descarta. Otra entrevista requiere un enlace nuevo; no se ha añadido un servicio remoto de revocaciones.

El encuadre de cada cámara es independiente y puede elegirse antes de entrar o cambiarse durante la sesión. Se ajusta su relación de aspecto, sin girar de lado la imagen. Los cambios se transmiten por el canal existente. El foco de cámara del invitado no altera el foco del anfitrión ni su grabación.

Las posiciones de DOM y Canvas proceden de sceneLayout. HH presenta dos ventanas escalonadas y superpuestas como en el boceto; VV, dos retratos juntos; los casos mixtos mantienen el encuadre de ambos. Pulsar una cámara la destaca y reduce la otra. El archivo empieza en 1280×720 (HD) o 720×720 si ambos encuadres son verticales. El tamaño queda fijo durante el archivo; cambios posteriores se componen dentro de esas dimensiones. Fondo carbón con degradado cálido, bordes redondeados, nombres y marca incrustados.

El indicador es En vivo con punto rojo pulsante, salvo preferencia de movimiento reducido. Se solicita Screen Wake Lock también durante preparación y espera y se libera al acabar. Se retiró el recordatorio fijo, sin afirmar que un navegador incompatible pueda impedir toda suspensión del sistema.

Las comprobaciones de lógica cubren límites geométricos de todos los encuadres y focos, nombre obligatorio, cierre de invitación, elección de encuadre antes de pedir cámara y liberación del bloqueo de pantalla. Las pruebas reales de navegador cambian las dos orientaciones por separado, comprueban el foco independiente, exportan composiciones HH/VV/mixtas y decodifican dos archivos (1280×720 y 720×720). Las imágenes de revisión proceden de medios sintéticos, no de personas reales.

Resultado final v0.05: ejecución 45362881233, trabajo 138337090594, commit 3e0959c47517e53dc1ae989ce87f50ea06cb0512, correcto. Las 28 pruebas Node y las tres pruebas de navegador pasaron. Despliegue 45362880978 correcto. Ocho recursos HTTPS idénticos a la versión revisada; se comprobó el icono, la marca completa y las composiciones en imágenes extraídas del Canvas exportado. Dos archivos VP8/Opus de 1280×720 y 720×720 decodificados sin error.

Los resultados de versiones anteriores se conservan a continuación como historial.

# Actualización v0.04 — interfaz e invitaciones anticipadas

El propietario pidió simplificar el diseño, preparar invitaciones sin activar cámara ni conectarse en directo y eliminar aceptaciones posteriores. El enlace válido autoriza al invitado. Al entrar, este acepta la grabación y concede los permisos seguidos; no existe un botón posterior de admisión. Si el anfitrión está desconectado se muestra «En espera de que el anfitrión se conecte.» y se reintenta automáticamente.

La invitación y los datos se conservan en el mismo navegador/dispositivo del anfitrión. Se ha probado generar el enlace sin cámara ni Peer, cerrar la página, dejar al invitado esperando, volver a abrir el anfitrión y establecer la llamada sin ninguna pulsación adicional del invitado. El empaquetado conserva la clave de invitado al actualizar, para mantener enlaces ya enviados; se comprobó comparando las claves descifradas antes y después sin imprimirlas.

Se retiraron información técnica, diagnóstico y pie promocional. Nombre, título y calidad son opcionales y plegables, las grabaciones quedan en Mis grabaciones y los controles de llamada solo aparecen durante la sesión. El diseño móvil usa cámara propia en miniatura y se comprobó que no desborda a 390 px.

El audio se activa desde el botón inicial y se reproduce mediante el AudioContext ya habilitado, evitando una aceptación posterior para oír al otro participante. Se solicita pantalla activa también durante la espera, si el navegador lo permite. El sistema operativo sigue pudiendo suspender una página; no se garantiza disponibilidad en todas las redes.

Resultados de v0.04: ejecución 45356316970, trabajo 138314909854, commit e14552669d72f24f0b397aeca21a9f3bc5b15bf9, correcta. 22 pruebas Node y tres pruebas de navegador aprobadas. Despliegue 45356316711 correcto. La prueba final verificó reproducción automática de las dos cámaras y salida de audio activa, además de espera, conexión y archivo descargado y decodificado. Se revisó el diseño mediante capturas de escritorio y móvil; la anchura de 390 px no desborda. Se compararon por HTTPS los siete recursos de producción con los archivos revisados.

Se conservan a continuación los resultados históricos de la auditoría y la v0.03; la admisión manual mencionada en esos resultados históricos fue sustituida por el flujo automático autorizado en v0.04.

# Auditoría de Estudio de entrevistas

Fecha: 24 de noviembre de 2026. Base revisada: `Estudio_Entrevistas_v0.01.zip`. Resultado de la revisión y correcciones: v0.03, con acceso del anfitrión y entrada por invitación.

## Dictamen

La arquitectura sirve para una entrevista de dos personas con grabación en el dispositivo del entrevistador. GitHub Pages puede servir los archivos estáticos; el vídeo no necesita pasar por su alojamiento. OPFS permite escribir en almacenamiento privado del navegador mediante un worker local. No se han introducido bases de datos, Cloudflare, servicios facturados ni claves comerciales.

La v0.01 no estaba validada para uso real y tenía defectos que podían interrumpir la conexión, bloquear el guardado o dejar una sesión sin salida visible. Se han corregido los defectos descritos abajo. La v0.03 se ha publicado y la prueba audiovisual en GitHub Actions pasó con dos contextos y medios sintéticos. Las comprobaciones no certifican móviles físicos, todas las redes ni duración de varias horas.

No existe fundamento para prometer «ningún fallo». La conexión directa puede fallar en redes restrictivas y el sistema operativo del teléfono puede suspender una página. Son límites de esta arquitectura, no errores que se solucionen con otra capa de interfaz.

## Hallazgos y cambios

| Prioridad | Hallazgo en la base | Cambio aplicado |
| --- | --- | --- |
| Alta | La aceptación viajaba por el canal de datos mientras la llamada se iniciaba por señalización independiente. Podía llegar antes la llamada y ser rechazada por el invitado. | El invitado confirma `ready` después de procesar la aceptación; solo entonces se inicia la llamada. |
| Alta | El worker podía dejar promesas pendientes indefinidamente si no respondía. | Plazo de 10 segundos, rechazo de peticiones pendientes y terminación del worker. |
| Alta | No se comprobaba la escritura OPFS antes de iniciar la entrevista. | Prueba de apertura, escritura, cierre y eliminación de un archivo de comprobación antes de pedir cámara al anfitrión. |
| Alta | Se podían acumular bloques de grabación sin límite de aplicación si el almacenamiento era lento. | Límite de 32 MiB en la cola pendiente; al superarlo se finaliza y se intenta conservar lo escrito. Este límite no controla la memoria interna del navegador ni del codificador. |
| Alta | Finalizar mientras se preparaba la grabación podía competir con la creación del archivo y los recursos. | La finalización espera la inicialización y reutiliza una sola tarea de cierre. |
| Media | Un JSON corrupto o el bloqueo de localStorage impedían crear invitaciones. | Validación de los identificadores, recuperación ante JSON inválido y funcionamiento temporal sin persistencia de la invitación. |
| Media | Se permitían pulsaciones simultáneas al preparar la cámara. | Bloqueo de operaciones duplicadas y recuperación del botón tras un fallo. |
| Media | El consentimiento solo se revisaba al preparar el dispositivo. | Nueva comprobación al solicitar entrada y al recibir la aceptación. No representa verificación de identidad ni firma del consentimiento. |
| Media | Una salida o corte podía dejar contador/cámara activos y no ofrecer reinicio. | Cierre de recursos, finalización automática en el anfitrión si pierde la llamada y botón independiente para nueva entrevista. |
| Media | Fallar al cerrar el writer impedía intentar recuperar el archivo. | Se aborta el writer y se intenta ofrecer el archivo parcial, identificado como interrumpido. No se garantiza que sea reproducible. |
| Media | Se reutilizaba una instantánea antigua del archivo al descargar desde el historial. | Se solicita el archivo actual al pulsar Guardar. Los errores de eliminación y descarga se muestran. |
| Media | La biblioteca se descargaba de un CDN en cada apertura. | PeerJS 1.5.5 y su licencia quedan incluidos en `vendor/`. La señalización sigue necesitando internet. |
| Media | Cambiar de invitación con la página abierta podía conservar la vista de la sesión anterior. | La entrada recarga y vuelve a validar la invitación al cambiar el fragmento del enlace. |
| Media | El MP4 sin códec explícito podía elegir VP9 y retrasar el primer bloque en Chrome. | Se prefiere MP4 AVC explícito; si no se admite, WebM antes que un MP4 de códec indeterminado. La prueba espera escritura efectiva en vez de un plazo fijo de 6,5 segundos. |
| Mantenimiento | Código principal comprimido en líneas muy extensas y pruebas dependientes de rutas fijas. | Código formateado, selección configurable de Chromium y pruebas adicionales de regresión y conexión real. |

## Pruebas y evidencia

Ejecutado en este entorno:

- `node --check app.js`, `node --check storage-worker.js` y sintaxis de PeerJS incluido: correctos.
- `node --test tests/test_regressions.cjs`: 19 pruebas aprobadas, 0 fallidas. Son pruebas de lógica con dobles de DOM, medios, señalización y almacenamiento. Cubren los casos enumerados en el archivo de pruebas; no prueban la cámara ni la red real.
- Compilación sintáctica Python de `tests/test_browser.py` y `tests/test_live.py`: correcta.
- La prueba original de navegador se intentó ejecutar: Chromium terminó al arrancar con `socket() failed: Operation not permitted`. El proceso no llegó a abrir la aplicación. No se ha eludido esa restricción.

Ejecutado posteriormente en GitHub y producción:

- Batería final completa, ejecución 45350056966, trabajo 138293966446, commit `5214df37f8d478c0df73c987ad2daa6aabad9fd0`: correcta. Las 19 pruebas Node y las tres pruebas Python pasaron. Se verificaron contraseña incorrecta/correcta, acceso de invitado, rechazo de invitación incompleta, escritura real OPFS, exportación, decodificación y sesión PeerJS/WebRTC real. Resultado final: vídeo VP8 1280×720 y audio Opus.
- Despliegue final, ejecución 45350055578: correcto.

- GitHub Actions, trabajo `real-signaling`, ejecución 45345841007, commit `3f20e261b6c09934d8dd7cdc89b2e66f6525a43f`: correcto. Apertura del anfitrión con contraseña de prueba, invitado por enlace sin contraseña, señalización PeerJS real, WebRTC, consentimiento/admisión, grabación y salida, cierre de pistas, persistencia OPFS tras recargar y descarga.
- ffprobe identificó vídeo VP9 a 1280×720 y audio Opus; ffmpeg decodificó el archivo descargado sin error.
- GitHub Pages, ejecución 45348194904: despliegue correcto. La URL HTTPS muestra la entrada con contraseña. Se compararon siete recursos publicados (HTML, acceso, estilos, worker, PeerJS y los dos paquetes cifrados) con los archivos locales: coincidencia byte a byte.
- La comprobación criptográfica local del paquete publicado verificó la contraseña elegida, el rechazo de una contraseña incorrecta y de un paquete manipulado y la separación de claves de anfitrión/invitado. No se imprimieron ni publicaron claves ni contraseña.
- La primera preparación de CI falló porque `ubuntu-latest` había pasado a Ubuntu 26.04, no compatible con la versión fijada de Playwright. Se fijó Ubuntu 24.04. Un trabajo adicional se canceló por agotar el plazo al instalar dependencias; se sustituyó la instalación redundante de paquetes del sistema por Chrome preinstalado y PyAV para las verificaciones. La batería final se completó correctamente.

No verificado: entrevista en teléfonos físicos Android/iOS, participantes en redes físicas distintas, rendimiento sostenido durante horas y recuperación tras cierre abrupto. Dos contextos en un mismo ejecutor no certifican esos puntos.

## Acceso añadido por petición del propietario

La página publicada ofrece una entrada de anfitrión con contraseña y un acceso de invitado mediante enlace. Los paquetes se cifran con AES-GCM. La clave del anfitrión se deriva de la contraseña con PBKDF2 SHA-256, salt aleatorio y 310.000 iteraciones. La clave aleatoria de invitado solo se incluye en el paquete del anfitrión y en los enlaces emitidos. La contraseña no figura en los archivos publicados.

No se añade autenticación de servidor ni protección contra copia de los fuentes públicos. Un atacante que descargue el paquete puede intentar adivinar contraseñas sin pasar por la interfaz; la protección depende de la contraseña elegida. Los enlaces se pueden compartir. Esta solución corresponde al acceso simbólico solicitado, sin cuentas, base de datos ni servicios de pago.

## Límites de viabilidad

1. **Red.** Sin TURN configurado hay combinaciones de NAT y cortafuegos que no permiten conexión. Se conserva STUN público y señalización gratuita PeerJS. No se ha añadido un relay de terceros sin garantías ni servicios con facturación.
2. **Dependencias públicas.** PeerJS facilita la señalización; no se contrata disponibilidad. Si el servicio cae, no se podrán iniciar nuevas salas mientras dure la caída. El proyecto no utiliza Zoom ni graba una llamada de otra aplicación.
3. **Teléfono.** La página debe permanecer visible y la pantalla activa. Se solicita Wake Lock cuando está disponible y se informa al pasar a segundo plano. Eso no impide que el sistema operativo suspenda la página.
4. **Almacenamiento.** El vídeo se escribe en disco privado del navegador, no se acumula intencionalmente toda la entrevista en RAM. El espacio disponible y las políticas del navegador siguen aplicando. Borrar los datos del sitio elimina las grabaciones que no se hayan exportado. No hay cuota comercial de minutos de vídeo contratada por esta aplicación.
5. **Archivo.** MP4 cuando se admite; WebM como alternativa. Escribir y vaciar bloques reduce exposición a pérdida de datos, pero no hace un MP4/WebM inmune a un cierre abrupto. No hay reparación garantizada ni promesa de índice/duración correctos en todos los reproductores.
6. **Privacidad.** Las invitaciones son credenciales compartidas de alta entropía, no identificación de las personas. La admisión es manual y el transporte usa WebRTC. El servicio de señalización y STUN pueden conocer metadatos de conexión; «grabación local» no significa ausencia total de comunicación con terceros.
7. **Alojamiento.** GitHub Pages gratuito es adecuado al código estático de esta herramienta personal. Sus límites de alojamiento se aplican a la página y sus archivos; las entrevistas no se suben allí. No se plantea como SaaS comercial.

## Publicación

Repositorio: https://github.com/jmconteni2/estudio-entrevistas . Aplicación: https://jmconteni2.github.io/estudio-entrevistas/ . Pages sirve únicamente `/docs` de `main`; HTTPS está impuesto por GitHub. La raíz del repositorio es código de desarrollo y no debe seleccionarse como carpeta de publicación.

El usuario autorizó expresamente posponer el recordatorio 2FA de GitHub. Se completó ese paso y la publicación sin cambiar la configuración 2FA, contratar servicios ni solicitar secretos de despliegue.

## Referencias técnicas consultadas

- PeerJS, señalización y límites NAT: https://peerjs.com/client/faq
- Escritura síncrona OPFS en dedicated workers: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle
- Condiciones y límites de GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Las conclusiones sobre la implementación proceden de los archivos revisados y de las pruebas registradas arriba. Las referencias fundamentan las capacidades y límites generales; no acreditan la ejecución del proyecto.
