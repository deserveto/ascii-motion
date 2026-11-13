# Subject-driven motion

## Pick anchors and moving regions

Identify the subject's fixed attachment, main mass, joints, and flexible extremities. Use smooth spatial weights that rise from near zero at an anchor to the intended amplitude at a free end. Evaluate the motion at the scene's coordinates before converting to characters.

An upright plant can share a slow stem bend with delayed leaf and petal motion. An arm can remain stable near its outer forearm while its wrist and fingertips move more. Cloth can carry a traveling wave and changing apparent width. A rigid object should retain its shape while its pose changes.

For opposed hands, assign each hand its own source layer or sampling region and inverse transform. Move them inward from their respective edges, then blend into a low-amplitude articulated idle. Layer boundaries should follow the source. A center split works only when it cleanly separates both subjects. Keep source sampling inside its assigned layer as it enters.

## Coherent fields

For an anchor-to-tip coordinate `u`, an example bend is

```js
const weight = u * u;
const wave = Math.sin(phase - u * lag);
const displacement = amplitude * weight * wave;
```

Use a shared phase for connected parts, with limited spatial lag. One quieter secondary harmonic can add variation. Estimate local slope or normal from the deformed geometry when directional glyphs or lighting should respond to orientation. Bilinear sampling turns fractional source movement into coherent changes in the resulting character field.

Use amplitude, phase, and weights appropriate to the material. Skin, metal, cloth, and foliage have different motion. Derive the design from the user's references and inspect the result in motion.

## Entrances and settling

Ease an entrance's position and blend its motion amplitude smoothly. Quintic smoothstep `t³(6t² - 15t + 10)` has zero velocity and acceleration at both ends. Match the final entrance pose to the initial idle pose, including deformation and timing. A small stagger can help two subjects feel independent when appropriate to the composition.

For an exact seamless loop, use harmonics whose periods divide the full loop period. Compare both geometry and lighting at the seam. An ordinary one-time entrance followed by a periodic idle does not require the entrance itself to loop.

## Assess the result

Inspect at least one entrance frame and several idle phases. The outline should remain identifiable, attachment points should stay plausible, and changing glyphs should track moving coverage and shading. Check silhouette edges for clipping and split-layer seams. Compare the requested reference's grid density, motion scale, and temporal character texture as separate choices.

The reusable starter defaults to gentle bottom-anchored sway. Choose a new motion field when the subject has different attachment or articulation. A shared sinusoidal displacement is useful for a first preview, while the final motion should express the chosen subject.
