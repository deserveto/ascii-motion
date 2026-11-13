# Fixed-grid ASCII engine

## Rendering model

Separate the scene's continuous brightness/color field from its character rasterization. The field moves. A grid cell remains at `(column * cellWidth, row * cellHeight)` and receives a newly evaluated glyph and color.

For image-backed scenes, inverse-map an output cell through the motion field into the source image, bilinearly interpolate the neighboring samples, and derive luminance from the interpolated RGB. Interpolate before brightness quantization. This allows contours, highlights, and occupied cells to evolve together through fractional-cell movement.

For procedural scenes, evaluate geometry directly at cell centers. Curves with variable half-widths can describe stems, petals, cloth, or limbs. For each nearby cell, find its closest curve segment and normalized signed distance across its width. Use distance, tangent, depth, and normal to calculate coverage, shading, and any orientation-specific glyph. Restrict expensive evaluation to the geometry's expanded bounds.

## Glyphs and color

Use increasing-density buckets, for example `space`, `.`, `:;`, `-=`, `+*`, `%#`, `@&`, with brightness thresholds between them. Tune the mapping against the actual image. A bright, dense glyph on a dark background represents a highlight. Dense printed characters in a supplied text file may instead encode dark ink, which requires inverted source-density interpretation.

Keep a deterministic per-cell seed for selecting equivalent glyphs within a bucket. The brightness changes as the shape moves, so glyphs change naturally. A time-dependent hash is an optional stylistic shimmer. Choose its cadence deliberately when the user requests that effect.

Preserve straight alpha while decoding and multiply RGB by coverage before filtering a transparent source against a dark background. Preserve physical aspect ratio using both glyph width and height. Cropping and background changes are artistic decisions to derive from the source and request.

The starter's `scene(time)` owns its deformation. Its buffers are

```js
luminance[row * columns + column] // brightness, usually 0..1
rgb[(row * columns + column) * 3 + channel] // RGB, usually 0..1
```

Clear luminance every frame. Colors in inactive cells need not be cleared if rendering skips zero-luminance cells. Clamp channels before packing pixels. Source-sampling coordinates outside the image produce empty cells.

## Rasterization and glow

Precompute each glyph's alpha mask once at the chosen font, cell dimensions, and pixel ratio. Keep the field buffers and output pixel buffer allocated across frames. Write one mask per occupied cell into the output image, tint it with that cell's RGB, then upload the completed image once.

The starter packs RGBA bytes through a `Uint32Array` on little-endian browser platforms. Use explicit channel writes or an endian-aware packer for other targets.

Create glow from the completed transparent character layer. Repeatedly downsample that layer, then composite its enlarged result with low additive opacity. This ties the glow to the characters. Inspect that dense highlights retain their shape and surrounding empty space remains quiet. Use the requested background and palette.

## Timing and integration

Drive motion from elapsed time with `requestAnimationFrame`. Frame-rate caps need an accumulator so high-refresh monitors do not produce an unintended divisor of their refresh rate. Measure uploads or completed render calls when reporting rendered FPS.

The starter presents the animated artwork alone. With reduced motion enabled, show a complete resting pose and stop time advancement and frame scheduling. Resume when the motion preference allows it. The starter clamps large elapsed gaps to avoid jumping after background throttling.

When the user explicitly requests playback controls, pause should stop the entire scene and replay should reset all motion state. Keep that interface scoped to the requested controls.

The bundled runtime uses embedded raster data URLs or text, browser-native decoding, and no remote requests. Its generic sway is a starting scene. Replace or extend `scene(time)` for articulated subjects, entrances, multiple independently moving layers, or procedural geometry. The rest of the renderer can remain shared.

Test with several timestamps after the entrance. Useful invariants include fixed glyph origins, one valid alpha mask per occupied cell, reproducible frames at equal scene time, changed occupancy/glyph IDs under motion, stable paused frames, and fully visible reduced-motion output. A changing frame hash alone cannot establish that the intended subject moved correctly.

## Reference lineage

The lily example evaluates curves and three-dimensional flower structure into luminance/color buffers. Its glyph choice includes a deliberately time-varying seed. Its renderer caches glyph masks, writes a pixel buffer, and derives glow by repeated downsampling. [Lily bouquet source](https://github.com/arimecoa/GIVEAWAY-ASCII/blob/main/lily_bouquet.html)

The knight example bilinearly samples its source luminance with breathing, sway, and a weighted cloak deformation. Its ordinary glyph seed is stable per grid cell. The procedural grass selects directional glyphs from blade slope, and the scarf uses luminance-driven weave glyphs. [Knight source](https://github.com/arimecoa/GIVEAWAY-ASCII/blob/main/knight.html)

These are reference techniques. Reinspect linked source when exact behavior matters. The bundled starter is self-contained and does not require those pages or embed their artwork.
