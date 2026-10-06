# Self-hosted hobby models

> Historical acquisition notes. All three models are now mounted on the formal site; see [CURRENT_SITE_HANDOFF.md](../../CURRENT_SITE_HANDOFF.md) for the current runtime and deployment state.

These are working glTF exports obtained through the official Sketchfab download flow. Each directory retains its original `license.txt`, `scene.gltf`, `scene.bin`, and any referenced textures. The unchanged source archives and SHA-256 records are kept separately in `D:/Github/获奖网页/try1重构规划/assets/source-models/`.

| Model | Credit required by the downloaded license | Current animation state |
| --- | --- | --- |
| [Balisong](https://sketchfab.com/3d-models/balisong-85f7e55c67974a3585eeed345fbbd972) | DUCK_ | `Take 01`, about 5.77 seconds; local rendering still to verify |
| [Game Of Death Nunchaku](https://sketchfab.com/3d-models/game-of-death-nunchaku-059e31451a464c1ea969b5b3a58c36b1) | B3M DESIGNER | Ten per-object tracks, about 45 seconds each; synchronization still to verify |
| [SM Yamaha String Acoustic Guitar Instrument](https://sketchfab.com/3d-models/sm-yamaha-string-acoustic-guitar-instrument-38d4be70e4054a15afd77946b1b3211a) | effiebop | No usable plucking action; all strings share one mesh and require a custom rig |

All three exports are marked CC BY 4.0. Preserve the credit and source link when displaying a model publicly. The Balisong page displays `ABSTRACT_DUCK`, while its downloaded license specifies `DUCK_`; use the latter for attribution.

The homepage does not load these files yet. `hobby-lab.html` uses them in an independent Three.js playback and interaction preview; visual, touch, and reduced-motion checks are still pending before homepage integration. The original `.blend`/`.fbx` packages are not included in the published site assets.

Run `node tools/check-model-assets.mjs` from the repository root to validate the index, licenses, and glTF dependencies without installing packages.
