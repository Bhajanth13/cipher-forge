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
| 6. Send it by sound | Encrypt, turn the ciphertext into tones, play it; another device listens, decodes and decrypts with the shared key | Composition of bijections and its inverse, base 16, product rule (16 × 16 = 256), checksum mod 256 |
| 7. Break it | Brute-force all shifts on a 3D drum; frequency analysis | Multisets, counting, pigeonhole |
| 8. Count the keys | Key counts and brute-force time | Sum and product rules, n!, P(n, r), nʳ, C(n, r), combinations with repetition |

Extras: a light/dark switch, and a **Present** button (or press `P`) for a guided walkthrough during the viva. Use the arrow keys to move and `Esc` to finish.

## Code structure

Each JavaScript file matches a part of the syllabus:

```
index.html          page structure
css/style.css       design and 3D effects
css/fonts.css       self-hosted fonts (works offline)
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
js/lab3.js          send-by-sound on the page
```

Plain HTML, CSS and JavaScript, with no libraries or build step.

## Sending a message by sound

1. Open the site on two devices (the GitHub Pages link, so the microphone is allowed).
2. On the sender, build a cipher and press **Copy key**. Give the key to the receiver separately; it is never sent with the message.
3. On the receiver, paste the key, press **Use this key**, choose **Microphone** and press **Start listening**.
4. On the sender, type a message and press **Encrypt and send as sound**. Keep the devices close and the volume up.

With one device, choose **This device, no microphone** on the receiver: the page decodes its own tones directly.

How it works: `send = tones ∘ hex ∘ code ∘ F`. Each character code (0–255) is split into two base-16 digits, and each digit gets its own tone (16 tones from 1800 Hz to 4050 Hz). A digit equal to the one before is sent as a special repeat tone, so neighbouring tones always differ. Start and end tones mark the message, and a checksum (sum of the codes mod 256) shows whether anything was misheard. The receiver applies the inverses in reverse order.

## Run it

Open `index.html` in any modern browser. It works offline.

## Author

Bhajanth V, B.Tech CSE (Section A), RV University, Mysuru.

Fonts: Archivo and IBM Plex Mono, under the SIL Open Font License (see `fonts/`).
