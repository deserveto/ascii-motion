# ASCII Motion

A reusable Codex skill for creating animated ASCII artwork from images, text, or procedural scenes. It animates the underlying scene and redraws it on a fixed character grid, so contours and shading evolve while the characters stay aligned.

The skill includes a self-contained HTML starter, a Node.js generator, and guides for designing the renderer and subject-specific motion. Generated starter files work offline after creation.

## Requirements

- Codex with support for local skills.
- Node.js **18.3 or newer** to use the included generator. No npm packages are required.
- A modern browser to view the generated HTML.
- Git and access to this private repository to clone it.

## Install for Codex

Clone the repository into your personal Codex skills directory. The repository root is the skill directory, so `SKILL.md` must end up directly inside `ascii-motion`.

**macOS / Linux**

```sh
mkdir -p ~/.codex/skills
git clone https://github.com/deserveto/ascii-motion.git ~/.codex/skills/ascii-motion
```

**Windows PowerShell**

```powershell
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
git clone https://github.com/deserveto/ascii-motion.git "$HOME\.codex\skills\ascii-motion"
```

If that destination already exists, keep a backup and update or replace it deliberately; Git will not clone into a nonempty directory. Restart Codex or start a new session if the skill does not appear immediately. Authentication must have access to this private repository.

## Use with Codex

Mention the skill explicitly in a request, and provide the source image or text when relevant. For example:

> Use $ascii-motion to animate this flower image as a gentle breeze moves through its petals. Make a standalone HTML file.

> Use $ascii-motion to turn this ASCII knight into a subtle breathing animation. Preserve its silhouette and keep the grid fixed.

> Use $ascii-motion to make an animated procedural jellyfish with a blue palette. Respect reduced motion.

Specify the subject, motion, colors, framing, output format, and any constraints that matter to you. The skill can use an existing compatible renderer in a project, create standalone HTML, or construct a procedural scene. The default presentation is artwork only, without visible controls unless requested. Regenerating a text source may change its literal characters; explicitly request literal-character preservation if needed.

## Generate a starter directly

From the repository directory, run:

```sh
node scripts/create_ascii.cjs --input examples/flower.txt --output artwork.html --columns 160 --title "Swaying flower"
```

Open `artwork.html` in a browser. It embeds the source and renderer, so it needs no server or network connection. The included generic movement is a bottom-anchored breathing sway: it is a starting point, not a subject-specific finished animation. Edit the generated `scene(time)` function or ask Codex to adapt it to the subject.

For an image, substitute a local image path:

```sh
node scripts/create_ascii.cjs --input photo.png --output artwork.html --columns 180
```

Supported inputs are PNG, JPEG, WebP, GIF (first decoded frame), BMP, and printable ASCII `.txt` files. Image colors are retained. Text is sampled into a new character field, so the output need not preserve the original glyphs. The browser must support decoding the chosen image format.

### Generator options

| Option | Purpose |
| --- | --- |
| `--input PATH` | Source image or ASCII text file; required. |
| `--output PATH` | Destination `.html` file; required. |
| `--columns N` | Grid width from 16 to 320; default 160. |
| `--crop x,y,w,h` | Crop an image in original pixels; not valid for text. |
| `--color "#RRGGBB"` | Text-source tint; default `#dfcbb0`. Quote the color in a shell. |
| `--invert` | Interpret dense text characters as dark ink; text only. |
| `--title TEXT` | Document title and accessible artwork label; default `Living ASCII`. |
| `--force` | Replace an existing output file. Without it, existing output is protected. |
| `--help` | Show the command-line help. |

Example with text tint and inverted density:

```sh
node scripts/create_ascii.cjs --input examples/flower.txt --output flower.html --color "#80cfff" --invert
```

## How it works

1. The source image, text, or procedural geometry defines brightness and color.
2. A time-dependent motion field moves or deforms the subject.
3. Each fixed grid cell samples the scene and selects a glyph and color.
4. Cached character masks are drawn to a canvas, with glow derived from the character layer.

The starter respects the browser's reduced-motion preference by displaying a complete resting pose. For more detail on sampling, buffers, glyphs, and glow, see [the engine guide](references/engine.md). For anchors, deformation, entrances, and motion checks, see [the motion guide](references/motion.md).

## Files

```text
SKILL.md                    Skill instructions
agents/openai.yaml          Codex skill metadata
assets/ascii-runtime.js     Browser renderer embedded by the generator
scripts/create_ascii.cjs    Standalone HTML generator
references/engine.md        Fixed-grid rendering guide
references/motion.md        Subject-driven motion guide
examples/flower.txt         Small sample input
```

## Troubleshooting

- **Skill not found:** Check that `~/.codex/skills/ascii-motion/SKILL.md` exists, then start a new Codex session.
- **`node` not found or too old:** Install Node.js 18.3 or newer and reopen the terminal.
- **Output already exists:** Choose a new filename or use `--force` to replace it.
- **Image fails to load:** Check the source file and browser support for its format; regenerate after correcting the source.
- **Animation does not move:** Check your operating system or browser reduced-motion setting; the starter intentionally shows a resting pose when reduced motion is enabled.
- **Motion looks generic:** Adapt `scene(time)` to the subject's anchors and moving regions using the motion guide.

## Updating the skill

If installed as a Git clone, run `git -C ~/.codex/skills/ascii-motion pull` to update it. Review or commit local changes first. On Windows PowerShell, use `git -C "$HOME\.codex\skills\ascii-motion" pull`.
