# Moment Score

[English](moment-score.md) · [Deutsch](moment-score.de.md) · [Español](moment-score.es.md)

Autoclipper analyses the chat visible in the open Twitch tab locally. Message text and usernames are processed briefly in the tab. Only aggregate counts, triggers and four minutes of history are sent to the app. The score uses neither external AI services nor automatic clipping.

The detector compares 15-second windows against the channel’s earlier median and robust spread after about 45 seconds of learning. It combines laughter variants, surprise, shock, calls to clip, Unicode emoji and emote images. Unfamiliar emotes count when they appear in chains or across independent users. Frequent emotes become part of the baseline. Each user contributes at most three distinct messages per window and known bots are skipped.

An alert needs several independent users, corroborating signals and usually two consecutive high scores. Red stays visible for 20 seconds. Alerts are at least 60 seconds apart. The score is a heuristic.

- **Green** — The connection is fresh and learning is complete.
- **Neutral** — Still learning, chat is missing or data is older than 15 seconds.
- **Red** — A reaction wave was detected. With reduced motion, red stays steady.

Hover for 800 ms or focus the indicator to see the trend and triggers. Collapsed, detached or inactive chats can miss messages. Background tabs may throttle timers. Changing channels resets the analysis, and initial chat history is ignored. Calls to clip in chat count as a signal. Published Twitch clips are outside this analysis.
