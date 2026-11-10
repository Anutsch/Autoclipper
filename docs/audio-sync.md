# Audio alignment for multiple views

[English](audio-sync.md) · [Deutsch](audio-sync.de.md) · [Español](audio-sync.es.md)

Since 2.1.0, streams selected in one action are downloaded as a group, analysed locally and placed on separate video and audio tracks in a new 1080 × 1920 sequence at 30 fps. Single-view import works as before. Original audio levels and mute states are preserved.

The macOS helper uses AVFoundation to decode the relevant MP4 range into temporary three-band envelopes at 50 Hz. Local FFT cross-correlation evaluates all pairs using 10–20 seconds of minimum overlap, peak strength, separation from alternative matches and agreement across both halves of the overlap. A graph links views that cannot be matched directly to the first view. Inconsistent offsets are rejected and placements are snapped to the 30 fps grid.

Views without a reliable match start at zero on separate tracks with a warning. A shared capture time or Twitch latency provides no audio evidence. Muted clips, different sound, repeated sounds and clock drift can require manual alignment.

Premiere uses CEP and adds tracks through the internal QE interface in the new sequence. Autoclipper checks that the tracks were created and reports an error if they are missing.

Capture and download can be cancelled per view. After group processing starts, cancellation applies to the group. A running Premiere step is allowed to finish safely. Temporary analysis files are then removed.

Verification covered a six-second offset, rejection of independent signals and silence, and syntax. A new live Premiere import was outside that check.

Optional [titles and overlays](../README.md#titles-and-overlays) go on separate video tracks after alignment.
