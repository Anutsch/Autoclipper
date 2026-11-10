# Moment-Score

[English](moment-score.md) · [Deutsch](moment-score.de.md) · [Español](moment-score.es.md)

Lokale Analyse des im geöffneten Twitch-Tab sichtbaren Chats; kein automatisches Clippen und keine externen KI-Dienste. Nachrichtentexte und Nutzernamen werden nur kurz im Tab verarbeitet. An die App gehen aggregierte Zahlen, Auslöser und vier Minuten Verlauf.

15-Sekunden-Reaktionsfenster; etwa 45 Sekunden Lernphase; kanalbezogener Vergleich mit älteren Fenstern, Median und robuster Streuung. Lachvarianten, Überraschung, Schock, Clip-Rufe, Unicode-Emojis und Emote-Bilder werden kombiniert. Unbekannte Emotes zählen über unabhängige Nutzer und Ketten. Häufige Emotes werden als Normalität gelernt. Pro Nutzer höchstens drei nicht identische Beiträge pro 15 Sekunden; bekannte Bots werden ausgelassen.

Alarm erfordert mehrere unabhängige Nutzer, mehrere bestätigende Signale und normalerweise zwei aufeinanderfolgende hohe Scores. Rot bleibt 20 Sekunden sichtbar; erneuter Alarm frühestens nach 60 Sekunden. Der Score ist eine heuristische Gewichtung, keine Wahrscheinlichkeit und kein Urteil über den Inhalt.

Grün: frische Chat-Verbindung, Lernphase abgeschlossen, kein aktiver Alarm. Neutral: Lernen, fehlender Chat oder Daten älter als 15 Sekunden. Rot: erkannte Reaktionswelle. Nach 800 ms Hover oder Tastaturfokus erscheinen Verlauf und Auslöser. Bei reduzierter Bewegung leuchtet Rot ohne Pulsieren.

Grenzen: Nur tatsächlich geladene Chat-Nachrichten werden erkannt. Eingeklappte, abgetrennte oder inaktive Chats können Daten verlieren; Timer in Hintergrund-Tabs können gedrosselt sein. Kanalwechsel setzt die Analyse zurück. Die erste bereits sichtbare Chat-Historie wird nicht als neue Reaktion gezählt. Neue veröffentlichte Twitch-Clips werden nicht abgefragt; „Clip“-Rufe im Chat sind ein eigenes Signal.
