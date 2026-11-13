---
name: ascii-motion
description: Use when creating or refining animated ASCII artwork, image-to-ASCII motion, or procedural character-grid scenes with changing contours and shading, including styles like GIVEAWAY-ASCII lily_bouquet and knight.
---

# ASCII Motion

Build living ASCII scenes by sampling moving geometry or imagery onto a stationary character grid. Derive each cell's glyph and color from the sampled scene every frame.

## Match the request

Inspect supplied images, text, existing code, and animation references before selecting the scene model. Preserve the subject, framing, requested palette, and chosen delivery format. Ask only when a missing source, movement, or delivery requirement materially changes the result.

Default to an artwork-only presentation. Add visible buttons, toolbars, labels, instructions, or other interface elements only when the user explicitly requests them. Honor reduced-motion preferences with a complete resting pose.

For this rendering style, animate the underlying scene field and regenerate its characters. Keep glyph origins upright and aligned to their cells. When a user requests literal-character preservation or a different animation style, follow that requirement and explain the resulting tradeoff.

## Build

- Read [the engine guide](references/engine.md) when implementing or modifying the renderer. It explains image resampling, procedural fields, glyph selection, masks, and character-derived glow.
- Read [the motion guide](references/motion.md) when designing the subject's movement. Choose meaningful anchors and deformation weights before writing the motion field.
- Reuse an existing compatible renderer in the project. For a standalone image or text starting point, run the bundled Node.js helper. It uses standard libraries and embeds the source and runtime into one offline HTML file.

```sh
node <skill-dir>/scripts/create_ascii.cjs --input <source.png> --output <artwork.html> --columns 180
```

Run `node <skill-dir>/scripts/create_ascii.cjs --help` for supported inputs and options. Here `<skill-dir>` is this skill's absolute directory. The output's `scene(time)` function owns the motion. Adapt it to the actual subject. The starter uses a bottom-anchored breathing sway, which suits an upright subject.

The helper accepts images and `.txt` artwork. Image colors are retained. Plain-text density polarity is explicit through `--invert`, and its tint is adjustable. Use a supplied image for detailed shading when available. State when regenerating a text source into a different character field changes its literal characters.

For a procedural subject, write its geometry directly into the same luminance/color buffers using the engine guide. Keep subject-specific geometry separate from glyph rasterization. Standalone HTML is a sensible default when no delivery format is specified. Integrate with the user's existing app when that is the requested target.

## Verify the result

Exercise the generated artwork, including its ordinary entry point. Check that movement changes cell occupancy and glyph selection while the grid stays aligned. Inspect recognizable contours, tonal range, silhouette edges, and glow placement at useful display sizes. Verify artwork-only presentation, source-load errors, resize, and reduced-motion behavior. Exercise interactive controls when the user has requested them.

Use deterministic frame stepping for motion invariants. Measure actual rendered frames on the relevant device scale and viewport separately from animation-callback frequency. Report the measured conditions with any performance claim. If browser inspection is unavailable, state which runtime or visual checks remain unverified.

Return the usable artwork and a short description of its movement. Keep this skill's starter defaults, the example subjects, and any one reference's colors or timings subordinate to the current user's request.
