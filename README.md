# Auto Clipper

Lokales macOS-Tool für Twitch → Adobe Premiere Pro. Chrome sichert die MP4 einer frischen Clip-Vorschau; das Premiere-Panel importiert sie in eine vertikale Sequenz. Es wird kein Twitch-Clip veröffentlicht.

## Aktueller Stand

- Eigenständige Live-Player in der Mac-App mit Pause, Lautstärke und Mute; unabhängig von Chrome.
- Permanente Chrome-Seitenleiste, Stream-Auswahl, Warteschlange und Abbruch.
- Import ins offene Projekt; neue Sequenz je Auswahl, 1080 × 1920 mit 30 fps.
- Bei Mehrfachauswahl: konservativer lokaler Audio-Abgleich und separate Video-/Audiospuren. Unsichere Treffer werden markiert.
- Automatischer Titel auf der obersten Videospur bei Einzel- und synchronisierten Mehrfachauswahlen (Vorlage im Stil „Tiktok Titel“, 5 Sekunden ab Sequenzstart).
- Moment-Score aus Chat-Reaktionen, Emotes und kanalbezogenem Chattempo; Hover-Diagramm und visuelle Alarme.
- Manuelle/optionale automatische Chat-Neuverbindung.
- Kleine Video-Vorschaubilder, Dateiverwaltung über den Papierkorb und löschbare Logs.

## Build auf macOS

Benötigt macOS, Python 3, Xcode Command Line Tools, Google Chrome und Premiere Pro 2025/2026 mit CEP-Unterstützung. Keine externen Python-Pakete nötig.

```sh
python3 scripts/build.py
```

Der Build liegt unter `dist/Auto Clipper/`. Der lokal erzeugte Pairing-Token bleibt bei erneuten Builds erhalten. Dieser Ordner enthält lokale Zugangsdaten und gehört nicht ins Repository.

1. `dist/Auto Clipper/Autoclipper.app` öffnen.
2. In `chrome://extensions` den Entwicklermodus einschalten und `dist/Auto Clipper/Chrome-Erweiterung` als entpackte Erweiterung laden.
3. Das Premiere-Panel installieren:

   ```sh
   python3 scripts/install_panel.py
   ```

4. In Premiere unter **Fenster → Erweiterungen → Autoclipper** öffnen. Für ein unsigniertes lokales CEP-Panel kann die passende Adobe-Entwicklereinstellung nötig sein. Vorhandene Projekte vor einem Premiere-Neustart speichern.

App, Chrome-Erweiterung und Premiere-Panel müssen aus demselben Build stammen. Die App neben `src/`, `assets/` und `config.json` im Build-Ordner belassen.

## Struktur

| Ordner | Inhalt |
| --- | --- |
| `src/` | Python-Dienst, Mac-App, Oberfläche und native Medien-Helfer |
| `Chrome-Erweiterung/` | Twitch-Erkennung, Clip-Steuerung und Chat-Analyse |
| `Premiere-Panel/` | CEP-Oberfläche und ExtendScript-Import |
| `assets/`, `packaging/` | Logo und App-Paketvorlage |
| `Design-Vorschlag-*` | Frühere statische Designentwürfe |
| `docs/` | Technische Hinweise; die ältere Anleitung beschreibt teilweise frühere Versionen |

## Grenzen

Clippen verwendet weiterhin die Twitch-Clip-Vorschau des verbundenen Chrome-Tabs, nicht den unabhängigen Wiedergabepunkt im App-Player. Der Moment-Score benötigt geladenen Chat. Audio-Synchronisation braucht ausreichend gemeinsame Audiosignale; zusätzliche Premiere-Spuren verwenden die interne QE-Schnittstelle. Der letzte Synchronisationsumbau wurde noch nicht vollständig in Premiere live getestet.

Die automatische Transkription mit Ein-Wort-Untertiteln und Transkript-Stil ist **noch nicht implementiert**. Der Titel-Zusatz für synchronisierte Gruppen ist vorlagenbasiert eingebaut; ein Premiere-Live-Test steht noch aus.

Clips, Premiere-Projekte, Laufzeitdaten, Logs, Pairing-Tokens und kompilierte App-Bundles werden nicht versioniert. Der bestehende Desktop-Ordner wird vom Build nicht verändert.
