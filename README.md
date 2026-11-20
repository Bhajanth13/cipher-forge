# Cipher Forge

An interactive web lab for **CS1812 Discrete Mathematics and Set Theory** (CIE-3B project), RV University, Mysuru.

You build a cipher out of small blocks, and the app uses discrete maths to check it: can it be decrypted, where does it break, and how many keys would an attacker have to try?

**Live site:** https://bhajanth13.github.io/cipher-forge/

## What it does

| Section | What you do | Maths used |
|---|---|---|
| Choose the symbols | Pick the symbol set S, try set operations | Sets, roster and set-builder notation, cardinality, ∪ ∩ − Δ, Cartesian product, binomial theorem (2ⁿ subsets) |
| Build a cipher | Chain Shift, Multiply, Mirror, Keyword, Swap and Compress blocks | Functions, composition g ∘ f |
| Check that it can be undone | Arrow diagram, one-to-one / onto / pigeonhole checks, truth table | Injective, surjective, bijective; predicate logic (∀, ∃); propositions V ⇔ I ∧ O; pigeonhole principle |
| Encrypt, then undo it | Encrypt a message and decrypt it with a step-by-step trace | Inverse functions, (g ∘ f)⁻¹ = f⁻¹ ∘ g⁻¹ |
| Count the keys | Key counts and brute-force time | Sum and product rules, n!, P(n, r), nʳ, C(n, r), combinations with repetition |

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
js/scroll3d.js      the 3D rotor drum and scroll effects
js/app.js           connects the maths to the page
```

Plain HTML, CSS and JavaScript, with no libraries or build step.

## Run it

Open `index.html` in any modern browser. It works offline.

## Author

Bhajanth V, B.Tech CSE (Section A), RV University, Mysuru.

Fonts: Archivo and IBM Plex Mono, under the SIL Open Font License (see `fonts/`).
