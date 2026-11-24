# Continuidad — Estudio de entrevistas v0.02

24 de noviembre de 2026. El usuario pide auditar, corregir, crear un repositorio público independiente `estudio-entrevistas` y publicar mediante GitHub Pages. Quiere que se resuelvan las comprobaciones sin pedirle pruebas intermedias. No mezclar con BookTrigger ni J.M. Pocket. No usar Cloudflare, servicios facturados, bases de datos ni claves comerciales.

Se recuperó `Estudio_Entrevistas_v0.01.zip` de los archivos de la conversación anterior. Se leyeron README y CONTINUIDAD y se auditó el código. Leer `AUDITORIA.md` para los hallazgos, correcciones, pruebas y límites. La nueva versión v0.02 contiene el código corregido, PeerJS local con licencia, 18 pruebas de regresión, la prueba original actualizada, prueba real de dos contextos y comprobaciones automáticas de GitHub Actions.

Ejecutado: las 18 pruebas Node pasan; sintaxis JS de aplicación, worker y biblioteca correcta; sintaxis Python de ambos tests correcta. Chromium no arranca en este ejecutor: `socket() failed: Operation not permitted`. No afirmar que se haya probado una grabación real, reproducción, conectividad pública ni móviles. Las dos pruebas audiovisuales quedan para un ejecutor con Chromium operativo; `test_live.py` admite APP_URL para comprobar la publicación.

GitHub: el usuario autorizó expresamente posponer el recordatorio de comprobación 2FA. Se pulsó «skip 2FA verification» y se creó el repositorio público independiente https://github.com/jmconteni2/estudio-entrevistas . Subida, Actions y Pages pendientes. No se ha cambiado ninguna configuración 2FA ni utilizado otro proyecto.
Continuar: subir todo el contenido de esta carpeta al repositorio ya creado, revisar resultados Actions, activar Pages desde main/raíz, obtener su URL efectiva y verificar HTTPS y la prueba real contra esa URL. Corregir lo que fallen las pruebas. No pedir al usuario instalar herramientas, configurar secretos o hacer comprobaciones intermedias.

Mantener explícitos los límites: conexión directa sin TURN; servicio público de señalización sin disponibilidad contratada; suspensión en móviles; almacenamiento finito del dispositivo; archivo tras cierre abrupto sin reparación garantizada; no se ha acreditado rendimiento durante horas ni compatibilidad universal. No llamar estable a la versión hasta completar las comprobaciones pendientes.
