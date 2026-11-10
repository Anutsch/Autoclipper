# Moment Score

[English](moment-score.md) · [Deutsch](moment-score.de.md) · [Español](moment-score.es.md)

Autoclipper analiza localmente el chat visible en la pestaña abierta de Twitch. El texto y los nombres se procesan brevemente en la pestaña. La app recibe solo recuentos agregados, motivos y cuatro minutos de historial. El análisis funciona sin servicios externos de IA y no crea clips automáticamente.

Tras unos 45 segundos de aprendizaje, el detector compara ventanas de 15 segundos con la mediana y una medida robusta de dispersión del canal. Combina variantes de risa, sorpresa, conmoción, peticiones de clip, emojis Unicode e imágenes de emotes. Los emotes desconocidos cuentan si aparecen en cadenas o entre usuarios independientes. Los frecuentes pasan a formar parte de la referencia. Cada usuario aporta hasta tres mensajes distintos por ventana y se omiten los bots conocidos.

Una alerta requiere varios usuarios independientes, señales que se refuercen y normalmente dos puntuaciones altas consecutivas. El rojo se mantiene durante 20 segundos. Hay al menos 60 segundos entre alertas. La puntuación es heurística.

- **Verde** — La conexión está activa y el aprendizaje ha terminado.
- **Neutro** — Aún está aprendiendo, falta el chat o los datos tienen más de 15 segundos.
- **Rojo** — Se detectó una oleada de reacciones. Con movimiento reducido, el rojo permanece fijo.

Pasa el puntero 800 ms por el indicador o selecciónalo con el teclado para ver la tendencia y los motivos. Los chats contraídos, separados o inactivos pueden perder mensajes. Las pestañas en segundo plano pueden ralentizar los temporizadores. Cambiar de canal reinicia el análisis y se ignora el historial inicial. Las peticiones de clip en el chat cuentan como señal. Los clips publicados en Twitch quedan fuera del análisis.
