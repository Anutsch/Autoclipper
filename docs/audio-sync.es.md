# Sincronización por audio de varias vistas

[English](audio-sync.md) · [Deutsch](audio-sync.de.md) · [Español](audio-sync.es.md)

Desde la versión 2.1.0, los directos seleccionados en una misma acción se descargan como grupo, se analizan localmente y se colocan en pistas de vídeo y audio separadas en una secuencia nueva de 1080 × 1920 a 30 fps. La importación de una sola vista funciona como antes. Se conservan los niveles y el estado de silencio del audio original.

En macOS, AVFoundation decodifica el tramo del MP4 utilizado y genera envolventes temporales de tres bandas a 50 Hz. Una correlación cruzada local mediante FFT compara todos los pares con un solapamiento mínimo de 10 a 20 segundos. Evalúa la fuerza de la coincidencia, la diferencia con otras opciones y el acuerdo entre las dos mitades del solapamiento. Un grafo vincula las vistas que no coinciden directamente con la primera. Se descartan los desfases contradictorios y se ajusta la colocación a la cuadrícula de 30 fps.

Las vistas sin coincidencia fiable empiezan en el segundo cero en pistas separadas y muestran un aviso. La hora de captura y la latencia de Twitch no aportan evidencia de audio. El silencio, sonidos distintos o repetidos y la deriva temporal pueden exigir un ajuste manual.

Premiere usa CEP y crea pistas mediante la interfaz interna QE en la nueva secuencia. Autoclipper comprueba que se hayan creado y muestra un error si faltan.

Se puede cancelar la captura y la descarga de cada vista. Una vez iniciado el procesamiento conjunto, se cancela el grupo. Si Premiere ya está ejecutando un paso, se deja que termine de forma segura. Después se eliminan los datos temporales.

Se comprobó un desfase de seis segundos, el rechazo de señales independientes y del silencio, y la sintaxis. La comprobación no incluyó una importación en directo en Premiere.

Los [títulos y recursos](../README.es.md#títulos-y-recursos) opcionales se colocan en pistas separadas después de la sincronización.
