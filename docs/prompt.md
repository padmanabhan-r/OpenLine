# Seedance prompt — recolour the hero orb to OpenLine aqua

**Reference video:** `public/orb.mp4` (1920×1080, 3.03s, 30fps, seamless loop).
A soft rounded blob-sphere in red/vermilion, slowly morphing and rotating,
centred on a flat cream background.

**Goal:** the identical animation in the OpenLine aqua palette, on pure white so
it composites cleanly over the yellow hero.

---

## Prompt

```
Restyle this reference video. Preserve the source exactly: the same soft rounded
blob-sphere, the same slow morphing deformation, the same rippling folds and
creases, the same rotation, the same timing on every frame, the same size and
centred position in frame, the same glossy soft-body material with its wide
specular highlights and gentle subsurface glow. Do not add, remove, or move
anything. Nothing in the motion changes.

Change only the colour. The sphere becomes deep aqua-teal. Its base body colour
is #1E8F98. Mid-tones and the lit faces of the folds shift toward a soft
sea-green #63CBA8. The brightest specular highlights and the rim light are pale
mint #BFEDE4, nearly white at their hottest points. Shadowed areas and the
crevices between folds deepen to #14717A. The gradient runs smoothly from deep
teal in shadow to pale mint in the highlights, with the same soft airbrushed
falloff as the original — no banding, no flat fill, no posterisation.

The background is pure flat white #FFFFFF, completely uniform, with no tint, no
vignette, no gradient, and no shadow cast onto it. The sphere is fully isolated
against the white.

No red, orange, pink, warm cream, or yellow anywhere in the frame. No purple or
indigo. No text, no logos, no particles, no added lighting effects.

Style: clean minimal 3D product render, soft studio lighting, matte-to-glossy
soft-body material, high fidelity, 1920x1080, seamless loop, last frame matches
first frame.
```

---

## Why white and not cream

The hero composites the video with `mix-blend-mode: multiply` (`.hero-orb` in
`app/globals.css`). Under multiply, pure white disappears completely, so a
`#FFFFFF` background lets the orb float on the yellow with no visible rectangle
around it. The source's cream background is exactly why the current version
reads as a pasted-on panel.

If Seedance can return **WebM with alpha**, take that instead — then the blend
mode comes off entirely and the orb composites perfectly at full opacity.

## Palette

| Role | Hex | Token |
|---|---|---|
| Shadow, crevices | `#14717A` | `--accent-deep` |
| Body | `#1E8F98` | `--accent` |
| Lit folds | `#63CBA8` | — |
| Highlights, rim | `#BFEDE4` | near `--accent-soft` |
| Background | `#FFFFFF` | — |

## Dropping it in

Replace `public/orb.mp4` and it picks up automatically. Two things to check
afterwards:

- **Opacity** is `0.4` in `.hero-orb`, held down because the red fought the
  palette. Once it is aqua this can almost certainly go higher.
- **The loop.** If the last frame no longer matches the first, the loop will
  visibly jump. Fixable with a short cross-fade:
  `ffmpeg -i orb.mp4 -filter_complex "[0]split[a][b];[a]trim=0:2.7[a];[b]trim=2.7,setpts=PTS-STARTPTS[b];[a][b]xfade=fade:0.3:2.4" orb-loop.mp4`
