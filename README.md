# Cipher Forge

An interactive web lab for **CS1812 Discrete Mathematics and Set Theory** (CIE-3B project), RV University, Mysuru.

You build a cipher out of small blocks, and the app uses discrete maths to check it: can it be decrypted, where does it break, and how many keys would an attacker have to try?

**Live site:** https://bhajanth13.github.io/cipher-forge/

## What it does

| Step | What you do | Maths used |
|---|---|---|
| 1. Choose the symbols | Pick the symbol set S, try set operations | Sets, roster and set-builder notation, cardinality, ∪ ∩ − Δ, binomial theorem (2ⁿ subsets) |
| 2. Build a cipher | Chain Shift, Multiply, Mirror, Keyword, Swap and Compress blocks; see every bracketing | Functions, composition g ∘ f, Catalan numbers |
| 3. Check that it can be undone | Arrow diagram, one-to-one / onto / pigeonhole checks, truth table | Injective, surjective, bijective; predicate logic (∀, ∃); V ⇔ I ∧ O; pigeonhole principle |
| 4. See the cipher as a relation | Relation matrix, equivalence classes, a two-letter cipher | Relations R ⊆ S × S, equivalence relations, Cartesian product |
| 5. Encrypt, then undo it | Encrypt a message and decrypt it with a step-by-step trace | Inverse functions, (g ∘ f)⁻¹ = f⁻¹ ∘ g⁻¹ |
| 6. Break it | Brute-force all shifts on a 3D drum; frequency analysis | Multisets, counting, pigeonhole |
| 7. Count the keys | Key counts and brute-force time | Sum and product rules, n!, P(n, r), nʳ, C(n, r), combinations with repetition |

Future enhancement: **send it by sound**, on its own page (`future.html`, the last item in the nav bar): a 3D signal tunnel, an exploded 3D view of the five layers a message passes through, and a live transmission console whose beam and core follow the real tones.

Extras: a light/dark switch, and a **Present** button (or press `P`) for a guided walkthrough during the viva. Use the arrow keys to move and `Esc` to finish.

## Code structure

Each JavaScript file matches a part of the syllabus:

```
index.html          the lab (steps 1 to 7)
future.html         future enhancement: send it by sound
receive.html        the phone receiver page
css/style.css       design and 3D effects
css/fonts.css       self-hosted fonts (works offline)
css/lab-fx.css      the lab's sci-fi look (shares the palette in future.css)
device.html         Future enhancement 02: Cipher Echo, a flagship acoustic cipher communicator concept (full-face touch e-paper, on-screen keyboard), taken apart in 3D
css/device.css      the Cipher Echo page: 3D slabs, exploded view, cross-section
js/device.js        builds the device, scroll-driven disassembly, cross-section, battery calculator
js/device-range.js  long-range acoustics from physics (ISO 9613-1 air absorption, spreading, gains): range map, noise-cancelling panels, live range calculator
js/device-bloom.js  far mode in 3D: the petal reflector blooms out of the top edge, with the feed pod at the focus and the sound paths
js/device-steps.js  two 7-step 3D walkthroughs: the message from sender to receiver, and the lab's 7 steps inside the unit
js/lab-fx.js        the lab's star field, decoding title, HUD and slow glide links
js/sets.js          Module 1: sets and set operations
js/functions.js     Module 3: one-to-one, onto, bijection, composition, inverse, pigeonhole
js/blocks.js        the cipher blocks and running a chain
js/counting.js      Modules 4 and 5: counting, permutations, combinations (BigInt)
js/relations.js     Modules 1, 3 and 5: relations, equivalence classes, S × S cipher, Catalan numbers
js/breaker.js       breaking ciphers: multisets, brute force, frequency analysis
js/sound.js         sending by sound: codes, base-16 digits, tones, checksum, tone detector
js/scroll3d.js      the 3D rotor drum and section transitions
js/fx.js            light/dark switch, 3D letter field, decoding headings, tilt
js/tour.js          presentation mode
js/app.js           steps 1, 2, 3, 5 and 7 on the page
js/lab2.js          brackets, relations and break-it on the page
js/lab3.js          send-by-sound on future.html
js/future.js        the cipher used on future.html (the last one built in the lab)
js/future-fx.js     future.html's 3D tunnel, waveform, exploded layers, beam, core and phone QR
js/receive.js       receive.html, the phone receiver
js/qr.js            QR code generator (Reed–Solomon over GF(2⁸)), no libraries
css/future.css      future.html's look (dark and light)
```

Plain HTML, CSS and JavaScript, with no libraries or build step.

## Future enhancement: sending a message by sound

The sender can choose **Audible** (1.4–4.65 kHz) or **Silent** near-ultrasound (16.9–18.9 kHz, above most people’s hearing; sent a little slower, with the start and end markers at the bottom of the band where speakers are strongest). The receiver watches both bands and locks onto whichever one a start tone arrives on.

**Phone receiver:** `receive.html` is a full-screen receiver for a second device. On the Future enhancements page, scan the QR code with a phone: it opens the receiver with the key already loaded (`receive.html?key=…`). Tap the circle, allow the microphone, then send.

If silent messages don’t arrive, press **Play a silent test tone** on the sender and watch the receiver’s **Silent** meter. If it stays quiet, that speaker or microphone can’t handle ultrasound, so use Audible.

1. Open the Future enhancements page on two devices (https://bhajanth13.github.io/cipher-forge/future.html, so the microphone is allowed).
2. On the sender, build a cipher in the lab (the page remembers it) and press **Copy key**. Give the key to the receiver separately; it is never sent with the message.
3. On the receiver, paste the key, press **Use this key**, choose **Microphone** and press **Start listening**.
4. On the sender, type a message and press **Encrypt and send as sound**. Keep the devices close and the volume up.

With one device, choose **This device, no microphone** on the receiver: the page decodes its own tones directly.

How it works: `send = tones ∘ hex ∘ code ∘ F`. Each character code (0–255) is split into two base-16 digits, and each digit gets its own tone (16 tones from 1800 Hz to 4050 Hz). Every tone lasts exactly 200 ms. A digit equal to the one before is sent as a special repeat tone, so neighbouring tones always differ. The receiver measures each tone with the Goertzel algorithm on every incoming sample, finds where the first data tone begins, and judges each 200 ms slot from its middle, where the echo of the previous tone has faded most. Start and end tones mark the message, and a checksum (sum of the codes mod 256) shows whether anything was misheard. The receiver applies the inverses in reverse order.

## Run it

Open `index.html` in any modern browser. It works offline.

## Author

Bhajanth V, B.Tech CSE (Section A), RV University, Mysuru.

Fonts: Archivo and IBM Plex Mono, under the SIL Open Font License (see `fonts/`).

## v2: the lab, presented live

`v2/` is the main live site. `v2/index.html` is the rotor-tunnel opening (a hidden button in the bottom-right corner, or →, plays it at medium speed and opens the presentation); `v2/lab.html` is the lab, which opens as a presenter deck; `v2/thanks.html` is the closing page with the team. The deck: Each section of the lab is one scene, and each scene has beats: Explain, Show, Test (ask the class, then reveal) and Build (the class chooses, you type it in). A presenter card says what to say and holds the buttons; the part being discussed is spotlit. New in v2:

- **Your own f(x)**: a block that takes any formula in x (numbers, x, n, + − ×, ^ with a whole-number power, brackets), worked out mod n with BigInt. It is read by a small parser, never by `eval`.
- **Clearer arrow diagram**: thicker arrows, a table of every input above its output, and “Walk the arrows” to follow one letter at a time.

Keys: → or Space next beat, ← back, 1–9 scenes, R reveal, N hide the card, F full screen, W website view. Files: `v2/css/deck.css`, `v2/js/deck.js`, with the custom block in `v2/js/blocks.js`.


## Team

Group G1: Bhajanth V (2RUA26CSE0022), K G Deepika (2RUA26CSE0053), Amulya G M (2RUA26CSE0012), Dibyanishant Sharma Sarker (2RUA26CSE0034), Madhushree M S (2RUA26CSE0063), Hruthvick B S (2RUA26CSE0045). Guide: Dr. Subhasish Saha.
