# Continuidad — Lumen Interview v0.05

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

Batería final v0.05 aprobada: ejecución 45362881233, trabajo 138337090594, commit 3e0959c47517e53dc1ae989ce87f50ea06cb0512. Las 28 pruebas Node y las tres pruebas de navegador pasaron. Se verificaron enlace anticipado, nombre del invitado, dos orientaciones independientes y foco local que no cambia la grabación del otro, las composiciones exportadas y dos grabaciones reales con medios sintéticos. VP8/Opus a 1280×720 y 720×720 decodificados correctamente.

Despliegue correcto: ejecución 45362880978. Ocho recursos HTTPS, incluido el icono, iguales byte a byte a la revisión local. Se revisaron las imágenes de vídeo HH, VV cuadrado y mixtos y el móvil; la marca completa aparece sin recortar. La contraseña no figura en el código público y la clave de invitación se conservó al regenerar.

La prueba comprueba también que el invitado ve cierre sin Volver a entrar y que recargar el mismo enlace mantiene la sesión terminada en su navegador. Una invitación nueva permite otra entrevista. No hay base de datos ni servidor de revocaciones; la sala antigua del anfitrión se retira al acabar.

El bloqueo de pantalla se valida con un doble de Wake Lock para solicitarlo una vez y liberarlo; esto no equivale a certificar que todos los sistemas operativos impidan apagar la pantalla. Las capturas y los vídeos de pruebas utilizan medios sintéticos, no personas reales.

## Límites

La aplicación hace su propia llamada: no graba Zoom ni otras aplicaciones. Usa PeerJS público gratuito y STUN, sin TURN configurado; algunas redes pueden impedir conectar. Mantener página visible y pantalla activa: los sistemas móviles pueden suspenderla. No están certificados móviles físicos, todas las redes, sesiones de horas ni recuperación de archivos después de un cierre abrupto. Las grabaciones son locales; exportarlas antes de borrar los datos del navegador.

El usuario quiere la URL final y una prueba normal de uso, sin encargarse de configuraciones ni comprobaciones intermedias. Seguir corrigiendo autónomamente dentro de ese alcance.
