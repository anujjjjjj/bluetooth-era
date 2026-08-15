# bluetooth.wtf — Product & Technical Spec

> A single-page nostalgia site that plays the songs Indians traded over Bluetooth on
> Nokia phones between roughly 2007 and 2013. Spiritual sibling to `saloon.wtf`
> (which does 90s barbershop Bollywood); this one does the earbud-splitter,
> `Send via Bluetooth`, `Tera_Hone_Laga_Hoon_HQ_320kbps.mp3` era.

---

## 1. The one-line pitch

**"Songs your friend Bluetoothed you in class."**

The whole site is one screen: a Nokia bar phone sitting on a sunlit desk, playing a
curated playlist. You hit NEXT, the key physically depresses, the LCD wipes, the next
track plays. That's it. No scrolling landing page, no feature grid.

## 2. Who it's for

Indians aged ~25–38 who will send it to a group chat within 20 seconds of opening it.
Success is a screenshot on Instagram Stories, not session length. Design for the
screenshot: the phone, the LCD, and the desk must look good as a still frame.

## 3. Non-goals

- No accounts, no login, no analytics beyond a simple pageview counter.
- No search, no "add your own song", no user-generated playlists (v1).
- No backend. Fully static.
- No audio ripping or self-hosted MP3s. Playback is the official YouTube IFrame
  player, always. This is the licensing-safe path and it is not negotiable.

---

## 4. The scene

A hero background image already exists (`/public/scene.jpg` — the desk photo). It
contains: a Nokia bar phone held in a hand, wired earbuds, a spiral notebook with a
handwritten PLAYLIST, stacked CD cases (Jal, Atif Aslam — *Doorie*, KK — *Humsafar*,
Pritam — *Love Aaj Kal*, Mohit Chauhan — *WAQT*), Chetan Bhagat paperbacks, a
`KAL SE DEKHENGE` mug, sticky notes (`GOOD VIBES ONLY`, `Remember why you started`,
`KAAM SE MATLAB RAKH`, `Dream. Plan. Do. Repeat.`), and a window onto Indian rooftops.

### 4.1 How the image and the interactive phone relate

**Do not try to animate the phone that is inside the JPEG.** Pixel-aligning a CSS
overlay to a raster phone breaks at every viewport width.

Instead:

- The JPEG is the **ambient backdrop**: `object-fit: cover`, a slight blur
  (`filter: blur(3px) saturate(1.05)`) and a radial vignette so it recedes.
- The **interactive Nokia is built in CSS/SVG** and floats crisp in the centre, with a
  real drop shadow so it sits in the scene rather than on top of it.
- On mobile the backdrop blurs harder and darkens more; the phone is the only thing
  that matters below 640px.

Stretch goal (only if v1 ships first): a PNG cutout of the hand layered *above* the
CSS phone so it reads as genuinely held.

---

## 5. The signature moment: the Bluetooth handshake

This is the thing people will remember. It replaces a normal loading screen and it
doubles as the user gesture that unlocks audio (see §8.1).

On first load, the LCD runs a scripted sequence. Roughly 4.5 seconds total, skippable
by tapping anywhere:

```
NOKIA                          (0.4s, backlight flicker on)
Searching for devices...       (dots animate, 1.2s)
1 device found                 (0.4s)
  NOKIA-5233                   (0.5s)
Receiving:                     
Tera_Hone_Laga_Hoon_HQ.mp3
[||||||||......]  47%          (progress fills, 1.6s)
1 file received                (0.4s)
```

Then the screen settles into the player and a soft key prompt pulses:
`PRESS ▶ TO PLAY`.

Details that matter: the progress bar stalls at 89% for ~400ms before completing.
Everyone remembers that stall.

---

## 6. The phone UI

### 6.1 LCD screen

Monochrome green STN panel. Everything on it is drawn with the LCD type stack, never
the body font.

- Panel background `#c7d84a`, text `#1a2208`, at ~85% opacity so it reads as ink on a
  backlight, not pure black.
- A faint horizontal scanline overlay (`repeating-linear-gradient`, 2px period,
  4% opacity) and a very subtle green screen glow bleeding onto the bezel.
- Fixed logical resolution, scaled with `transform`. Treat the LCD as a 128×160 grid
  and scale it up; this keeps the pixel look honest at every breakpoint.

Layout, top to bottom:

| Row | Content |
|---|---|
| Status bar | signal bars (animate a bar in/out every ~8s), `Bluetooth` glyph when a "transfer" is running, battery |
| Header | `NOW PLAYING` |
| Title | Track title. **Marquee-scroll if wider than the panel** — one of the truest details of the era. Pause 1s, scroll, pause 1s, reset. |
| Artist | Artist name, one line, truncated with `...` |
| Time | `MM:SS / MM:SS`, live from the player |
| Progress | Blocky filled bar — drawn as discrete cells, not a smooth gradient |
| Soft keys | `PREV` &nbsp;&nbsp; `OPTIONS` &nbsp;&nbsp; `NEXT` |

### 6.2 Physical keys

Rendered in CSS: the two soft keys, green call / red end keys, a D-pad, and the full
1–9 / * / 0 / # keypad with the tiny `2 abc`, `3 def` sub-labels visible in the photo.

Interactive keys:

| Key | Action |
|---|---|
| Right soft key (`NEXT`) | next track |
| Left soft key (`PREV`) | previous track (see §7.3 for the restart-vs-back rule) |
| D-pad right / left | next / previous |
| D-pad centre | play / pause |
| Middle soft key (`OPTIONS`) | opens the Nokia-style menu |
| Green call key | play / pause |
| Red end key | pause + LCD backlight dims |
| Any digit key | jump to that track number in the playlist (1–9) |

Non-interactive keys still depress on click and emit the keypad click sound. Nothing
should feel dead.

### 6.3 OPTIONS menu

A real Nokia list menu inside the LCD: inverted highlight bar, `Select` / `Back` soft
keys, D-pad up/down to move. Items:

1. `Playlist` — scrollable list, current track marked with `►`
2. `Send via Bluetooth` — the share mechanic (§9)
3. `Repeat: On / Off`
4. `Shuffle: On / Off`
5. `About`

---

## 7. Playback

### 7.1 Source of truth

Content and order live in a **YouTube playlist**, not in this repo:

```
PLNQk18YUccs2R8_aqb6EgEDA5e-uACqWm
```

Built in YouTube Music. That's fine — YouTube Music playlists are ordinary YouTube
playlists surfaced in a different app, and the ID works with the standard IFrame Player
API. There is no YouTube Music embed or API; don't go looking for one.

Adding or reordering songs happens in the YouTube app. No redeploy.

The `si=` parameter on a shared YT Music link is a share tracker. Strip it.

The playlist must be **public or unlisted**. Private playlists do not embed at all, and
a public playlist can still contain individual private videos, which won't play.

### 7.2 Display labels

The one thing a playlist can't give us is a clean LCD. `getVideoData()` returns the raw
upload title, which for most Bollywood music videos looks like:

```
Tera Hone Laga Hoon Full Video Song | Ajab Prem Ki Ghazab Kahani | Atif Aslam | HD
```

On a 128px monochrome panel that is unreadable and the marquee scrolls for nine seconds.

So `src/labels.js` maps video ID → display strings. This is the **only** track data we
store, and it holds no IDs in order and no playback logic:

```js
export const LABELS = {
  'VIDEO_ID': {
    title:  'Tera Hone Laga Hoon',
    artist: 'Atif Aslam',
    file:   'Tera_Hone_Laga_Hoon_HQ_320kbps.mp3'  // for the transfer animation
  },
};
```

`file` is optional — derive it from the title if absent
(`Title.replace(/ /g, '_') + '_HQ_320kbps.mp3'`).

**Fallback for unmapped videos.** A new song added in the YouTube app should still
render acceptably before anyone updates `labels.js`. Clean the raw title: take
everything before the first `|`, then strip
`Full Video Song`, `Full Song`, `Official Video`, `Official Audio`, `Lyrical`,
`Video Song`, `HD`, `4K`, `Remastered`, and any trailing bracketed segment. For the
artist, use the channel name with ` - Topic` stripped.

Note: `getVideoData()` is not in YouTube's official IFrame API reference. It has been
stable for years and is widely relied on, but it is undocumented surface. If it ever
returns empty, fall back to the label map keyed by index.

### 7.3 Art tracks — audit before building

Songs added from YouTube Music are often **art tracks**: label-uploaded audio on
`Artist - Topic` channels with static album art. They are a genuine trade-off.

| | Metadata | Embeddable |
|---|---|---|
| Art track (`- Topic`) | Clean. `Tera Hone Laga Hoon` / `Atif Aslam - Topic`. Labels basically free. | Frequently restricted |
| Music video | Junk title, needs the label map | Reliable |

**Run `scripts/audit-playlist.mjs` before writing any player code.** It calls the
YouTube Data API and reports, per video: `embeddable`, `privacyStatus`,
`regionRestriction`, title, and channel. It also emits a starter `labels.js`.

Decision rule:

- Mostly `embeddable: true` → ship the playlist as-is, fill in labels.
- Many `false` → rebuild the playlist on regular YouTube using music videos instead of
  YT Music "songs", and re-audit.

Re-run the audit whenever songs are added. Videos also get taken down without warning.

### 7.4 Player

```js
new YT.Player('yt', {
  playerVars: {
    listType: 'playlist',
    list: 'PLNQk18YUccs2R8_aqb6EgEDA5e-uACqWm',
    controls: 0,
    rel: 0,
    playsinline: 1,
    origin: location.origin,
  },
});
```

- Controls: `nextVideo()`, `previousVideo()`, `playVideoAt(i)`, `setShuffle(true)`,
  `setLoop(true)`.
- Current position: `getPlaylistIndex()`; full ID list: `getPlaylist()`.
- Poll `getCurrentTime()` / `getDuration()` on a 250ms interval — not rAF. The LCD needs
  second-level precision and rAF wastes battery.
- Advance is automatic within a playlist. Still listen for `ENDED` to drive the
  phantom-thumb tap animation (§8.1).

**Do not set `modestbranding`.** YouTube deprecated it; it does nothing now.

**Player visibility:** YouTube's Terms of Service require the player be visible and
unobscured. Do not `display: none` it. Mount it as a small visible element — a
recommended treatment is a ~96×54 "video out" thumbnail tucked into the desk scene
beside the phone, styled to look like part of the composition. Discuss before shipping
any variant that hides it.

### 7.5 Errors

Handle `onError` properly; a dead player looks like a broken site.

| Code | Meaning | Response |
|---|---|---|
| `101` / `150` | Embedding disabled by the owner | `nextVideo()`, log the ID for the labels map |
| `100` | Video removed or private | `nextVideo()`, log |
| `153` | **Missing HTTP `Referer` header** | Not skippable — see below |
| `2` | Bad parameter | Fail loudly in dev |

Error 153 is the one that will burn you in production. YouTube's ToS require embedders
to send a `Referer`, and playback is blocked without one. It appears when testing over
`file://`, and — critically — if the site sets a strict referrer policy. **Do not set
`Referrer-Policy: no-referrer` or `same-origin`.** Use `strict-origin-when-cross-origin`.
This will work in dev and fail on the deployed site if you get it wrong.

Guard against skip loops: if three consecutive videos error, stop and show
`No files received` on the LCD with a retry soft key.

### 7.6 Rules

- **PREV within the first 3 seconds** goes to the previous track. **After 3 seconds** it
  restarts the current track (`seekTo(0)`). This is the behaviour every music player
  has and users feel it without being told. `previousVideo()` does not do this — you
  must branch on `getCurrentTime()` yourself.
- Wrap at both ends. `setLoop(true)` handles the forward edge; PREV at index 0 needs
  `playVideoAt(getPlaylist().length - 1)` manually.
- Shuffle is `setShuffle(true)`, not a locally shuffled index array. PREV still works
  correctly through it.
- Digit keys map to `playVideoAt(n - 1)`.

### 7.7 What we do not store

No audio files, ever. No mirrored track list. No ordering. If a change would put song
order or video IDs into this repo, it is going the wrong direction — the playlist owns
that.

---

## 8. Animation — the tap

This is the explicitly requested feature. Two triggers, one system.

### 8.1 Triggers

| Trigger | Behaviour |
|---|---|
| User clicks/taps a key | the pressed key animates |
| User presses `→` / `←` / `Space` | the *corresponding on-screen key* animates, so the phone mirrors the keyboard |
| **Track ends naturally and auto-advances** | the NEXT key **animates itself as if tapped by an invisible thumb** |

That last one is the point: the phone should look like it's being operated even when
nobody is touching it.

### 8.2 The key-press animation (~180ms)

Composite three layers, all on `transform` and `opacity` only:

1. **Depress** — key travels `translateY(2px) scale(0.97)`, its highlight gradient
   inverts to an inset shadow. `cubic-bezier(0.2, 0, 0, 1)`, 90ms down, 90ms back.
2. **Ripple** — a radial highlight expands from the contact point and fades, clipped to
   the key's border radius.
3. **Direction pulse** — a chevron ghost (`›` for next, `‹` for prev) fades in over the
   key, drifts 6px in the direction of travel, and fades out.

For the auto-advance case, add a fourth layer before the depress: a soft circular
"thumb" shadow (24px, blurred, 18% black) that scales in over the NEXT key 80ms
before the depress and out 120ms after. It reads as a phantom fingertip. Never show it
for a real user tap — the user's own finger is already there.

### 8.3 The LCD transition (~220ms, runs concurrently)

The screen content is the second half of the effect:

- **Next**: current title/artist/time block slides out to the left and the new block
  slides in from the right. Both clipped to the LCD.
- **Previous**: mirrored, right-to-left.
- Overlay a one-frame **LCD refresh flicker**: the whole panel drops to ~70% opacity
  with a 2px horizontal tear line sweeping down, for 60ms. Cheap, and it sells the
  monochrome panel more than any other single detail.
- Progress bar snaps to zero instantly, does not animate back.
- Title marquee resets and re-arms its 1s pause.

Motion tokens, defined once in CSS custom properties and reused:

```css
--tap-dur: 180ms;
--wipe-dur: 220ms;
--ease-key: cubic-bezier(0.2, 0, 0, 1);
--ease-wipe: cubic-bezier(0.4, 0, 0.2, 1);
```

### 8.4 Rapid input

Mash-proof. If NEXT is pressed mid-transition, cancel the running wipe and start the
next one from the current position. Track index changes immediately on input; the
animation never gates the state change. Debounce the YouTube `loadVideoById` call by
250ms so holding NEXT doesn't fire ten network requests — the LCD updates instantly,
the audio catches up.

### 8.5 Sound

Three short samples, all under 40kb, preloaded, muted until first gesture:

- `key.mp3` — the keypad click, on every key press
- `select.mp3` — the Nokia menu confirm blip, on OPTIONS actions
- `connect.mp3` — the two-tone Bluetooth pairing chirp, on the boot sequence and share

Global mute toggle, state in `localStorage`. Default **on** for the key click (it is
half the nostalgia) but keep it quiet, around -18dB relative to the music.

### 8.6 Reduced motion

Under `prefers-reduced-motion: reduce`: no wipe, no ripple, no phantom thumb, no
flicker. Keep only an instant content swap and a 1-frame key colour change so feedback
still exists. The boot sequence collapses to its final frame.

---

## 9. Share mechanic — "Send via Bluetooth"

From the OPTIONS menu. Picking it runs a transfer animation on the LCD using the
current track's `filename`, ending in `Sent to 1 device`, then copies a deep link to
the clipboard:

```
https://bluetooth.wtf/?i=7
```

`?i=` is the playlist index. On boot, read it once, call `playVideoAt(i)`, then remove
it with `history.replaceState`. Clamp to the playlist length — indices shift when songs
are added, so a stale link should land on track 0 rather than break.

OG tags must render a good card: the desk photo cropped to the phone, title
`Songs your friend Bluetoothed you in class`, and the site name. Test the card in the
X and WhatsApp preview tools before launch — WhatsApp is where this actually spreads.

---

## 10. Tech

| Layer | Choice |
|---|---|
| Build | **None.** Plain HTML/CSS/JS, ES modules, served static. |
| Hosting | Cloudflare Pages or Vercel, custom domain |
| Player | YouTube IFrame Player API |
| Fonts | LCD: `VT323`; UI labels: `Silkscreen`; body/meta: `Inter` — all self-hosted as woff2, no Google Fonts CDN call |
| Images | `scene.jpg` at 1600w and 2400w, AVIF + WebP + JPEG fallback, `<picture>` |

Rationale for no build step: this is one page with three scripts. A bundler adds a
minute of tooling per change and buys nothing. If the track list ever needs a CMS,
revisit then.

### File layout

```
index.html
public/
  scene.jpg          scene@2x.avif  ...
  og.jpg
  sfx/key.mp3  sfx/select.mp3  sfx/connect.mp3
  fonts/
src/
  labels.js          video ID -> display title/artist. The only track data we store.
  player.js          YouTube playlist wrapper, state machine, prev/next rules
  phone.js           key bindings, press animation, phantom-thumb driver
  lcd.js             screen rendering, marquee, wipe transitions, boot sequence
  menu.js            OPTIONS menu, share
  main.js            wiring
styles/
  base.css  phone.css  lcd.css  motion.css
scripts/
  audit-playlist.mjs   one-off embeddability check, run before launch and after edits
```

`scripts/` is dev tooling only and is never shipped or bundled into the page.

---

## 11. Responsive

| Breakpoint | Treatment |
|---|---|
| ≥1024px | Full desk scene, phone at ~420px tall, centred slightly right of centre |
| 640–1023px | Scene blurs more, phone scales to 60vh |
| <640px | Backdrop darkened to ~35% brightness, phone fills 80vh, keys enlarged to ≥44px hit targets, LCD scaled up |

Portrait mobile is the primary case. Build it first.

---

## 12. Accessibility

- Every interactive key is a real `<button>` with an `aria-label` (`Next track`, not `Right soft key`).
- Visible focus ring on the phone body, styled as a warm amber glow rather than the default outline.
- An `aria-live="polite"` region announces `Now playing: {title} by {artist}` on change.
- The LCD is decorative to screen readers (`aria-hidden`), with the live region carrying the real information.
- Contrast on all non-LCD text meets 4.5:1. The LCD itself is intentionally period-accurate and is mirrored by the live region.

---

## 13. Definition of done for v1

- [ ] Boot sequence runs, is skippable, and unlocks audio on the same gesture
- [ ] `audit-playlist.mjs` run; every video reports `embeddable: true`
- [ ] `labels.js` covers every video ID in the playlist
- [ ] Unmapped-video fallback verified by adding a song and not updating labels
- [ ] Deployed site sends a `Referer` (no error 153)
- [ ] NEXT / PREV animate on click, on keyboard, and on natural track end
- [ ] Phantom-thumb tap fires **only** on auto-advance
- [ ] Rapid NEXT presses never desync the LCD from the audio
- [ ] Embed-blocked video auto-skips; three consecutive errors show the retry state
- [ ] Works on iOS Safari, including first-play audio unlock
- [ ] `prefers-reduced-motion` path verified
- [ ] Lighthouse performance ≥ 90 on mobile
- [ ] OG card renders correctly in WhatsApp and X
- [ ] Share deep link boots to the right track

---

## 14. Open questions

1. Which Nokia? The photo reads as a 1208/1616-class bar phone. The 5233 was the
   Bluetooth-sharing workhorse but it's a touchscreen and kills the keypad interaction.
   **Recommendation: keep the bar phone, name it 5233 in the pairing dialog anyway.**
   Nobody will check, and the name carries more nostalgia than the shape.
2. Do we credit the CD-case artists on an About screen, or leave the scene as pure
   set dressing?
3. Counter: "N files received today" as a real pageview counter, or skip it?
4. If the audit comes back mostly art tracks, do we accept a smaller playlist of
   verified-embeddable music videos, or keep the YT Music list and accept skips?

---

## 15. Atmosphere

Everything in this section is **after the core loop works**. None of it is load-bearing.
Read §16 before starting any of it.

### 15.1 Backlight timeout

The highest-value item here and the cheapest. After 12 seconds with no input, the LCD
dims to unlit: text still faintly legible against a dead grey-green (`#8a9660` panel,
`#4a5233` text), glow removed, scanlines slightly stronger. Any keypress, pointer move
over the phone, or track change restores it over 120ms.

This is the difference between a UI and an object sitting on a desk. One timer, two
classes. Do not skip it because it sounds minor.

Under `prefers-reduced-motion`, dim instantly rather than fading.

### 15.2 The device list

`Send via Bluetooth` currently goes straight to a transfer. Put a scan in front of it:
`Searching for devices...`, then a selectable Nokia list. This is the most
screenshot-able screen on the site and the only place worth spending real copywriting
effort. Suggested set — get these right, they will get quoted back at you:

```
NOKIA-5233
Rahul ka phone
DONT PAIR
iPhone
Bittu Bhai
HACKER
Nokia N-Series
Papa ka phone
```

Selecting any of them runs the transfer animation and copies the share link. Selecting
`DONT PAIR` shows `Pairing failed` and returns to the menu. That joke is worth the
twenty lines it costs.

### 15.3 Wear

Two CSS-only details that make the phone read as used rather than rendered:

- The printed letters on the **2, 5, and 6 keys are faded** — the T9 keys that got hit
  ten thousand times. Drop their sub-label opacity to ~0.35.
- A **subtle sheen on the lower half of the D-pad** where a thumb sat: a small
  off-centre radial highlight at ~8% white.
- One **trapped air bubble** in a corner of the screen guard: a 6px ellipse with a faint
  bright rim and a soft shadow, at ~12% opacity. Nobody will consciously notice it.

### 15.4 Ambient layer

The music comes from a cross-origin YouTube iframe and **cannot be processed** — no EQ,
no filtering, no Web Audio access of any kind. That boundary is fixed.

What you can do is mix your own audio *alongside* it. Foley you host yourself is a
normal `<audio>` element with full Web Audio control:

| Layer | Treatment |
|---|---|
| Ceiling fan | continuous loop, the bed everything else sits on |
| Distant classroom / corridor murmur | continuous, very low |
| TV in another room | occasional, muffled |
| Autorickshaw horn | one every ~40s, randomised, never on a timer the ear can predict |

Mixed through a single gain node at roughly **-24dB** relative to the music. If a listener
can identify the individual sounds, it is too loud. The goal is that people report the
site "sounds like 2010" and cannot say why.

Rules:
- Source CC0 from Freesound so there is no licensing tail. Record the source URLs in
  `public/sfx/CREDITS.md` even though CC0 does not require attribution.
- Starts on the same user gesture that unlocks the YouTube player. Two separate audio
  contexts unlocked by one tap; do not add a second gate.
- Pauses and resumes with the music. Ambience playing over a paused player is worse
  than no ambience.
- Obeys the existing global mute toggle, with its own sub-toggle in OPTIONS
  (`Room sound: On / Off`) since some people will want the music clean.
- Total budget: **under 400kb** for all loops combined. Mono, 96kbps, 20–30s loops with
  matched endpoints. This is background texture, not content.

### 15.5 Ceiling fan shadow

A slow blade shadow rotating across the desk backdrop, ~3s period, **under 8% opacity**.
Pure CSS `rotate` on a masked element, compositor-only. Gives the still scene a pulse.

Above 8% it competes with the LCD for attention and the whole composition falls apart.
Disabled entirely under reduced motion.

### 15.6 Time-of-day window

The scene's window light tracks the visitor's local clock: harsh white at noon, gold
around 6pm, tube-light blue with a dark window after 9pm. A `hue-rotate` +
`brightness` + `saturate` filter on the backdrop plus a warm/cool overlay at low
opacity. Four states, interpolated on load only — do not animate it live.

Ambient, no interaction, and it means the site looks different depending on when the
link reaches someone. Read the clock client-side; no geolocation.

### 15.7 Later

- **Monsoon mode** — rain on the window, cooled backdrop, implied desk lamp. Doubles the
  screenshot output for one CSS layer and a small particle canvas. It is the first item
  here that is genuinely a *feature*, so it waits.
- **`N devices nearby`** — a live presence count in the corner, styled as a Bluetooth
  scan result rather than an analytics widget. Better framing than the plain "online"
  counter the reference site uses. **This needs a backend** — Cloudflare Durable Objects
  or a hosted presence service — which breaks the zero-backend rule in §10. Decide
  whether the feature is worth that before building it, not during.
- **T9 message composer** — excellent nostalgia, and a whole second product. Note it,
  don't start it.

### 15.8 Explicitly not doing

- **Snake.** Every Nokia nostalgia project ships Snake. It is the default of this genre.
  Two days of work to earn "oh, Snake" instead of "wait, `DONT PAIR`, that's so real."
- **Battery draining to a low-battery beep.** Charming for three seconds, then it is a
  thing interrupting the music. Static battery icon.
- **Fake incoming call interrupting playback.** Same problem. Anything that stops the
  song to be clever is a bug wearing a costume.

---

## 16. Build order

The core loop is: **playlist loads → audio plays → NEXT and PREV work with the tap
animation → LCD shows a clean title.** Nothing else matters until that is solid.

Suggested order for a first session:

1. `audit-playlist.mjs` — run it before writing any code. If the playlist is private or
   full of blocked art tracks, everything downstream changes.
2. `player.js` — YouTube playlist wrapper, prev/next rules, error handling. Verify with
   plain `<button>` elements and `console.log`. **No styling yet.**
3. `lcd.js` — panel, title, artist, time, progress. Static, no transitions.
4. `phone.js` — the CSS phone and key bindings, wired to the working player.
5. The tap animation (§8) — key depress, ripple, LCD wipe, phantom thumb.
6. The boot sequence (§5).
7. OPTIONS menu and share (§6.3, §9).
8. Anything in §15.

Two things people get wrong under time pressure: starting with the boot sequence
because it is the fun part, and styling the phone before the player works. Both cost the
whole session. The boot sequence is step 6 for a reason — it is also the audio unlock
gesture, so it can only be tested properly once audio plays.

If you have to stop early, stop after step 5. Steps 1–5 are a shippable site. Steps 1–4
are a demo.

---
