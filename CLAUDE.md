# CLAUDE.md

Instructions for Claude Code working in this repo. Read `spec.md` before your first
change in a session — it is the source of truth for behaviour, and this file is the
source of truth for *how to work here*. If the two disagree, `spec.md` wins on what to
build and this file wins on how.

---

## Project

`bluetooth.wtf` — a one-page nostalgia site that plays 2007–2013 Indian songs through a
CSS-rendered Nokia phone. Reference point: `saloon.wtf`. The entire product is one
screen. Treat every change as a change to a single, carefully composed image that
happens to be interactive.

## Stack

Static site. **No build step, no framework, no package manager for the app itself.**
Plain HTML, CSS, and ES modules served directly. Do not introduce Vite, React,
Tailwind, or TypeScript without asking first — the answer is very likely no.

Local dev:

```bash
npx serve .          # must be served over http, not file://
                     # file:// sends no Referer -> every video fails with error 153

YT_API_KEY=AIza... node scripts/audit-playlist.mjs                  # check the playlist
YT_API_KEY=AIza... node scripts/audit-playlist.mjs --write-labels   # seed src/labels.js
```

Run the audit before touching player code in a fresh checkout, and again any time songs
are added to the playlist. Videos get taken down and embed permissions change without
notice.

There are no tests and no CI yet. Verify by looking at it.

## Layout

> **2026-08-15 pivot:** the CSS Nokia phone concept described in the rest of this
> file and in `spec.md` was dropped. There is no `phone.js`, `lcd.js`, or `menu.js`
> anymore, and no tap/wipe/backlight animation system. The product is now: the
> `hero.png` desk photo as a full-bleed backdrop, plus a floating glassmorphism
> player card (`src/player-ui.js`) top-right with the real visible YouTube player,
> title/artist, time/progress, and prev/play/next controls. Treat `spec.md` as
> describing an earlier direction, not the current one — the sections below that
> still apply (error handling, referrer policy, no self-hosted audio, etc.) do so
> for the new UI too; the sections about the LCD/keypad/boot sequence/OPTIONS menu
> do not apply to anything currently in the repo.

```
index.html
src/playlist.js   ordered track list: { id, title, artist }[]. The only track data
                  in this repo now (see the hard rule below for why).
src/player.js     YouTube IFrame wrapper + playback state machine, loads tracks by
                  id via loadVideoById(), not playlist mode
src/player-ui.js  the floating player card: DOM, display updates, control wiring
src/main.js       wiring only, no logic
styles/           base / player-ui / motion
public/           hero.png
```

`player.js` never touches the DOM. It and `player-ui.js` communicate through events
dispatched on a shared emitter created in `main.js`.

---

## Hard rules

**Never fabricate a YouTube video ID.** An invented 11-character string looks plausible
and fails silently at runtime. Every id in `src/playlist.js` was pulled from the real
playlist page's DOM (or, later, `scripts/audit-playlist.mjs` output), never from memory.
If you need an id you don't have, say so.

**`src/playlist.js` is a deliberate, hand-maintained exception to "don't mirror
YouTube's tracklist locally."** The original design loaded the playlist live via
`playerVars: { listType: 'playlist', list: PLAYLIST_ID }`, so songs could be
added/reordered in the YouTube app with no redeploy. In testing that approach broke
under content-blocker conditions that loading individual videos by id survives (see
saloon.wtf comparison in session notes) — resolving a full playlist server-side is
more failure-prone than loading one specific video, YouTube's most basic embed
operation. We switched to a local manifest deliberately, with the reliability
tradeoff understood: adding or reordering songs now requires editing
`src/playlist.js` and redeploying, not just editing the YouTube playlist. Don't
revert this to playlist mode without re-confirming the reliability problem is
actually gone.

**Never set `Referrer-Policy: no-referrer` or `same-origin`** in headers, meta tags, or
hosting config. YouTube blocks embedded playback with error 153 when no `Referer` is
sent. Use `strict-origin-when-cross-origin`. This fails only in production, so it will
not show up in local testing.

**Never self-host or rip music.** Playback is the official YouTube IFrame player,
always. No `<audio>` tags pointing at MP3s of copyrighted songs, no youtube-dl in a
build script, no proxying. The only local audio is `public/sfx/` — UI clicks and the
CC0 ambient loops (§15.4), which are foley, not music.

**The YouTube audio cannot be processed.** It is a cross-origin iframe; Web Audio has no
access to it. There is no EQ, no filter, no `createMediaElementSource`, no flag that
changes this. If a task implies making the music sound lo-fi, say it is not possible and
point at the ambient layer instead. Do not spend time researching workarounds — there
are none.

**~~Never hide the YouTube player with `display: none`.~~ 2026-08-15: overridden.**
YouTube's terms require a visible, unobscured player — that fact hasn't changed. But
after this was explained clearly (twice) and flagged as a real ToS risk, the site owner
explicitly and knowingly decided to hide both YouTube elements anyway and accept the
consequences. Implemented as a 1x1px `overflow:hidden` ancestor (`.yt-clip`,
`.ringtone-clip` in `styles/player-ui.css`) rather than `display:none` on the iframe
itself — same technique saloon.wtf uses, confirmed by inspecting their DOM. The iframe
still renders at full size internally; it's just clipped to nothing on screen.
Functionally identical outcome to `display:none` — this is not a claim of compliance,
just matching a real precedent. Don't silently "fix" this back to visible in a future
session — it's a deliberate, informed call by the person who owns the risk, not an
oversight. If asked to touch this area again, the open question is whether they still
want that tradeoff, not whether the rule technically still applies.

**Never add a cookie banner, newsletter modal, or interstitial.** The page has one job.

**Never use `localStorage` for anything except the mute toggle and the reduced-motion
override.** No history, no favourites, no analytics identifiers.

---

## Conventions

- **Motion values come from CSS custom properties** in `styles/motion.css`
  (`--tap-dur`, `--wipe-dur`, `--ease-key`, `--ease-wipe`). Never hardcode a duration or
  easing curve in JS or in a component stylesheet. If a new animation needs a new
  timing, add a token.
- **Animate `transform` and `opacity` only.** No animating `width`, `top`, `background`,
  or `box-shadow`. The LCD wipe and every key press must stay on the compositor.
- **Every animation respects `prefers-reduced-motion: reduce`.** Add the reduced-motion
  branch in the same commit as the animation, not after.
- **State changes are never gated on animations.** Pressing NEXT updates the track index
  immediately; the animation is decoration that runs alongside. If you find yourself
  writing `setTimeout(() => changeTrack(), 200)`, that's the bug.
- CSS: BEM-ish flat classes (`.key`, `.key--soft`, `.key--pressed`). No nesting deeper
  than two levels. No utility classes.
- JS: named exports, no default exports. `camelCase`. No abbreviations in names except
  `lcd` and `sfx`.
- Copy on screen is sentence case except LCD text, which is period-accurate
  (`NOW PLAYING`, `PREV`, `OPTIONS`, `NEXT` in caps).

---

## Known traps

These have all bitten before. Check them before saying something works.

1. **iOS audio unlock.** `player.playVideo()` must be called synchronously inside the
   user gesture handler. Calling it from a promise callback or a `setTimeout` after the
   tap silently fails on iOS Safari. The boot sequence's skip-tap is the unlock gesture —
   don't restructure it without testing on a real iPhone.

2. **Embed-blocked videos, especially art tracks.** The playlist was built in YouTube
   Music, so it may contain art tracks — label audio on `Artist - Topic` channels.
   These are frequently not embeddable. Handle `onError` `100`/`101`/`150` with
   `nextVideo()`. Guard the skip loop: three consecutive errors stops and shows
   `No files received` with a retry soft key, rather than racing silently to the end of
   the playlist. Never verify embeddability by opening a video on youtube.com — that is
   a different permission. Use `scripts/audit-playlist.mjs`.

3. **Error 153 is not skippable.** It means no `Referer` header reached YouTube, and it
   affects every video at once. Causes: testing over `file://`, or a strict
   `Referrer-Policy`. If every video suddenly fails in production but works locally,
   this is it — check headers before touching player code.

4. **`onYouTubeIframeAPIReady` is a global.** It fires once, on `window`. If more than
   one module tries to define it, one wins silently. It is defined in `player.js` and
   nowhere else.

5. **Rapid NEXT presses.** The LCD must update instantly per press while the
   `playVideoAt` call is debounced 250ms. Track the intended index locally; do not read
   `getPlaylistIndex()` during a burst, because it reflects what the player has actually
   loaded, not what the user has asked for. If the LCD shows track 7 while track 4
   plays, this is the cause.

6. **PREV is not symmetric with NEXT.** After 3 seconds of playback, PREV restarts the
   current track instead of going back. This is intentional — every music player does
   it. Note that `previousVideo()` does *not* do this, so branch on `getCurrentTime()`
   yourself. Similarly, PREV at index 0 needs an explicit
   `playVideoAt(getPlaylist().length - 1)`; `setLoop(true)` only wraps forward.

7. **The phantom thumb is auto-advance only.** The blurred fingertip shadow over the
   NEXT key must never appear when a real user taps — their finger is already there and
   the doubled shadow looks broken.

8. **`getVideoData()` is undocumented.** It is not in the official IFrame API
   reference. It works and everyone uses it, but treat it as unstable surface: if it
   returns empty, fall back to the label map, never to a blank LCD.

9. **The title cleaner exists in two places** — `cleanTitle()` in
   `scripts/audit-playlist.mjs` and the runtime fallback in `src/lcd.js`. They must stay
   in sync. Change one, change the other, in the same commit.

10. **Marquee reset.** The title scroller has to reset its animation *and* its 1s
   initial pause on every track change. Restarting a CSS animation needs a reflow
   (`el.offsetWidth`) between removing and re-adding the class.

11. **The scene image is a backdrop, not a UI.** The phone in `scene.jpg` is a
   photograph. The interactive phone is built in CSS and floats above the blurred
   backdrop. Do not attempt to pixel-align the CSS phone to the photographed one.

---

## Working style

- **Portrait mobile first.** Most traffic arrives from a WhatsApp forward on a phone.
  If a change looks great at 1440px and cramped at 390px, it isn't done.
- **Small, reviewable diffs.** One concern per change. Don't refactor adjacent code
  while fixing a bug.
- **Ask before adding a dependency.** The current dependency count is zero and that is a
  feature.
- **Don't add features that aren't in `spec.md`.** If you have a good idea, say it in
  your response and leave the code alone. §14 has the open questions, §15.8 lists things
  deliberately rejected — check both before proposing something.
- **Follow the build order in §16.** Player works before anything is styled; the boot
  sequence is step 6, not step 1. If asked to jump ahead, say what it will cost.
- **When you finish a change, state what you verified and what you didn't.** "Tested
  next/prev on desktop Chrome; iOS audio unlock not verified" is a useful sentence.
  Claiming something works when you couldn't run it is not.
- Screenshot or describe the visual result when you change anything on the LCD or the
  key animations. Those are the two things that carry the whole site.

## If you are short on time

Steps 1–5 of §16 are a shippable site. Cut from §15 first, then the OPTIONS menu, then
the boot sequence. Never cut the tap animation or the error handling — the first is the
whole point and the second is what stops the site looking broken.

## Definition of done

`spec.md` §13 holds the v1 checklist. Anything that touches the tap animation must also
satisfy: works on click, works on keyboard, works on natural track end, survives
mashing, and has a reduced-motion path.
