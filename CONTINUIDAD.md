# Continuidad — Estudio de entrevistas v0.04

Proyecto independiente del usuario, publicado en https://jmconteni2.github.io/estudio-entrevistas/ . Repositorio público: https://github.com/jmconteni2/estudio-entrevistas . No mezclar con BookTrigger ni J.M. Pocket.

## Condiciones y uso

Sin Cloudflare, servicios facturados, bases de datos ni claves comerciales. GitHub Pages sirve archivos estáticos desde `main` y `/docs`, con HTTPS. No seleccionar la raíz: allí están los fuentes de desarrollo sin la entrada protegida.

El propietario eligió una contraseña sencilla para identificarse como anfitrión; no escribirla en el repositorio, las pruebas o la documentación pública. La contraseña está en la conversación privada. `docs/sealed-host.json` contiene la aplicación cifrada con una clave derivada de esa contraseña. Al desbloquearla se abre el panel del anfitrión. La invitación añade room, key y access al fragmento del enlace y abre el paquete separado de invitado, sin pedirle contraseña. Desde v0.04 el enlace válido autoriza la entrada automática; no pedir admisión manual al anfitrión.

La protección es local, sin autenticación de servidor. Los fuentes son públicos y no se pretende impedir su copia. El enlace de invitación se puede reenviar; no acredita identidad.

## Flujo v0.04

La petición del usuario es preparar enlaces antes de la entrevista, sin activar cámara ni conectar el anfitrión, y que todas las aceptaciones del invitado sean seguidas. Crear guarda room/token y metadatos localmente. Al volver al mismo navegador/dispositivo se restaura el mismo enlace. La cámara solo se pide al pulsar Entrar al estudio. El invitado pulsa Aceptar y entrar; si el anfitrión no está conectado se muestra «En espera de que el anfitrión se conecte.» y se reintenta automáticamente. Un enlace válido se admite sin otro botón del anfitrión. Se mantiene la limitación a un solo invitado y la validación de token/consentimiento.

Diseño claro marfil y violeta; cámara y botones solo durante la sesión; detalles opcionales y grabaciones plegadas. En móvil, cámara propia en miniatura. Retirados información técnica, diagnóstico y pie promocional.

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

Batería v0.04 completa aprobada: ejecución 45356316970, trabajo 138314909854, commit e14552669d72f24f0b397aeca21a9f3bc5b15bf9. Las 22 pruebas Node y las tres pruebas de navegador pasaron. Se verificaron invitación sin cámara ni señalización, conservación del enlace tras cerrar y reabrir al anfitrión, invitado temprano con espera y entrada automática sin nuevas pulsaciones, reproducción automática de ambas cámaras, AudioContext activo con salida remota conectada, grabación, OPFS, descarga y decodificación VP8 a 1280×720 y audio Opus.

Despliegue correcto: ejecución 45356316711. Se compararon siete recursos HTTPS de producción con los archivos locales y coinciden. Se revisaron capturas del diseño de escritorio y móvil; el móvil a 390 px no desborda. El empaquetado conservó la misma clave de invitado antes y después de actualizar.

Las capturas son de pruebas con medios sintéticos y se guardaron temporalmente en artefactos de Actions para revisión interna. No representan personas reales. No hay pruebas de dispositivos físicos ni de todas las redes. Los resultados anteriores de v0.03 permanecen en el archivo histórico separado.

## Límites

La aplicación hace su propia llamada: no graba Zoom ni otras aplicaciones. Usa PeerJS público gratuito y STUN, sin TURN configurado; algunas redes pueden impedir conectar. Mantener página visible y pantalla activa: los sistemas móviles pueden suspenderla. No están certificados móviles físicos, todas las redes, sesiones de horas ni recuperación de archivos después de un cierre abrupto. Las grabaciones son locales; exportarlas antes de borrar los datos del navegador.

El usuario quiere la URL final y una prueba normal de uso, sin encargarse de configuraciones ni comprobaciones intermedias. Seguir corrigiendo autónomamente dentro de ese alcance.
