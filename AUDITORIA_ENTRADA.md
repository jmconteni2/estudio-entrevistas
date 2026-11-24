# Auditoría de entrada de texto — revisión 0.8.0

## Resultado y alcance

La causa del bloqueo en el dispositivo afectado no está confirmada. Se restaura el formulario HTML de contraseña con botón de mostrar/ocultar; se elimina window.prompt. Esta restauración recupera la interfaz solicitada, pero por sí sola no demuestra que haya desaparecido el fallo de teclado. No se añade un editor alternativo para nombre ni título.

## Hallazgos del código

- La versión publicada f91ee4f utiliza window.prompt exclusivamente para la contraseña. Nombre y título siguen siendo inputs de la aplicación. Cambiar la contraseña no podía corregir su edición.
- El cifrado PBKDF2/AES-GCM se ejecuta al enviar el formulario. No participa en las pulsaciones ni en los eventos de composición del campo. No hay motivo encontrado para cambiar la contraseña ni el cifrado.
- En la revisión recuperada, el password es un input HTML estático, sin sustitución por textarea, máscara CSS ni interceptores de teclado. El ojo cambia su atributo type.
- El nombre y título no tienen manejadores de beforeinput, input, compositionstart/end, keydown, blur o focus que cancelen su escritura. El manejador global de click no cancela eventos y excluye inputs. El nombre solo se restaura desde almacenamiento durante la inicialización, no durante cada pulsación.
- El estudio se abre en un iframe de mismo origen con documento Blob después de autenticar. El formulario de contraseña se presenta antes de crear ese iframe. Por tanto, el iframe no explica por sí solo un fallo previo en la contraseña. No se elimina ni se modifica la arquitectura sin reproducir ese vínculo.
- Los estilos de input no usan pointer-events:none, user-select:none ni una capa superpuesta compartida con el campo de contraseña. Las capas de cámara pertenecen a la sesión de vídeo, inicialmente oculta.

## Qué acreditaban las pruebas anteriores

Se inspeccionaron el script anterior y el registro real del trabajo 138472277365, ejecución 45401875448. La versión con formulario y ojo ya había aceptado pulsaciones de Gboard en Brave Android 1.95.104 sobre un emulador Android 11: escribir, borrar, mostrar/ocultar, cambiar de aplicación y entrar. Esto verifica ese entorno; no reproduce el teléfono afectado.

La comparación antigua del commit 5d15b17 comprobaba al final que al menos uno de los escenarios escribiera abc (any), no que lo hicieran todos. Esa condición es insuficiente para certificar la comparación completa. La prueba Android de acceso tampoco probaba escribir el nombre del anfitrión ni del invitado. Las pruebas de escritorio que usan fill o insert_text no certifican por sí solas la conexión del teclado físico/software de Android.

Se amplían ahora las pruebas para comprobar explícitamente nombre del anfitrión, título y nombre del invitado con pulsaciones reales del teclado Android, incluido borrado y reescritura. La prueba de acceso en navegadores también recorre esos campos y falla si aparece un diálogo nativo inesperado.

## Hipótesis pendientes

Queda por distinguir un fallo de conexión del teclado de Android, una interacción del autocompletado o un problema específico del perfil/estado de Brave. No se ha identificado un evento cancelado por la aplicación que demuestre la causa.

Existen incidencias públicas de Brave con entrada de texto/autofill en Android (https://github.com/brave/brave-browser/issues/41185) y cierre del teclado al corregir palabras (https://github.com/brave/brave-browser/issues/59553). Sus síntomas no coinciden completamente con el bloqueo comunicado; no se presentan como diagnóstico del caso.

## Validación de esta revisión

Las 29 pruebas de lógica pasan localmente, y la sintaxis JavaScript y Python es correcta. No se modifican los paquetes cifrados de producción ni las invitaciones. El entorno local no permite iniciar Chromium (socket: Operation not permitted); la verificación de navegadores y Android debe realizarse en CI. No se declara resuelto el fallo del dispositivo sin evidencia adicional.

## Resultados remotos de la revisión

La ejecución 45413371759 sobre el commit 01cd98196b82266efa79dd8be2a32c41d4efc18d ha finalizado correctamente: pruebas de lógica, acceso y campos en Chrome/Brave de escritorio con vistas móviles, Firefox, WebKit y entrevista/grabación completa. El registro del trabajo 138512878260 confirma todos esos pasos. La ejecución Android 45413371629 también terminó correctamente. El registro del trabajo 138512877244 confirma Brave 1.95.104 / Android 11 emulado con Gboard: contraseña con ojo, cambio de aplicación y retorno, nombre y título del anfitrión y nombre del invitado admiten toques reales del teclado, Backspace y reescritura. No se emplean pegado, diálogos nativos ni inyección de texto por CDP.

El resultado de escritorio no debe describirse como una reproducción del teclado del teléfono. La información del caso confirma Brave 1.95.104 y que pegar funciona, mientras escribir y borrar no. Falta identificar el teclado utilizado y comprobar la misma combinación física antes de atribuir una causa definitiva.
