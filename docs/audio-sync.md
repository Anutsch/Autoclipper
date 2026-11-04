# Audio-Synchronisation mehrerer Ansichten

Ab 2.1.0: Mehrere beim selben Klick ausgewählte Streams werden als Gruppe heruntergeladen, lokal analysiert und in einer neuen 1080×1920-/30-fps-Sequenz auf separaten Video-/Audiospuren platziert. Einzelauswahl behält den bisherigen Import. Originalaudio bleibt unverändert; keine Pegeländerungen oder Stummschaltung.

AVFoundation dekodiert ausschließlich den verwendeten MP4-Bereich in temporäre Dreifrequenzband-Hüllkurven (50 Hz). Lokale FFT-Kreuzkorrelation bewertet alle Paare, mindestens 10–20 Sekunden Überlappung, Stärke, Abstand zu alternativen Treffern und Bestätigung in beiden Überlappungshälften. Ein Zusammenhangsgraph verbindet auch Paare ohne direkten Bezug zur ersten Ansicht. Widersprüchliche Offsets werden verworfen. Platzierung erfolgt auf dem 30-fps-Raster.

Ohne sicheren Bezug werden Ansichten bei 0 Sekunden auf eigenen Spuren mit Warnung importiert. Dies gilt nicht als erfolgreiche Synchronisation. Gleiche Auswahlzeit oder Twitch-Latenz dienen nicht als Ersatz für Audionachweise. Audiodaten ohne gemeinsame Signale, stumme Clips, Wiederholungen und Zeitdrift können manuelles Synchronisieren erfordern. Die Heuristik ist konservativ, aber keine Garantie für korrekte Ausrichtung.

Die Premiere-Erweiterung verwendet die bestehende CEP-Anbindung. Zusätzliche Spuren werden nur in der neuen eigenen Sequenz über die interne QE-Schnittstelle angelegt und anschließend geprüft. Diese Schnittstelle ist nicht öffentlich unterstützt; fehlende Spuren führen zu einem sichtbaren Fehler. Bestehende Sequenzen werden nicht für neue Gruppen verwendet.

Abbruch während Capture/Download bleibt pro Ansicht möglich. Nach gemeinsamer Aufbereitung wird die Synchronisationsgruppe gemeinsam abgebrochen. Ein bereits ausführender Premiere-Schritt wird sicher beendet. Temporäre Analysedaten werden danach entfernt.

Geprüft: mathematischer 6-Sekunden-Versatz, Ablehnung unabhängiger Signale/Stille und Syntax. Kein zusätzlicher Live-Clip-Test in Premiere gestartet.
