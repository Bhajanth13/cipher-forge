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
js/scroll3d.js      the 3D rotor drum and section transitions
js/fx.js            light/dark switch, 3D letter field, decoding headings, tilt
js/tour.js          presentation mode
js/app.js           steps 1, 2, 3, 5 and 7 on the page
js/lab2.js          brackets, relations and break-it on the page
```

Plain HTML, CSS and JavaScript, with no libraries or build step.

## Run it

Open `index.html` in any modern browser. It works offline.

## Author

Bhajanth V, B.Tech CSE (Section A), RV University, Mysuru.

Fonts: Archivo and IBM Plex Mono, under the SIL Open Font License (see `fonts/`).
