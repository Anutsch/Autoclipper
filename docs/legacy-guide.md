# Autoclipper – Anleitung

Die App liegt auf dem Schreibtisch: **Auto Clipper → Autoclipper.app**. Chrome-Erweiterung und Premiere-Panel sind auf diesem Mac installiert.

## Drei Oberflächen, klare Aufgaben

- **Chrome-Erweiterung:** Streams auswählen und Clip and Import starten.
- **Mac-App:** Eingang aus Chrome, Fortschritt, Verlauf, Speicher und Logs. Die Stream-Auswahl wird hier nur angezeigt.
- **Premiere-Panel:** aktuelles Projekt, aktive Sequenz und tatsächliches Format, ankommende Clips, **Sequenz öffnen** und **Neues Projekt**. Bei fehlgeschlagenen Importen erscheint **Import erneut versuchen**, sofern alle Quelldateien noch vorhanden sind. Dabei wird nicht erneut heruntergeladen.

Autoclipper öffnet sich in Premiere als eigenes, kompaktes Pluginfenster. Neue Projekt-Tabs können es dadurch nicht mehr verdrängen. Das Plugin arbeitet auch im Hintergrund. Bei Bedarf unter **Fenster → Erweiterungen → Autoclipper** einblenden; es muss nicht ständig sichtbar sein.

## Clip and Import

1. Twitch-Livestreams in Chrome öffnen und anmelden.
2. In Chrome die **Autoclipper-Erweiterung** öffnen und die gewünschten Tabs auswählen. Fenster, Tab-Position und Tab-ID unterscheiden auch mehrfach geöffnete Streams. Bis zu acht Ansichten sind auswählbar.
3. Im Chrome-Seitenleiste **Clip and Import** drücken. **Status & Verwaltung** öffnet die Mac-App mit Eingang, Fortschritt und Bereinigung.

Die App öffnet für jeden ausgewählten Livestream eine **frische Twitch-Clip-Vorschau**, liest deren MP4-Adresse und lädt die Datei herunter. Sie gibt keinen Titel ein und klickt weder auf **Clip speichern** noch **Veröffentlichen**. Alte MP4-Adressen, die schon vor dem Klick geladen waren, werden beim Erstellen der frischen Vorschau ausgeschlossen. Ein alter unbenannter Vorschau-Dialog kann dafür geschlossen/verworfen werden. Bei einem eingetragenen Titel stoppt die App, damit eine bearbeitete Vorschau nicht verloren geht.

Ist der ausgewählte Tab bereits eine Clip-Seite, wird deren vorhandene Vorschau verwendet. Die App importiert höchstens die letzten 90 verfügbaren Sekunden der MP4. Sie kann keine beliebigen vergangenen Live-Wiedergabepunkte garantieren: Der Rückblick wird von Twitch bereitgestellt, Streams können unterschiedlich verzögert sein. Ein lokaler Video-/Audio-Puffer wird nicht aufgenommen.

## Verfügbarkeit vor dem Clippen

Jeder Twitch-Tab zeigt seine Freigabe direkt in Chrome und in der Status-App. Werbung, ein gesperrter Clip-Button, erkennbare Kanalbeschränkungen, fehlender Player und nicht feststellbare Freigabe sperren den Start. Bei mehreren Ansichten müssen alle ausgewählten Tabs bereit sein. Direkt vor dem Start wird erneut geprüft; während einer Werbung startet die App keinen wartenden Clip automatisch.

Die Werbe-Restzeit stammt aus Twitchs sichtbarem Countdown. Ist nur die aktuelle Anzeige bekannt, wird sie so beschriftet; das ist keine Zusage für das Ende einer ganzen Werbepause. Ohne Countdown steht ausdrücklich, dass Twitch keine Restzeit zeigt. Nach Ablauf wartet die App auf Twitchs tatsächliche Freigabe. Wenn ein Hintergrund-Tab seinen Player noch nicht geladen hat, diesen Tab einmal öffnen.

Manche Kanalbeschränkungen werden von Twitch erst nach dem Öffnen der Vorschau gemeldet. Sichtbare Meldungen werden auch dort geprüft. Die Anzeige „Clip-Button verfügbar“ bestätigt den erkennbaren Zustand der Seite und ist keine Zusage von Twitch, dass die MP4 erzeugt wird.

## Geschwindigkeit

Der Klick wird direkt an die Erweiterung weitergegeben. Die Suche prüft zuerst Videoplayer und geladene MP4-Adressen; der vollständige Quelltext dient nur als gelegentlicher Rückfall. Alle gewählten Clip-Vorschauen werden sofort ausgelöst. Pro Stream entsteht ein eigener Warteschlangen-Eintrag. Die MP4-Adressen werden danach der Reihe nach gesichert; Download und Premiere-Import laufen streng pro Eintrag nacheinander. Ein fehlgeschlagener Eintrag hält die übrigen nicht auf.

Wie schnell Twitch die Vorschau bereitstellt und wie schnell die Datei übertragen wird, bleibt vom Kanal und der Verbindung abhängig.

## Automatischer Premiere-Start

**Clip and Import** startet Premiere bei Bedarf automatisch. War Premiere geschlossen, entsteht ein neues nummeriertes Projekt, z. B. **TiktokAC6.prproj**. Ist Premiere geöffnet und ein Projekt aktiv, wird dieses verwendet. Bei noch fehlender Panel-Verbindung wartet der Import; sobald das Panel verbunden ist, wird geprüft, ob bereits ein Projekt geöffnet ist. Ein vorhandenes Projekt wird dabei nicht ersetzt.

Falls Premiere offen ist, aber das Panel nicht verbunden wird: **Fenster → Erweiterungen → Autoclipper** öffnen. Offene Dialoge in Premiere schließen.

Der Button **Neues Projekt** im Premiere-Panel erstellt ausdrücklich ein neues nummeriertes Projekt. Der Zähler bleibt nach Neustarts und dem Leeren des Verlaufs erhalten. Vorhandene Projektdateien werden nicht überschrieben.

## Timeline

Alle Ansichten einer Auswahl werden in Auswahlreihenfolge **hintereinander** am Ende derselben Sequenz eingefügt, samt Audio. Format: **1080 × 1920 (9:16), exakt 30 fps**. Vorhandene Clips werden nicht überschrieben. Die Sequenz heißt wie das Projekt, z. B. **TiktokAC6**. Falls eine anders formatierte Sequenz desselben Namens vorhanden ist, wird für die neue Sequenz ein eindeutiger Namenszusatz verwendet.

Ein Querformat-Video wird zunächst mit dem Premiere-Standardausschnitt eingefügt; es wird nicht automatisch bildfüllend beschnitten. Nach dem Import wird das Projekt gespeichert.

## Speicher & Bereinigung

Unter **Speicher** einzelne MP4-Dateien per Checkbox markieren oder **Alle auswählen** verwenden. Die Auswahl zeigt die Gesamtgröße. Der Button verschiebt ausschließlich ausgewählte MP4s aus dem Clips-Ordner in den macOS-Papierkorb. **Speicher wird erst beim Leeren des Papierkorbs frei.** Die App leert ihn nicht automatisch.

MP4s erst nach fertigem Export/Upload entfernen: Premiere referenziert die Originaldateien und zeigt sie nach dem Entfernen als offline an. **Aktivitätsverlauf leeren** und **Technisches Log leeren** sind separat auswählbar. Projekte und Projektzähler bleiben erhalten. Laufende Importe werden gegen Bereinigung geschützt. Neue Downloads funktionieren auch nach dem Entfernen aller bisherigen MP4s und dem Leeren des Verlaufs.

## Speicherorte und Fehler

- **Clips/**: MP4-Originaldateien. Während des Downloads: `.mp4.part`.
- **Projekte/**: neue Premiere-Projekte.
- **state.json**: Aufträge und Projektzähler.
- **app.log**: technische Startmeldungen.

Scheitert eine Ansicht, wird nur ihr eigener Warteschlangen-Eintrag als fehlgeschlagen markiert; die anderen laufen weiter. Bereits erfolgreich heruntergeladene Dateien bleiben zur Bereinigung erhalten. Bei einem späteren Premiere-Fehler können bereits eingefügte Ansichten erhalten bleiben. Eine unvollständig heruntergeladene `.part`-Datei wird bei einem Downloadfehler entfernt.

## Technische Einrichtung

Unterstützt Twitch in Google Chrome auf diesem Mac. Für weitere Chrome-Profile die Erweiterung separat unter `chrome://extensions` über **Entpackte Erweiterung laden** aus dem Ordner **Chrome-Erweiterung** laden. Safari wird nicht unterstützt. Die App liest keine Twitch-Passwörter oder Cookies aus.

Die Verbindung ist lokal auf `127.0.0.1:18743` beschränkt und durch einen zufälligen lokalen Schlüssel abgesichert. Die Installation nicht mitsamt config.json und Erweiterungsdateien öffentlich teilen. Das selbst entwickelte Premiere-Panel verwendet Adobes CEP-Entwicklungsoption `PlayerDebugMode=1` für CEP 12, um unsignierte Panels zu laden. Rückgängig nach dem Entfernen des Panels: `defaults delete com.adobe.CSXS.12 PlayerDebugMode`.

Kein Autostart bei der Mac-Anmeldung. Autoclipper vor der Nutzung starten. Der lokale Dienst bleibt nach dem Schließen des Fensters aktiv, damit Downloads und Importe fertiglaufen.

## Hintergrund-Player

**Player im Hintergrund aktiv halten** ist standardmäßig eingeschaltet und im Chrome-Seitenleiste abschaltbar. Twitch-Tabs werden gegen automatisches Verwerfen geschützt. Bereits eingefrorene oder verworfene Tabs werden kurz aktiviert und die vorherige Ansicht danach wiederhergestellt. Pausierte Live-Player werden wieder gestartet, ohne zu spulen. Blockiert Chrome den automatischen Start mit Ton, wird der Player stumm gestartet; Ton kannst du im jeweiligen Player wieder einschalten. Clip-Vorschauen werden nicht automatisch abgespielt.

Ein schlafender Mac, geschlossener Browser, Netzwerkfehler oder Twitch-seitige Pausen lassen sich dadurch nicht verhindern.

## Dauerhafte Chrome-Seitenleiste und parallele Ansichten

Ein Klick auf das Autoclipper-Symbol öffnet eine globale Seitenleiste im aktuellen Chrome-Fenster. Sie bleibt beim Wechsel zwischen Tabs und Webseiten offen, bis du sie selbst schließt. Auch beim Öffnen der Mac-App bleibt sie bestehen. Mehrere ausgewählte Clip-Vorschauen werden sofort vorbereitet; Download und Import werden danach nacheinander abgearbeitet; Autoclipper aktiviert die Stream-Tabs während des Clip-Auftrags nicht mehr nacheinander. Öffnet Twitch selbst einen Vorschau-Tab, bleibt die Seitenleiste ebenfalls bestehen. Der gemeinsame Import erfolgt weiterhin hintereinander am Sequenzende in Auswahlreihenfolge.

## Sichtbare Live-Arbeitsfläche

**Live-Arbeitsfläche öffnen** verschiebt die ausgewählten Streams in eigene sichtbare Chrome-Fenster nebeneinander und öffnet links ein unabhängiges Steuerfenster. Ohne Auswahl werden bis zu acht offene Livestreams verwendet. **Zurück zu Tabs** stellt die ursprünglichen Tab-Gruppierungen und Positionen wieder her. Streams werden dabei nicht neu geladen und nicht gespult.

Der Schutz vor dem Entladen allein garantiert keinen Fortschritt von Twitch-Werbung in Hintergrund-Tabs. Die Arbeitsfläche hält die Player sichtbar, statt eine unsichtbare Wiedergabe zu behaupten. Fenster nicht minimieren oder mit anderen Fenstern verdecken, wenn Twitch die Werbung sonst anhält. Twitch kann weiterhin eigene Wiedergabebedingungen vorgeben.

## Warteschlange und Abbrechen

Drei ausgewählte Streams ergeben drei eigene Einträge. **Clip and Import** löst die Vorschau für alle drei beim Klick aus. Download und Import folgen danach der Reihe nach, inklusive Audio am Ende derselben passenden Sequenz. Sobald die Vorschauen gesichert sind, können weitere Clips hinzugefügt werden, während vorhandene Einträge noch heruntergeladen oder importiert werden.

In der Chrome-Steuerung steht pro Eintrag **Abbrechen** sowie **Alle abbrechen**. Das stoppt wartende Schritte und laufende MP4-Suchen. Downloads brechen beim nächsten Datenblock ab; unvollständige Dateien werden entfernt. Bereits fertige Dateien bleiben erhalten. Ein gerade in Premiere ausgeführter Einfüge-/Speicherschritt wird sicher beendet, statt das Projekt mitten im Schreiben abzubrechen; ein bereits eingefügter Clip wird nicht automatisch entfernt.

## Ein Fenster und automatische Vorschau-Bereinigung (ab 1.7)

Zusätzliche Stream-Fenster werden nicht mehr angelegt. Vorhandene Twitch-Stream-Tabs der bisherigen Live-Arbeitsfläche werden in einem bestehenden Chrome-Fenster gesammelt; die Steuerung bleibt in der Seitenleiste. Der Button **Stream-Tabs in einem Fenster sammeln** kann auch später genutzt werden. Aktualisieren dupliziert keine Streams.

Vom Tool neu geöffnete Clip-Vorschauen werden stummgeschaltet. Erst wenn die zugehörige MP4 vollständig im Clips-Ordner angekommen ist, werden eigene Vorschau-Tabs geschlossen und die eigene unbenannte Vorschau im ursprünglichen Stream geschlossen. Stream-Tabs bleiben erhalten. Benannte Entwürfe und zwischenzeitlich anders genutzte Vorschau-Tabs werden nicht geschlossen. Bei fehlgeschlagenen Downloads bleibt die Vorschau stumm geöffnet.

## Vorhandenes Premiere-Projekt und neue Sequenzen

Ein bereits geöffnetes Projekt wird verwendet, auch wenn Premiere beim Verbinden kurz noch keinen Projektnamen meldet. Erst Premiere selbst entscheidet, ob überhaupt ein Dokument geöffnet ist. Nur ohne geöffnetes Projekt wird automatisch ein neues angelegt.

Jeder Klick auf **Clip and Import** erhält eine eigene neue Sequenz. Mehrere Streams desselben Klicks werden gemeinsam in dieser Sequenz hintereinander eingefügt. Der Name beginnt mit dem Projektnamen; vorhandene Namen erhalten einen fortlaufenden Zusatz wie `(2)`. Bereits geöffnete, noch ungespeicherte Projekte bleiben ungespeichert, statt durch ein anderes Projekt ersetzt zu werden.

## Begrenzte Quellensuche

Lesende Player-Abfragen sind zeitlich begrenzt und fallen bei nicht antwortenden Frames auf den Hauptframe zurück. Sobald eine erlaubte neue MP4-Adresse gefunden wurde, kann der Download beginnen; die Dauer wird anschließend aus der MP4-Datei gelesen. Die Quellensuche endet nach höchstens etwa 45 Sekunden pro laufender Suche; eine serverseitige Sicherung beendet nach 65 Sekunden liegengebliebene Suchaufträge. Die Oberfläche zeigt beim Download die tatsächlichen MB statt einer alten Quellensuche-Meldung.

## Aktiver Tab-Ablauf (ab 1.8)

Die ausgewählten Streams werden jetzt vollständig **nacheinander im Vordergrund** bearbeitet: Stream-Tab aktivieren, Clip-Vorschau öffnen, neue MP4-Adresse sichern, dann nächster Stream-Tab. Öffnet Twitch die Vorschau als eigenen Tab, wird dieser für die Quellensuche aktiviert und stumm gehalten. Ein Hinweis im Player und der Status in der Seitenleiste zeigen den jeweiligen Schritt. Die automatische Bereinigung erfolgt weiterhin erst nach fertigem Download.

Spätere Streams werden daher später geclippt: Ein identischer Klickzeitpunkt über alle Ansichten wird mit diesem Vordergrund-Ablauf nicht zugesagt. Zukünftige Einträge bleiben wartend und ihr Such-Zeitlimit startet erst, wenn ihr Tab an der Reihe ist. Download und Import bleiben in der Warteschlange; Abbrechen und Alle abbrechen bleiben verfügbar.

## Vorschau beim Downloadstart schließen (ab 1.8.1)

Sobald der jeweilige Warteschlangen-Eintrag mit dem MP4-Download beginnt, wird seine vom Tool geöffnete Clip-Vorschau geschlossen. Es wird nicht mehr auf das Downloadende gewartet. Der lokale Download und der anschließende Premiere-Import laufen weiter. Ursprüngliche Stream-Tabs und benannte Entwürfe werden weiterhin nicht geschlossen.
