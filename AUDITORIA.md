# Auditoría de Estudio de entrevistas

Fecha: 24 de noviembre de 2026. Base revisada: `Estudio_Entrevistas_v0.01.zip`. Resultado de la revisión y correcciones: v0.02.

## Dictamen

La arquitectura sirve para una entrevista de dos personas con grabación en el dispositivo del entrevistador. GitHub Pages puede servir los archivos estáticos; el vídeo no necesita pasar por su alojamiento. OPFS permite escribir en almacenamiento privado del navegador mediante un worker local. No se han introducido bases de datos, Cloudflare, servicios facturados ni claves comerciales.

La v0.01 no estaba validada para uso real y tenía defectos que podían interrumpir la conexión, bloquear el guardado o dejar una sesión sin salida visible. Se han corregido los defectos descritos abajo. La v0.02 sigue pendiente de validación audiovisual en un navegador operativo y de la publicación; las pruebas de lógica aprobadas no equivalen a una prueba completa de entrevista.

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
| Mantenimiento | Código principal comprimido en líneas muy extensas y pruebas dependientes de rutas fijas. | Código formateado, selección configurable de Chromium y pruebas adicionales de regresión y conexión real. |

## Pruebas y evidencia

Ejecutado en este entorno:

- `node --check app.js`, `node --check storage-worker.js` y sintaxis de PeerJS incluido: correctos.
- `node --test tests/test_regressions.cjs`: 18 pruebas aprobadas, 0 fallidas. Son pruebas de lógica con dobles de DOM, medios, señalización y almacenamiento. Cubren los casos enumerados en el archivo de pruebas; no prueban la cámara ni la red real.
- Compilación sintáctica Python de `tests/test_browser.py` y `tests/test_live.py`: correcta.
- La prueba original de navegador se intentó ejecutar: Chromium terminó al arrancar con `socket() failed: Operation not permitted`. El proceso no llegó a abrir la aplicación. No se ha eludido esa restricción.

Preparado, pendiente de ejecución:

- Prueba de navegador con medios sintéticos, OPFS real, archivo descargado y análisis de pistas con ffprobe.
- Dos contextos independientes con PeerJS real y WebRTC, admisión, grabación, salida del invitado, cierre, descarga, decodificación con ffmpeg y persistencia tras recargar.
- Ejecución automática de ambas pruebas en GitHub Actions al subir a `main`. Un fallo de la prueba de señalización puede depender del servicio público o de la red del ejecutor y debe diagnosticarse; no debe ignorarse.

No verificado: URL publicada, entrevista entre redes físicas distintas, teléfonos reales Android/iOS, rendimiento sostenido durante horas, recuperación tras cierre abrupto y compatibilidad de exportación/reproducción en todos los reproductores. Los medios sintéticos y dos contextos en un mismo equipo no certifican esos puntos.

## Límites de viabilidad

1. **Red.** Sin TURN configurado hay combinaciones de NAT y cortafuegos que no permiten conexión. Se conserva STUN público y señalización gratuita PeerJS. No se ha añadido un relay de terceros sin garantías ni servicios con facturación.
2. **Dependencias públicas.** PeerJS facilita la señalización; no se contrata disponibilidad. Si el servicio cae, no se podrán iniciar nuevas salas mientras dure la caída. El proyecto no utiliza Zoom ni graba una llamada de otra aplicación.
3. **Teléfono.** La página debe permanecer visible y la pantalla activa. Se solicita Wake Lock cuando está disponible y se informa al pasar a segundo plano. Eso no impide que el sistema operativo suspenda la página.
4. **Almacenamiento.** El vídeo se escribe en disco privado del navegador, no se acumula intencionalmente toda la entrevista en RAM. El espacio disponible y las políticas del navegador siguen aplicando. Borrar los datos del sitio elimina las grabaciones que no se hayan exportado. No hay cuota comercial de minutos de vídeo contratada por esta aplicación.
5. **Archivo.** MP4 cuando se admite; WebM como alternativa. Escribir y vaciar bloques reduce exposición a pérdida de datos, pero no hace un MP4/WebM inmune a un cierre abrupto. No hay reparación garantizada ni promesa de índice/duración correctos en todos los reproductores.
6. **Privacidad.** Las invitaciones son credenciales compartidas de alta entropía, no identificación de las personas. La admisión es manual y el transporte usa WebRTC. El servicio de señalización y STUN pueden conocer metadatos de conexión; «grabación local» no significa ausencia total de comunicación con terceros.
7. **Alojamiento.** GitHub Pages gratuito es adecuado al código estático de esta herramienta personal. Sus límites de alojamiento se aplican a la página y sus archivos; las entrevistas no se suben allí. No se plantea como SaaS comercial.

## Publicación pendiente

Repositorio público independiente creado: https://github.com/jmconteni2/estudio-entrevistas . El usuario autorizó posponer el recordatorio de comprobación 2FA y se ha completado ese paso. La subida, ejecución de Actions y publicación se encuentran en curso; no se ha acreditado todavía una URL publicada.
Siguientes pasos: subir esta versión, comprobar Actions, activar Pages `main`/raíz y ejecutar `APP_URL=<URL real mostrada por Pages> python tests/test_live.py` en un ejecutor con navegador operativo. Entregar solo una URL efectivamente publicada y comprobada.

## Referencias técnicas consultadas

- PeerJS, señalización y límites NAT: https://peerjs.com/client/faq
- Escritura síncrona OPFS en dedicated workers: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle
- Condiciones y límites de GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Las conclusiones sobre la implementación proceden de los archivos revisados y de las pruebas registradas arriba. Las referencias fundamentan las capacidades y límites generales; no acreditan la ejecución del proyecto.
