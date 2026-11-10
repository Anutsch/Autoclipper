/* German source strings are stable keys. The final column optionally overrides US English. */
(() => {
 const rows = `
Navigation|Navigation|Navegación
Studio|Studio|Estudio
Aktivität|Activity|Actividad
Aktivitäten|Activity|Actividad
Aktivitäten öffnen|Open activity|Abrir actividad
 · Aktivitäten öffnen| · Open activity| · Abrir actividad
Speicher|Storage|Almacenamiento
Einrichtung|Setup|Configuración
Schnittziel|Editing destination|Editor de destino
Sprache|Language|Idioma
Noch nicht verbunden|Not connected yet|Aún sin conexión
Verbinden …|Connecting …|Conectando …
Verbinde …|Connecting …|Conectando …
Verbunden|Connected|Conectado
Nicht verbunden|Not connected|Sin conexión
Chrome-Erweiterungen öffnen|Open Chrome extensions|Abrir extensiones de Chrome
Premiere-Panel installieren|Install Premiere panel|Instalar panel de Premiere
Premiere starten|Launch Premiere|Abrir Premiere
Clips & Projekte öffnen ↗|Open clips & projects ↗|Abrir clips y proyectos ↗
Support & donations ↗|Support & donations ↗|Ayuda y donaciones ↗
Alle Chats neu laden · Player läuft weiter|Reconnect all chats · Playback continues|Reconectar todos los chats · La reproducción continúa
Alle offenen Chats neu laden · Player läuft weiter|Reconnect all open chats · Playback continues|Reconectar todos los chats abiertos · La reproducción continúa
Chats neu verbinden|Reconnect chats|Reconectar chats
Chats verbinden …|Connecting chats …|Conectando chats …
 Chats verbunden| chats connected| chats conectados
 Chats nicht verbunden. Stream-Tab öffnen und erneut versuchen.| chats could not connect. Open the stream tab and try again.| chats sin conexión. Abre la pestaña del directo y vuelve a intentarlo.
0 geöffnet|0 open|0 abiertos
 geöffnet| open| abiertos
Eingehende Twitch-Tabs|Detected Twitch tabs|Pestañas de Twitch detectadas
Verbinde Chrome, um deine Twitch-Tabs zu sehen.|Connect Chrome to see your Twitch tabs.|Conecta Chrome para ver tus pestañas de Twitch.
Die Auswahl steuerst du über das Autoclipper-Symbol in Chrome.|Use the Autoclipper icon in Chrome to select streams.|Usa el icono de Autoclipper en Chrome para seleccionar directos.
Streams auswählen|Select streams|Seleccionar directos
Streams|Streams|Directos
Twitch-Streams|Twitch streams|Directos de Twitch
Clip & Import|Clip & Import|Capturar e importar
Clip & Import · |Clip & Import · |Capturar e importar · 
Verarbeitung & letzte Clips|Processing & recent clips|Procesamiento y clips recientes
Dein kreativer Flow|Your editing workflow|Tu flujo de edición
Keine Aktivitäten.|No activity yet.|Aún no hay actividad.
Fehlgeschlagene Aktionen|Failed actions|Acciones fallidas
Lade Speicherbelegung …|Loading storage usage …|Cargando uso del almacenamiento …
Dateien|Files|Archivos
Alle|All|Todos
Keine Auswahl|Nothing selected|Nada seleccionado
Keine|None|Ninguno
Verlauf leeren|Clear history|Borrar historial
Abgeschlossene Aktionen|Completed actions|Acciones completadas
 abgeschlossene Aktionen| completed actions| acciones completadas
Log leeren|Clear log|Borrar registro
MP4 erst nach dem Export entfernen: Premiere verwendet die Originaldatei. Nach dem Verschieben ist sie dort offline. Im Papierkorb kannst du sie bei Bedarf zurückholen.|Remove the MP4 after exporting. Premiere uses the original file and it will go offline when moved. You can restore it from the Bin.|Elimina el MP4 después de exportar. Premiere usa el archivo original y dejará de encontrarlo al moverlo. Puedes restaurarlo desde la papelera.|Remove the MP4 after exporting. Premiere uses the original file and it will go offline when moved. You can restore it from the Trash.
Bereinigen|Clean up|Limpiar
Dateien landen im Papierkorb. Laufende Importe bleiben geschützt.|Files go to the Bin. Active imports are protected.|Los archivos van a la papelera. Los archivos que se están importando están protegidos.|Files go to the Trash. Active imports are protected.
Chat automatisch neu verbinden|Automatically reconnect chats|Reconectar chats automáticamente
Lernt …|Learning …|Aprendiendo …
Chat nicht verbunden|Chat disconnected|Chat sin conexión
Normalen Chatverlauf kennenlernen · ca. 45 Sekunden|Learning normal chat activity · about 45 seconds|Aprendiendo la actividad habitual del chat · unos 45 segundos
Stream und Chat in Chrome öffnen.|Open the stream and chat in Chrome.|Abre el directo y el chat en Chrome.
Moment-Score der letzten vier Minuten, von 0 bis 100|Moment score over the last four minutes, from 0 to 100|Puntuación de los últimos cuatro minutos, de 0 a 100
−4 Min.|−4 min|−4 min
 / Min.| / min| / min
 Personen · 15 s| people · 15 s| personas · 15 s
Keine auffällige Reaktionswelle|No unusual spike in reactions|No hay un aumento inusual de reacciones
Clip-Vorschau|Clip preview|Vista previa del clip
Fenster |Window |Ventana 
 · Tab | · Tab | · Pestaña 
Twitch-Tab · Vorschau beim Clippen|Twitch tab · preview opens when clipping|Pestaña de Twitch · vista previa al capturar
 · läuft| · playing| · reproduciendo
Live-Stream · Vorschau wird beim Clippen geöffnet|Live stream · preview opens when clipping|Directo · la vista previa se abre al capturar
Profilbild nicht verfügbar|Profile image unavailable|Imagen de perfil no disponible
Profilbild von |Profile image for |Imagen de perfil de 
Vorschau lädt …|Loading preview …|Cargando vista previa …
Vorschau nicht verfügbar|Preview unavailable|Vista previa no disponible
Stream-Vorschau von |Stream preview for |Vista previa del directo de 
Stream in Chrome öffnen|Open stream in Chrome|Abrir directo en Chrome
 · In Chrome öffnen| · Open in Chrome| · Abrir en Chrome
In Chrome öffnen|Open in Chrome|Abrir en Chrome
 in Chrome öffnen| in Chrome| en Chrome
Abgleich|Sync|Sincronización
Wartet|Waiting|En espera
Wartet …|Waiting …|En espera …
Quelle|Source|Origen
Download|Download|Descarga
Import|Import|Importación
Fertig|Done|Listo
Fehler|Error|Error
 Fehler| errors| errores
Aktiv|Active|Activo
 ausgewählt / | selected / | seleccionados / 
 ausgewählt| selected| seleccionados
 auswählen|: select|: seleccionar
 ausgewählt · | selected · | seleccionados · 
Livestream · |Live stream · |Directo · 
Twitch-Stream in Chrome öffnen.|Open a Twitch stream in Chrome.|Abre un directo de Twitch en Chrome.
Audio synchronisiert|Audio synchronised|Audio sincronizado|Audio synchronized
Sequenznamen aktualisiert|Sequence names updated|Nombres de secuencia actualizados
Quelldatei in den Papierkorb verschoben|Source file moved to the Bin|Archivo de origen enviado a la papelera|Source file moved to the Trash
Projekt vorbereitet|Project ready|Proyecto listo
In Premiere importiert|Imported into Premiere|Importado a Premiere
MP4-Quelle wurde beim Test noch nicht erkannt.|The MP4 source was not detected.|No se detectó el origen del MP4.
Sequenznamen|Sequence names|Nombres de secuencia
Datei anzeigen|Show file|Mostrar archivo
Import erneut versuchen|Retry import|Reintentar importación
MP4 erneut importieren|Import MP4 again|Volver a importar el MP4
Abbruch angefordert|Cancellation requested|Cancelación solicitada
Abbrechen|Cancel|Cancelar
Chrome verbunden|Chrome connected|Chrome conectado
Chrome-Erweiterung fehlt|Chrome extension missing|Falta la extensión de Chrome
Twitch-Stream erkannt|Twitch stream detected|Directo de Twitch detectado
Livestream in Chrome öffnen|Open a live stream in Chrome|Abrir un directo en Chrome
Premiere bereit|Premiere ready|Premiere listo
Premiere-Panel öffnen|Open Premiere panel|Abrir panel de Premiere
Premiere-Panel fehlt|Premiere panel missing|Falta el panel de Premiere
CapCut · Drag-and-drop|CapCut · drag and drop|CapCut · arrastrar y soltar
Resolve Studio (Beta) · Skripting prüfen|Resolve Studio (Beta) · check scripting|Resolve Studio (beta) · comprobar scripts
Resolve Studio öffnen|Open Resolve Studio|Abrir Resolve Studio
In Chrome den Entwicklermodus aktivieren und den Ordner „Chrome-Erweiterung“ entpackt laden.|Enable Developer mode in Chrome and load the Chrome-Erweiterung folder as an unpacked extension.|Activa el modo desarrollador en Chrome y carga la carpeta Chrome-Erweiterung como extensión descomprimida.
In Premiere: Fenster → Erweiterungen → Autoclipper. Bei Bedarf Premiere neu starten.|In Premiere, open Window → Extensions → Autoclipper. Restart Premiere if needed.|En Premiere, abre Ventana → Extensiones → Autoclipper. Reinicia Premiere si es necesario.
Kein Projekt geöffnet|No project open|No hay ningún proyecto abierto
Panel nicht verbunden|Panel disconnected|Panel sin conexión
CapCut · Dateien|CapCut · files|CapCut · archivos
 Importe abgeschlossen| imports completed| importaciones completadas
Die Verbindung zur App wurde unterbrochen. Bitte Autoclipper erneut öffnen.|Connection lost. Reopen Autoclipper.|Se perdió la conexión. Vuelve a abrir Autoclipper.
Wird bereinigt …|Cleaning up …|Limpiando …
 in Papierkorb| to Bin| a la papelera| to Trash
 + Logs leeren| + clear logs| + borrar registros
Leeren|Clear|Borrar
Import läuft|Import in progress|Importación en curso
Keine Dateien.|No files.|No hay archivos.
 in den Papierkorb verschoben (| moved to the Bin (| enviados a la papelera (| moved to the Trash (
 Verlaufseinträge entfernt.| history entries removed.| entradas del historial eliminadas.
Technisches Log geleert.|Application log cleared.|Registro de la aplicación borrado.
Clippen …|Clipping …|Capturando …
Projekt|Project|Proyecto
Sequenz|Sequence|Secuencia
Noch keine Sequenz|No sequence yet|Aún no hay secuencia
Neues Projekt|New project|Nuevo proyecto
Sequenz öffnen ↗|Open sequence ↗|Abrir secuencia ↗
Keine Clips.|No clips.|No hay clips.
Erneut importieren|Retry import|Reintentar importación
Verbindung fehlgeschlagen|Connection failed|Error de conexión
Premiere-Skript konnte nicht ausgeführt werden.|Premiere could not run the script.|Premiere no pudo ejecutar el script.
✓ Importiert|✓ Imported|✓ Importado
Import nicht abgeschlossen|Import incomplete|Importación sin completar
Import …|Importing …|Importando …
Import ausstehend|Import pending|Importación pendiente
Download …|Downloading …|Descargando …
Quelle …|Finding source …|Buscando origen …
Autoclipper-App starten. |Start the Autoclipper app. |Abre la aplicación Autoclipper. 
Autoclipper-App starten.|Start the Autoclipper app.|Abre la aplicación Autoclipper.
Autoclipper · Regie|Autoclipper · Studio|Autoclipper · Estudio
Die Autoclipper-App ist noch nicht gestartet.|The Autoclipper app is not running.|La aplicación Autoclipper no está abierta.
Autoclipper starten ↗|Launch Autoclipper ↗|Abrir Autoclipper ↗
Tabs bündeln|Group tabs|Agrupar pestañas
Zurück zu Tabs|Back to tabs|Volver a las pestañas
Player automatisch starten|Start players automatically|Iniciar reproductores automáticamente
Verarbeitung|Processing|Procesamiento
Alle abbrechen|Cancel all|Cancelar todo
Verwaltung ↗|Open app ↗|Abrir aplicación ↗
Wird geprüft …|Checking …|Comprobando …
Werbung · Twitch zeigt keine Restzeit|Ad · Twitch does not show time remaining|Anuncio · Twitch no muestra el tiempo restante
Werbung · |Ad · |Anuncio · 
Pause noch |Ad break ends in |La pausa publicitaria termina en 
aktuelle Anzeige noch |Current ad ends in |El anuncio actual termina en 
Freigabe prüfen …|Checking clip availability …|Comprobando si se puede capturar …
Nicht bereit|Not ready|No disponible
 sichtbare Streams · Werbung wird von Twitch bereitgestellt.| visible streams · ads are served by Twitch.| directos visibles · Twitch muestra los anuncios.
Fehlgeschlagen|Failed|Fallido
Quelle suchen|Finding source|Buscando origen
Download ausstehend|Download pending|Descarga pendiente
Download läuft|Downloading|Descargando
Premiere importiert|Premiere is importing|Premiere está importando
Wird beendet|Stopping|Deteniendo
Verwaltung|Management|Gestión
Clip-Gestaltung|Clip design|Diseño del clip
Clip-Gestaltung: In Premiere unter Fenster → Erweiterungen → Autoclipper.|Clip design: In Premiere, open Window → Extensions → Autoclipper.|Diseño del clip: En Premiere, abre Ventana → Extensiones → Autoclipper.
Bei neuen Clips auf Gestaltung warten|Wait for design on new clips|Esperar al diseño en clips nuevos
Der Clip wartet vor dem Import auf deine Freigabe.|The clip will wait for your approval before importing.|El clip esperará tu aprobación antes de importarse.
Titel|Title|Título
Optionaler Titel|Optional title|Título opcional
Plattform|Platform|Plataforma
Position|Position|Posición
Oben|Top|Arriba
Mitte|Centre|Centro|Center
Unten|Bottom|Abajo
Schriftart|Font|Tipografía
Schriftschnitt|Font weight|Grosor de fuente
Fett|Bold|Negrita
Normal|Regular|Normal
Extra fett|Extra bold|Extra negrita
Größe|Size|Tamaño
Farbe|Colour|Color|Color
Dauer (Sek.)|Duration (sec)|Duración (s)
Titelvorschau|Title preview|Vista previa del título
Eigene Assets wählen|Choose overlay files|Elegir archivos de superposición
Asset entfernen|Remove overlay|Quitar superposición
Für aktuellen Clip übernehmen|Apply to current clip|Aplicar al clip actual
Ohne Gestaltung importieren|Import without design|Importar sin diseño
Als Standard speichern|Save as default|Guardar como predeterminado
Gestaltung freigegeben.|Design approved.|Diseño aprobado.
Standard gespeichert.|Default saved.|Configuración guardada.
Unterstützt: MOV, MP4, PNG und JPG.|Supported formats: MOV, MP4, PNG and JPG.|Formatos compatibles: MOV, MP4, PNG y JPG.
`;
 const messages = `
Werbung läuft|Ad playing|Anuncio en reproducción
Clips sind für diesen Kanal deaktiviert.|Clips are disabled for this channel.|Los clips están desactivados en este canal.
Twitch erlaubt das Clippen auf diesem Kanal derzeit nicht.|Twitch currently does not allow clipping on this channel.|Twitch no permite capturar clips de este canal por ahora.
Clippen ist durch die Kanal-Einstellungen eingeschränkt.|Channel settings restrict clipping.|La configuración del canal restringe los clips.
Zum Clippen bei Twitch anmelden.|Sign in to Twitch to clip.|Inicia sesión en Twitch para capturar clips.
Der Kanal ist offline.|The channel is offline.|El canal está desconectado.
MP4-Vorschau bereit.|MP4 preview ready.|Vista previa del MP4 lista.
Clip-Vorschau lädt …|Loading clip preview …|Cargando vista previa del clip …
Benannte Clip-Vorschau offen. Zuerst abschließen oder schließen.|A named clip preview is open. Finish or close it first.|Hay una vista previa con nombre abierta. Termínala o ciérrala primero.
Unbenannte Vorschau wird beim Clippen erneuert.|The unnamed preview will refresh when clipping.|La vista previa sin nombre se actualizará al capturar.
Clip-Freigabe nicht erkennbar. Player kurz öffnen.|Clip availability is unclear. Open the player briefly.|No se pudo comprobar si se permiten clips. Abre el reproductor un momento.
Kein Stream-Player erkannt.|No stream player detected.|No se detectó ningún reproductor.
Twitch sperrt den Clip-Button derzeit.|Twitch has disabled the Clip button for now.|Twitch ha desactivado temporalmente el botón de clips.
Stream lädt oder puffert …|Stream loading or buffering …|Cargando directo o almacenando en búfer …
Clip-Button verfügbar.|Clip button available.|Botón de clips disponible.
Werbung · wartet auf Twitch-Freigabe|Ad · waiting for Twitch|Anuncio · esperando a Twitch
MP4 wird heruntergeladen …|Downloading MP4 …|Descargando MP4 …
Twitch-MP4 wird heruntergeladen …|Downloading Twitch MP4 …|Descargando MP4 de Twitch …
MP4 heruntergeladen.|MP4 downloaded.|MP4 descargado.
MP4s sind bereit.|MP4 files are ready.|Los archivos MP4 están listos.
Keine gespeicherte MP4 vorhanden.|No saved MP4 available.|No hay ningún MP4 guardado.
 MP4s bleiben gespeichert.| MP4 files remain saved.| Los archivos MP4 siguen guardados.
Keine heruntergeladene MP4 zum Importieren.|No downloaded MP4 to import.|No hay ningún MP4 descargado para importar.
Nicht alle MP4-Dateien sind noch vorhanden. Bitte in Chrome erneut clippen.|Some MP4 files are missing. Clip again in Chrome.|Faltan algunos archivos MP4. Vuelve a capturar en Chrome.
Stream-Tab wird aktiviert|Activating stream tab|Activando pestaña del directo
Clip-Vorschau wird geöffnet|Opening clip preview|Abriendo vista previa del clip
Quelle untersuchen · neue MP4-Adresse suchen|Inspecting source · finding a fresh MP4 URL|Inspeccionando origen · buscando una URL nueva del MP4
MP4-Adresse gefunden · Download in Warteschlange|MP4 URL found · download queued|URL del MP4 encontrada · descarga en cola
Wartet auf sichtbaren Stream-Tab …|Waiting for the stream tab to become visible …|Esperando a que la pestaña del directo sea visible …
Stream-Tab wird jetzt sichtbar aktiviert …|Switching to the stream tab …|Cambiando a la pestaña del directo …
Aktiver Tab: Clip-Vorschau wird geöffnet …|Active tab: opening clip preview …|Pestaña activa: abriendo vista previa …
Aktiver Tab: Quelle untersuchen · MP4-Adresse suchen …|Active tab: inspecting source · finding MP4 URL …|Pestaña activa: buscando la URL del MP4 …
MP4-Adresse gefunden. Download wird eingereiht …|MP4 URL found. Queuing download …|URL del MP4 encontrada. Poniendo descarga en cola …
MP4 gesichert. Wartet in der Warteschlange …|MP4 captured. Waiting in the queue …|MP4 capturado. En espera en la cola …
Vorschau gesichert · wartet auf Download und Import …|Preview captured · waiting for download and import …|Vista previa capturada · esperando descarga e importación …
MP4 gefunden. Download startet …|MP4 found. Starting download …|MP4 encontrado. Iniciando descarga …
MP4 gefunden …|MP4 found …|MP4 encontrado …
Wartet auf die übrigen Ansichten …|Waiting for the remaining views …|Esperando las otras perspectivas …
Wartet auf gemeinsame Übergabe …|Waiting to hand off all views …|Esperando la entrega de todas las perspectivas …
Tonspuren werden zeitlich abgeglichen …|Aligning audio tracks …|Alineando pistas de audio …
Audio synchronisiert · wartet auf Premiere …|Audio synchronised · waiting for Premiere …|Audio sincronizado · esperando a Premiere …|Audio synchronized · waiting for Premiere …
Audio synchronisiert · Ansichten auf separaten Spuren importiert.|Audio synchronised · views imported on separate tracks.|Audio sincronizado · perspectivas importadas en pistas separadas.|Audio synchronized · views imported on separate tracks.
Nur eine Ansicht verfügbar; kein Audio-Abgleich möglich.|Only one view is available, so audio cannot be aligned.|Solo hay una perspectiva disponible y no se puede alinear el audio.
Audio-Abgleich fehlgeschlagen: |Audio alignment failed: |Error al alinear el audio: 
. Ansichten müssen manuell synchronisiert werden.|. Align the views manually.|. Alinea las perspectivas manualmente.
 Ansichten geladen · | views downloaded · | perspectivas descargadas · 
 · MP4s werden übergeben …| · handing off MP4 files …| · entregando archivos MP4 …
Gespeicherte MP4s · |Saved MP4 files · |Archivos MP4 guardados · 
Premiere wird gestartet und das Projekt vorbereitet …|Launching Premiere and preparing the project …|Abriendo Premiere y preparando el proyecto …
Premiere erstellt das Projekt …|Premiere is creating the project …|Premiere está creando el proyecto …
Premiere importiert die MP4 …|Premiere is importing the MP4 …|Premiere está importando el MP4 …
Premiere konnte nicht gestartet werden.|Could not launch Premiere.|No se pudo abrir Premiere.
Premiere Pro konnte nicht gestartet werden.|Could not launch Premiere Pro.|No se pudo abrir Premiere Pro.
Premiere Pro wurde im Adobe-Installationsordner nicht gefunden.|Premiere Pro was not found in the Adobe installation folder.|No se encontró Premiere Pro en la carpeta de instalación de Adobe.
Titel wird in der aktiven Sequenz ergänzt …|Adding the title to the active sequence …|Añadiendo el título a la secuencia activa …
Titel auf oberster Videospur ergänzt.|Title added to the top video track.|Título añadido a la pista de vídeo superior.
Sequenznamen werden dem Projekt angepasst …|Updating sequence names to match the project …|Actualizando los nombres de secuencia según el proyecto …
Sequenznamen aktualisiert.|Sequence names updated.|Nombres de secuencia actualizados.
Projekt erstellt: |Project created: |Proyecto creado: 
Ansichten in Premiere eingefuegt: |Views added to Premiere: |Perspectivas añadidas a Premiere: 
 wartet auf Premiere / Autoclipper-Panel …| is waiting for Premiere / the Autoclipper panel …| espera a Premiere / al panel de Autoclipper …
Wartet auf |Waiting for |Esperando a 
Abgebrochen.|Cancelled.|Cancelado.|Canceled.
Abgebrochen: |Cancelled: |Cancelado: |Canceled: 
Abgebrochen. Fertige MP4s bleiben erhalten.|Cancelled. Completed MP4 files are kept.|Cancelado. Se conservan los MP4 completados.|Canceled. Completed MP4 files are kept.
Abbruch angefordert. Der aktuelle Importschritt wird noch beendet.|Cancellation requested. The current import step will finish.|Cancelación solicitada. El paso de importación actual terminará.
Premiere-Schritt bereits beendet; weitere Schritte dieses Auftrags gestoppt.|The Premiere step already finished. Remaining steps were stopped.|El paso de Premiere ya terminó. Se detuvieron los pasos restantes.
Premiere-Schritt beendet.|Premiere step finished.|Paso de Premiere terminado.
Importiert · |Imported · |Importado · 
Timeline in DaVinci Resolve erstellt · |Timeline created in DaVinci Resolve · |Línea de tiempo creada en DaVinci Resolve · 
MP4s im Finder markiert · in CapCut hineinziehen.|MP4 files selected in Finder · drag them into CapCut.|MP4 seleccionados en Finder · arrástralos a CapCut.
MP4s im Explorer bereit · in CapCut hineinziehen.|MP4 files ready in File Explorer · drag them into CapCut.|MP4 disponibles en el Explorador · arrástralos a CapCut.
Resolve Studio öffnen und External scripting auf Local stellen.|Open Resolve Studio and set External scripting to Local.|Abre Resolve Studio y configura External scripting en Local.
DaVinci Resolve öffnen und den Import erneut starten.|Open DaVinci Resolve and retry the import.|Abre DaVinci Resolve y reintenta la importación.
In Resolve zuerst ein Projekt öffnen.|Open a project in Resolve first.|Abre primero un proyecto en Resolve.
Resolve antwortet nicht. Bitte Timeline und Skripting-Einstellungen prüfen.|Resolve is not responding. Check the timeline and scripting settings.|Resolve no responde. Comprueba la línea de tiempo y la configuración de scripts.
Resolve konnte 1080 × 1920 bei 30 fps nicht einstellen.|Resolve could not set 1080 × 1920 at 30 fps.|Resolve no pudo configurar 1080 × 1920 a 30 fps.
Resolve konnte nicht alle Clips in die Timeline legen.|Resolve could not add every clip to the timeline.|Resolve no pudo añadir todos los clips a la línea de tiempo.
Chrome-Erweiterung ist nicht verbunden.|The Chrome extension is disconnected.|La extensión de Chrome no está conectada.
Chrome-Erweiterung ist nicht verbunden. Bitte Einrichtung abschließen.|The Chrome extension is disconnected. Finish setup first.|La extensión de Chrome no está conectada. Completa la configuración.
Keine geöffneten Stream-Tabs.|No open stream tabs.|No hay pestañas de directos abiertas.
Stream-Tab nicht mehr geöffnet.|The stream tab is no longer open.|La pestaña del directo ya no está abierta.
Twitch-Tab ist nicht mehr geöffnet.|The Twitch tab is no longer open.|La pestaña de Twitch ya no está abierta.
Ein ausgewählter Tab ist nicht mehr geöffnet.|A selected tab is no longer open.|Una pestaña seleccionada ya no está abierta.
Der ausgewählte Tab wurde gewechselt. Bitte erneut auswählen.|The selected tab changed. Select it again.|La pestaña seleccionada ha cambiado. Vuelve a seleccionarla.
Browser-Verbindung unterbrochen. Bitte neu auswählen.|Browser connection lost. Select the tabs again.|Se perdió la conexión con el navegador. Vuelve a seleccionar las pestañas.
Bitte 1 bis 8 unterschiedliche Tabs auswählen.|Select 1 to 8 different tabs.|Selecciona entre 1 y 8 pestañas diferentes.
Premiere-Panel nicht verbunden.|Premiere panel disconnected.|El panel de Premiere no está conectado.
Bitte laufenden Auftrag abwarten.|Wait for the current job to finish.|Espera a que termine la tarea actual.
Bitte laufenden Auftrag zuerst abschliessen.|Wait for the current job to finish.|Espera a que termine la tarea actual.
Auftrag nicht mehr vorhanden.|The job no longer exists.|La tarea ya no existe.
Die Support-Seite konnte nicht geöffnet werden.|Could not open the support page.|No se pudo abrir la página de ayuda.
Tab nicht erreichbar.|Could not reach the tab.|No se pudo acceder a la pestaña.
Twitch-Player ist nicht bereit.|The Twitch player is not ready.|El reproductor de Twitch no está listo.
Twitch-Player antwortet nicht rechtzeitig. Bitte Stream neu laden.|The Twitch player timed out. Reload the stream.|El reproductor de Twitch tardó demasiado. Vuelve a cargar el directo.
Clip-Freigabe wird noch geprüft. Chrome-Erweiterung öffnen oder aktualisieren.|Clip availability is still being checked. Open or reload the Chrome extension.|Aún se está comprobando si se permiten clips. Abre o vuelve a cargar la extensión de Chrome.
Clip-Freigabe konnte nicht geprüft werden.|Could not check clip availability.|No se pudo comprobar si se permiten clips.
Clippen derzeit nicht möglich.|Clipping is unavailable right now.|No se pueden capturar clips en este momento.
Klickzeitpunkt ist veraltet. Bitte erneut versuchen.|The click timestamp expired. Try again.|La marca de tiempo del clic ha caducado. Vuelve a intentarlo.
Download unvollständig. Bitte erneut clippen.|Download incomplete. Clip again.|Descarga incompleta. Vuelve a capturar el clip.
Download überschreitet 2 GB.|The download exceeds 2 GB.|La descarga supera los 2 GB.
Chat-Verbindung nicht bestätigt. Stream-Tab öffnen und erneut versuchen.|Chat connection could not be confirmed. Open the stream tab and try again.|No se pudo confirmar la conexión del chat. Abre la pestaña del directo e inténtalo de nuevo.
Chats werden bereits neu verbunden.|Chats are already reconnecting.|Ya se están reconectando los chats.
 mit gleichen Emotes| using the same emotes| con los mismos emoticonos
 mit Emote-Ketten| using emote chains| con cadenas de emoticonos
 überrascht| surprised| sorprendidos
 Clip-Rufe| requests to clip| peticiones de clips
× Chattempo|× chat rate|× ritmo del chat
Keine laufenden Aktivitäten|No active jobs|No hay tareas activas
 nicht bereit| not ready| no disponibles
App offline|App offline|Aplicación sin conexión
Bereit|Ready|Listo
CLIPS|CLIPS|CLIPS
Made for your Mac|Made for your Mac|Diseñado para tu Mac
 lachen| laughing| riéndose
 schockiert| shocked| en shock
Datei ist nicht mehr vorhanden oder nicht auswählbar: |File is missing or unavailable: |El archivo no existe o no se puede seleccionar: 
Diese Datei wartet noch auf Premiere: |This file is still waiting for Premiere: |Este archivo aún espera a Premiere: 
: Verschieben fehlgeschlagen.|: could not move file.|: no se pudo mover el archivo.
: Papierkorb nicht verfügbar.|: Bin unavailable.|: papelera no disponible.|: Trash unavailable.
Technisches Log konnte nicht geleert werden.|Could not clear the application log.|No se pudo borrar el registro de la aplicación.
Anwendung wurde beendet. Download ggf. vorhanden; erneut starten oder MP4 erneut importieren.|The app closed. The download may still exist. Restart or import the MP4 again.|La aplicación se cerró. Es posible que la descarga siga disponible. Reinicia o vuelve a importar el MP4.
Nicht alle Ansichten konnten geladen werden. Bereits geladene MP4s bleiben im Clips-Ordner. |Some views could not be downloaded. Completed MP4 files are kept in the Clips folder. |No se pudieron descargar todas las perspectivas. Los MP4 completados se conservan en la carpeta Clips. 
Projekt konnte nicht vorbereitet werden. MP4s bleiben gespeichert: |Could not prepare the project. MP4 files remain saved: |No se pudo preparar el proyecto. Los archivos MP4 siguen guardados: 
Twitch hat innerhalb von 45 Sekunden keine neue MP4 geliefert. Vorschau, Login oder deaktivierte Clips prüfen.|Twitch did not provide a fresh MP4 within 45 seconds. Check the preview, sign-in and clip settings.|Twitch no proporcionó un MP4 nuevo en 45 segundos. Comprueba la vista previa, la sesión y la configuración de clips.
Quellensuche nach 65 Sekunden beendet. Twitch lieferte keine neue MP4. Der nächste Auftrag kann weiterlaufen.|The source search ended after 65 seconds. Twitch did not provide a fresh MP4. The next job can proceed.|La búsqueda terminó tras 65 segundos. Twitch no proporcionó un MP4 nuevo. La siguiente tarea puede continuar.
Twitch-Clip-Button fehlt. Livestream laden, anmelden und Werbung abwarten.|The Twitch Clip button is missing. Load the stream, sign in and wait for ads to finish.|Falta el botón de clips de Twitch. Abre el directo, inicia sesión y espera a que terminen los anuncios.
Clip-Vorschau konnte nicht geöffnet werden. Werbung oder offene Twitch-Dialoge prüfen.|Could not open the clip preview. Check for ads or open Twitch dialogues.|No se pudo abrir la vista previa. Comprueba si hay anuncios o diálogos abiertos en Twitch.|Could not open the clip preview. Check for ads or open Twitch dialogs.
Wiedergabepunkt am Klickzeitpunkt fehlt. Tab kurz sichtbar öffnen und erneut versuchen.|The playback position at the time of the click is unavailable. Open the tab briefly and try again.|No está disponible la posición de reproducción del momento del clic. Abre la pestaña un momento y vuelve a intentarlo.
Im gewählten Tab läuft kein erkennbarer Player.|No player was detected in the selected tab.|No se detectó un reproductor en la pestaña seleccionada.
Player wurde am Klickzeitpunkt gespult oder gepuffert. Bitte erneut versuchen.|The player was seeking or buffering when clicked. Try again.|El reproductor estaba buscando una posición o almacenando en búfer al hacer clic. Vuelve a intentarlo.
Zuerst ein Projekt öffnen.|Open a project first.|Abre primero un proyecto.
Zuerst ein Projekt oeffnen.|Open a project first.|Abre primero un proyecto.
Zuerst ein Projekt öffnen oder in Autoclipper ein neues erstellen. Die MP4 bleibt im Clips-Ordner.|Open a project or create one in Autoclipper. The MP4 is kept in the Clips folder.|Abre un proyecto o crea uno en Autoclipper. El MP4 se conserva en la carpeta Clips.
Premiere hat den Import nicht bestätigt. Die MP4 bleibt erhalten.|Premiere did not confirm the import. The MP4 is kept.|Premiere no confirmó la importación. El MP4 se conserva.
Aktives Projekt wurde gewechselt.|The active project changed.|El proyecto activo ha cambiado.
Das aktive Projekt wurde seit dem Klick gewechselt. Bitte zum urspruenglichen Projekt zurueckkehren.|The active project changed after the click. Return to the original project.|El proyecto activo ha cambiado desde el clic. Vuelve al proyecto original.
MP4-Import fehlgeschlagen.|MP4 import failed.|Error al importar el MP4.
MP4-Datei fehlt: |MP4 file missing: |Falta el archivo MP4: 
Eine MP4 fehlt.|An MP4 file is missing.|Falta un archivo MP4.
Importierte MP4 fehlt.|The imported MP4 is missing.|Falta el MP4 importado.
Die neue Sequenz konnte nicht erstellt werden.|Could not create the new sequence.|No se pudo crear la nueva secuencia.
Neue Sequenz ist nicht aktiv.|The new sequence is not active.|La nueva secuencia no está activa.
Premiere hat die synchronisierte Position nicht bestätigt.|Premiere did not confirm the aligned position.|Premiere no confirmó la posición sincronizada.
Premiere hat das Einfügen in die Timeline nicht bestätigt.|Premiere did not confirm insertion into the timeline.|Premiere no confirmó la inserción en la línea de tiempo.
Premiere konnte die Titelvorlage nicht einfügen.|Premiere could not insert the title template.|Premiere no pudo insertar la plantilla de título.
Titelvorlage fehlt: |Title template missing: |Falta la plantilla de título: 
Keine aktive Sequenz für den Titel.|No active sequence for the title.|No hay una secuencia activa para el título.
Audio-Abgleich fehlgeschlagen|Audio alignment failed|Error al alinear el audio
Es konnte keine zuverlässige Audio-Übereinstimmung gefunden werden.|No reliable audio match could be found.|No se encontró una coincidencia de audio fiable.
 Ansicht(en) ohne sicheren Audio-Abgleich; auf separaten Spuren bei 0 s. Bitte manuell synchronisieren.| views could not be aligned reliably and start at 0 s on separate tracks. Align them manually.| perspectivas sin sincronización fiable. Empiezan en 0 s en pistas separadas. Alinéalas manualmente.
Wartet auf Gestaltung im Premiere-Panel.|Waiting for design in the Premiere panel.|Esperando el diseño en el panel de Premiere.
 (Zeile | (line | (línea 
`;
 const catalog = new Map((rows+messages).split('\n').filter(Boolean).map(row => {
  const [de, gb, es, us = gb] = row.split('|');
  return [de, {'en-GB':gb, 'en-US':us, es}];
 }));
 const languages = ['de','es','en-GB','en-US'];
 const storageKey = 'autoclipper-language';
 const saved = localStorage.getItem(storageKey);
 const locale = languages.includes(saved) ? saved : 'de';
 const t = value => catalog.get(value)?.[locale] ?? value;
 const messageKeys = messages.split('\n').filter(Boolean).map(row=>row.split('|')[0])
  .sort((a,b)=>b.length-a.length);
 const messagePattern = new RegExp(messageKeys.map(key=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 const message = value => {
  if (locale === 'de' || typeof value !== 'string') return value;
  if (catalog.has(value)) return t(value);
  return value.replace(messagePattern,t);
 };
 document.documentElement.lang = locale;
 const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
 for (let node = walker.nextNode(); node; node = walker.nextNode()) {
  if (node.parentElement.closest('script,style')) continue;
  const key = node.data.trim();
  if (key) node.data = node.data.replace(key,t(key));
 }
 for (const element of document.querySelectorAll('[title],[aria-label],[placeholder]')) {
  for (const name of ['title','aria-label','placeholder']) {
   if (element.hasAttribute(name)) element.setAttribute(name,t(element.getAttribute(name)));
  }
 }
 document.title = t(document.title);
 window.acI18n = {
  locale, t, message,
  bind(api, showError) {
   const select = document.getElementById('languageChoice');
   select.value = locale;
   select.onchange = async () => {
    select.disabled = true;
    try {
     await api('language',{locale:select.value});
     this.sync({locale:select.value});
    } catch (error) {
     select.value = locale;
     showError(message(error.message));
    } finally {
     select.disabled = false;
    }
   };
  },
  sync(preferences) {
   const preferred = preferences?.locale;
   if (!languages.includes(preferred) || preferred === locale) return false;
   localStorage.setItem(storageKey, preferred);
   location.reload();
   return true;
  }
 };
})();

const acText = window.acI18n.t;
const acMessage = window.acI18n.message;
