# AlanBlox audio and haptics

AlanBlox synthesizes all default sounds with Web Audio. The game sends cues after accepted input or committed moves. Audio and vibration do not affect scoring, combos, placement, or hand generation.

## Sound events

| Event in `sounds.json` | Procedural sound |
|---|---|
| `pickup` | Short upward tone when picked up or selected |
| `place` | Low tap and brief upper transient |
| `invalid` | Quiet falling two-note response |
| `clear1` | Single-line pulse and pitched tone |
| `clear2` | Double-line cue with an added upper note |
| `clear3` | Three-line cue with an octave accent |
| `clear4` | Four or more lines with a longer, layered voicing |
| `combo` | Musical reply after a clearing move increases an active combo |
| `allClear` | Ascending flourish and resolving chord synchronized to the full-board animation |
| `record` | Short tag on the first new best in a run, when space in the cue permits |
| `gameOver` | Descending cadence when the run ends |
| `gem` | High two-note pickup when a move collects Adventure gems |
| `levelComplete` | Resolving Adventure victory chord |
| `newGame` | Three-note cue on Play Again or confirmed restart |
| `ui` | Quiet settings and button feedback |

The progression starts on C major pentatonic. It draws pitch from the actual combo count and adds voices at combos 4 and 7. The voicing plateaus at combo 9. A missed move does not use combo music, and a later clear uses the current combo from gameplay. The next clear after a genuine expiry starts on the first voicing again. Tune notes, scale degrees, and thresholds in `js/sound-bank.js`.

All-clear begins in the same move update as the particles and theme change, replaces weaker cues, and keeps them quiet during the flourish. Game over replaces the ordinary placement sound on a terminal move. Restart stops the last run's audio and vibration before its own cue plays. A restored game is quiet until the player interacts.

Haptic defaults live in `js/haptics.js`. Placement uses 8 ms, invalid placement 20 ms, single and double clears 25 and 40 ms, and larger clears 60 ms. High combos use a double pulse and all-clear uses a three-pulse pattern. Availability depends on the browser and device. Safari on iOS lacks the Vibration API. On browsers without it the setting is disabled, the preference is retained, and sound and visual feedback continue. [Platform details](../docs/phase-8-1/INPUT.md#vibration-support)

## Replacing a sound

1. Put the new file in this `audio/` directory. WAV, MP3, Ogg, or other formats work when the browser can decode them. Trim the start close to the first transient and export a short clip. The playback limit is three seconds.
2. Add the registered event and relative file path to `audio/sounds.json`. List alternate encodings in preference order if needed. For example:

   ```json
   {
     "pickup": "pickup.mp3",
     "clear3": ["triple-clear.ogg", "triple-clear.mp3"]
   }
   ```

3. Increment the shell cache version in `sw.js` and test on a local server. The service worker caches available files from the manifest for offline playback. Close other game tabs so the new worker can take over. Missing files and unsupported encodings fall back to synthesis. The first cue may use synthesis while a replacement is decoding.
4. Use the preview tool to adjust sound balance before deployment. The mixer uses a capped master gain, output limiting, and a maximum of four active cues and 24 voices. The configured file gain and voice limits live in `js/audio.js`.

A custom file replaces the whole event, including its procedural pitch variation. Leave the clear and combo events procedural if you want their notes to follow the combo scale.

## Preview tool

Run the local server described in the [main README](../README.md), then open `http://localhost:8000/tools/sound-preview.html`. The tool is enabled on loopback hosts and is separate from gameplay and its saves. Pick a combo level, adjust volume, and audition individual sound or vibration events. It is outside the offline shell.

Web Audio needs a browser-approved gesture. Audio is suspended and old cues are cleared when the page goes into the background. Some browsers may require another interaction after foregrounding or a system audio interruption. Vibration requests can be declined due to device hardware, browser policy, or operating-system settings.

### Optional material overrides

A `materials` entry can override an event for one material. For example, `{"materials":{"wood":{"place":"wood-tap.wav"}}}` plays the replacement when a Wood piece lands. A missing or unsupported material file falls back to the global event file, then to synthesis. Variant files in the manifest are precached like global files.
